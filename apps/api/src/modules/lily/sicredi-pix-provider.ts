import type { LilyOperationalSettings } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { buildStaticPixPayload, txidForPayment } from "./cooklily-pix-provider";
import { decryptLilySecret } from "./secret-crypto";
import type { LilyPaymentProviderCreateInput, LilyPaymentProviderCreateResult } from "./payment-provider";

export function sicrediPixConfiguration(settings: Pick<LilyOperationalSettings, "sicrediPixKeyEncrypted" | "sicrediPixMerchantName" | "sicrediPixMerchantCity">) {
  const key = settings.sicrediPixKeyEncrypted ? decryptLilySecret(settings.sicrediPixKeyEncrypted, "sicredi-pix-key") : "";
  const merchantNameConfigured = Boolean(settings.sicrediPixMerchantName?.trim());
  const merchantCityConfigured = Boolean(settings.sicrediPixMerchantCity?.trim());
  return {
    bank: "Sicredi" as const,
    keyConfigured: Boolean(key),
    maskedKey: key ? `${"•".repeat(Math.max(0, key.length - 4))}${key.slice(-4)}` : "",
    merchantName: settings.sicrediPixMerchantName ?? "",
    merchantCity: settings.sicrediPixMerchantCity ?? "",
    merchantNameConfigured,
    merchantCityConfigured,
    ready: Boolean(key && merchantNameConfigured && merchantCityConfigured)
  };
}

export async function createSicrediPixPayment(input: LilyPaymentProviderCreateInput & {
  settings: Pick<LilyOperationalSettings, "sicrediPixKeyEncrypted" | "sicrediPixMerchantName" | "sicrediPixMerchantCity">;
}): Promise<LilyPaymentProviderCreateResult> {
  if (input.method !== "pix") throw new ApiError(400, "O Pix Sicredi aceita apenas Pix.", { code: "LILY_PAYMENT_METHOD_UNSUPPORTED" });
  const configuration = sicrediPixConfiguration(input.settings);
  if (!configuration.ready) throw new ApiError(503, "Pix Sicredi ainda não está completamente configurado.", { code: "LILY_SICREDI_PIX_NOT_CONFIGURED" });
  const key = decryptLilySecret(input.settings.sicrediPixKeyEncrypted!, "sicredi-pix-key");
  const txid = txidForPayment(input.paymentId);
  const payload = buildStaticPixPayload({
    key,
    merchantName: configuration.merchantName,
    merchantCity: configuration.merchantCity,
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
