import crypto from "node:crypto";
import { ApiError } from "../../lib/errors";
import type {
  LilyPaymentProviderCreateInput,
  LilyPaymentProviderCreateResult
} from "./payment-provider";

const PIX_GUI = "br.gov.bcb.pix";

export type CookLilyPixConfiguration = {
  keyConfigured: boolean;
  merchantNameConfigured: boolean;
  merchantCityConfigured: boolean;
  ready: boolean;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function normalizeText(value: string, max: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8");
}

function field(id: string, value: string) {
  const length = byteLength(value);
  if (length > 99) {
    throw new ApiError(500, "Campo BR Code excede o limite permitido.", {
      code: "LILY_PIX_BR_CODE_FIELD_TOO_LONG",
      field: id
    });
  }
  return `${id}${String(length).padStart(2, "0")}${value}`;
}

export function pixCrc16(payloadWithoutCrc: string) {
  let crc = 0xffff;
  const bytes = Buffer.from(payloadWithoutCrc, "utf8");
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0
        ? ((crc << 1) ^ 0x1021) & 0xffff
        : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildStaticPixPayload(input: {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents?: number | null;
  txid?: string | null;
}) {
  const key = input.key.trim();
  if (!key || byteLength(key) > 77) {
    throw new ApiError(500, "Chave Pix inválida para BR Code estático.", {
      code: "LILY_PIX_KEY_INVALID"
    });
  }

  const merchantName = normalizeText(input.merchantName, 25);
  const merchantCity = normalizeText(input.merchantCity, 15);
  if (!merchantName || !merchantCity) {
    throw new ApiError(500, "Nome/cidade do recebedor Pix não configurados.", {
      code: "LILY_PIX_MERCHANT_INVALID"
    });
  }

  const txid = input.txid?.trim() || "***";
  if (txid !== "***" && !/^[A-Za-z0-9]{1,25}$/.test(txid)) {
    throw new ApiError(500, "txid Pix inválido.", { code: "LILY_PIX_TXID_INVALID" });
  }

  const merchantAccount = field("00", PIX_GUI) + field("01", key);
  const additional = field("05", txid);

  let payload = "";
  payload += field("00", "01");
  payload += field("26", merchantAccount);
  payload += field("52", "0000");
  payload += field("53", "986");

  if (input.amountCents !== undefined && input.amountCents !== null) {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > 999_999_999_999) {
      throw new ApiError(500, "Valor Pix inválido.", { code: "LILY_PIX_AMOUNT_INVALID" });
    }
    payload += field("54", (input.amountCents / 100).toFixed(2));
  }

  payload += field("58", "BR");
  payload += field("59", merchantName);
  payload += field("60", merchantCity);
  payload += field("62", additional);

  const crcInput = payload + "6304";
  return crcInput + pixCrc16(crcInput);
}

function txidForPayment(paymentId: string) {
  return `CL${crypto.createHash("sha256").update(paymentId).digest("hex").slice(0, 23)}`;
}

export function cookLilyPixConfiguration(): CookLilyPixConfiguration {
  const keyConfigured = Boolean(env("COOKLILY_PIX_KEY"));
  const merchantNameConfigured = Boolean(env("COOKLILY_PIX_MERCHANT_NAME"));
  const merchantCityConfigured = Boolean(env("COOKLILY_PIX_MERCHANT_CITY"));
  return {
    keyConfigured,
    merchantNameConfigured,
    merchantCityConfigured,
    ready: keyConfigured && merchantNameConfigured && merchantCityConfigured
  };
}

export async function createCookLilyPixPayment(
  input: LilyPaymentProviderCreateInput
): Promise<LilyPaymentProviderCreateResult> {
  if (input.method !== "pix") {
    throw new ApiError(400, "O Pix próprio CookLily aceita apenas Pix.", {
      code: "LILY_PAYMENT_METHOD_UNSUPPORTED"
    });
  }

  const configuration = cookLilyPixConfiguration();
  if (!configuration.ready) {
    throw new ApiError(503, "Pix próprio CookLily ainda não está configurado.", {
      code: "LILY_COOKLILY_PIX_NOT_CONFIGURED"
    });
  }

  const txid = txidForPayment(input.paymentId);
  const payload = buildStaticPixPayload({
    key: env("COOKLILY_PIX_KEY"),
    merchantName: env("COOKLILY_PIX_MERCHANT_NAME"),
    merchantCity: env("COOKLILY_PIX_MERCHANT_CITY"),
    amountCents: input.amountCents,
    txid
  });

  return {
    providerPaymentId: txid,
    providerReference: txid,
    status: "pending",
    paidCents: null,
    instructions: payload,
    expiresAt: null,
    providerData: {
      ticketUrl: null,
      qrCode: payload,
      qrCodeBase64: null,
      paymentMethodId: "pix",
      paymentMethodType: "static_br_code",
      installments: null
    }
  };
}
