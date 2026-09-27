import crypto from "node:crypto";
import { ApiError } from "../../lib/errors";
import type {
  LilyPaymentProviderCreateInput,
  LilyPaymentProviderCreateResult,
  LilyPaymentProviderRemoteState,
  LilyPaymentProviderRefundInput
} from "./payment-provider";

const DEFAULT_API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 10_000;

type MercadoPagoPaymentMethod = {
  id?: string;
  type?: string;
  ticket_url?: string;
  qr_code?: string;
  qr_code_base64?: string;
  installments?: number;
};

type MercadoPagoTransaction = {
  id?: string;
  status?: string;
  status_detail?: string;
  amount?: string;
  paid_amount?: string;
  payment_method?: MercadoPagoPaymentMethod;
};

type MercadoPagoOrder = {
  id?: string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  transactions?: {
    payments?: MercadoPagoTransaction[];
    refunds?: Array<{
      id?: string;
      transaction_id?: string;
      amount?: string;
      status?: string;
    }>;
  };
};

export type MercadoPagoConfiguration = {
  accessTokenConfigured: boolean;
  publicKey: string | null;
  webhookSecretConfigured: boolean;
  pixReady: boolean;
  cardReady: boolean;
};

function apiBase() {
  const override = process.env.MERCADO_PAGO_API_BASE_URL?.trim();
  if (override && process.env.NODE_ENV !== "production") return override.replace(/\/$/, "");
  return DEFAULT_API_BASE;
}

function accessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new ApiError(503, "Mercado Pago ainda não está configurado.", {
      code: "LILY_MERCADO_PAGO_NOT_CONFIGURED"
    });
  }
  return token;
}

function webhookSecret() {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new ApiError(503, "Webhook do Mercado Pago ainda não está configurado.", {
      code: "LILY_MERCADO_PAGO_WEBHOOK_NOT_CONFIGURED"
    });
  }
  return secret;
}

export function mercadoPagoConfiguration(): MercadoPagoConfiguration {
  const accessTokenConfigured = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY?.trim() || null;
  const webhookSecretConfigured = Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim());
  return {
    accessTokenConfigured,
    publicKey,
    webhookSecretConfigured,
    pixReady: accessTokenConfigured && webhookSecretConfigured,
    cardReady: accessTokenConfigured && webhookSecretConfigured && Boolean(publicKey)
  };
}

function amountString(cents: number) {
  return (cents / 100).toFixed(2);
}

async function mercadoPagoRequest(
  path: string,
  input: {
    method?: "GET" | "POST";
    body?: unknown;
    idempotencyKey?: string;
  } = {}
): Promise<MercadoPagoOrder> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken()}`
  };
  if (input.body !== undefined) headers["Content-Type"] = "application/json";
  if (input.idempotencyKey) headers["X-Idempotency-Key"] = input.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: input.method ?? "GET",
      headers,
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    throw new ApiError(502, "Não foi possível conectar ao processador de pagamento.", {
      code: "LILY_PAYMENT_PROVIDER_UNAVAILABLE",
      provider: "mercado_pago"
    });
  }

  const body = await response.json().catch(() => null) as MercadoPagoOrder | null;
  if (!response.ok) {
    throw new ApiError(502, "O processador de pagamento recusou a operação.", {
      code: "LILY_PAYMENT_PROVIDER_REJECTED",
      provider: "mercado_pago",
      providerStatus: response.status
    });
  }
  if (!body || typeof body !== "object") {
    throw new ApiError(502, "Resposta inválida do processador de pagamento.", {
      code: "LILY_PAYMENT_PROVIDER_INVALID_RESPONSE",
      provider: "mercado_pago"
    });
  }
  return body;
}

function firstTransaction(order: MercadoPagoOrder) {
  return order.transactions?.payments?.[0] ?? null;
}

export function mercadoPagoState(order: MercadoPagoOrder): LilyPaymentProviderRemoteState {
  const transaction = firstTransaction(order);
  const status = transaction?.status ?? order.status ?? "created";
  const detail = transaction?.status_detail ?? order.status_detail ?? null;

  let localStatus: LilyPaymentProviderRemoteState["status"] = "pending";
  if (status === "processed" && detail === "accredited") localStatus = "approved";
  else if (status === "refunded" || detail === "refunded") localStatus = "refunded";
  else if (status === "processed" && detail === "partially_refunded") localStatus = "partially_refunded";
  else if (status === "canceled" || status === "expired") localStatus = "cancelled";
  else if (status === "failed") localStatus = "failed";
  else if (status === "charged_back") localStatus = "failed";

  const paidAmount = Number(transaction?.paid_amount ?? transaction?.amount ?? order.total_amount ?? "0");
  const paidCents = Number.isFinite(paidAmount) ? Math.round(paidAmount * 100) : null;
  const refunds = order.transactions?.refunds ?? [];
  const refundedCents = refunds.reduce((sum, row) => {
    const amount = Number(row.amount ?? "0");
    return sum + (Number.isFinite(amount) ? Math.round(amount * 100) : 0);
  }, 0);

  return {
    status: localStatus,
    providerPaymentId: order.id ?? null,
    providerReference: transaction?.id ?? null,
    providerStatus: status,
    providerStatusDetail: detail,
    paidCents,
    refundedCents,
    data: {
      ticketUrl: transaction?.payment_method?.ticket_url ?? null,
      qrCode: transaction?.payment_method?.qr_code ?? null,
      qrCodeBase64: transaction?.payment_method?.qr_code_base64 ?? null,
      paymentMethodId: transaction?.payment_method?.id ?? null,
      paymentMethodType: transaction?.payment_method?.type ?? null,
      installments: transaction?.payment_method?.installments ?? null
    }
  };
}

export async function createMercadoPagoPayment(
  input: LilyPaymentProviderCreateInput
): Promise<LilyPaymentProviderCreateResult> {
  if (!input.payer?.email) {
    throw new ApiError(400, "Informe o e-mail do pagador.", {
      code: "LILY_PAYMENT_PAYER_EMAIL_REQUIRED"
    });
  }

  const paymentMethod = input.method === "pix"
    ? {
      id: "pix",
      type: "bank_transfer",
      expiration_time: "PT30M"
    }
    : input.method === "credit_card"
      ? {
        id: input.card?.paymentMethodId,
        type: "credit_card",
        token: input.card?.token,
        installments: input.card?.installments ?? 1
      }
      : null;

  if (!paymentMethod) {
    throw new ApiError(400, "Meio de pagamento não suportado pelo Mercado Pago.", {
      code: "LILY_PAYMENT_METHOD_UNSUPPORTED"
    });
  }
  if (input.method === "credit_card" && (!input.card?.token || !input.card.paymentMethodId)) {
    throw new ApiError(400, "Token do cartão inválido ou ausente.", {
      code: "LILY_PAYMENT_CARD_TOKEN_REQUIRED"
    });
  }

  const payer: Record<string, unknown> = { email: input.payer.email };
  if (input.payer.identification?.type && input.payer.identification.number) {
    payer.identification = {
      type: input.payer.identification.type,
      number: input.payer.identification.number
    };
  }

  const order = await mercadoPagoRequest("/v1/orders", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      type: "online",
      processing_mode: "automatic",
      capture_mode: "automatic",
      total_amount: amountString(input.amountCents),
      external_reference: `cooklily:${input.orderId}`,
      payer,
      transactions: {
        payments: [{
          amount: amountString(input.amountCents),
          payment_method: paymentMethod
        }]
      }
    }
  });

  const remote = mercadoPagoState(order);
  return {
    providerPaymentId: remote.providerPaymentId,
    providerReference: remote.providerReference,
    status: remote.status === "partially_refunded" || remote.status === "refunded"
      ? "approved"
      : remote.status,
    instructions: input.method === "pix" ? remote.data.qrCode : null,
    expiresAt: input.method === "pix" ? new Date(Date.now() + 30 * 60 * 1000) : null,
    providerData: remote.data
  };
}

export async function getMercadoPagoPayment(providerPaymentId: string) {
  const order = await mercadoPagoRequest(`/v1/orders/${encodeURIComponent(providerPaymentId)}`);
  const state = mercadoPagoState(order);
  const refundReference = order.transactions?.refunds?.at(-1)?.id ?? null;
  return { ...state, operationReference: refundReference };
}

export async function cancelMercadoPagoPayment(providerPaymentId: string, idempotencyKey: string) {
  const order = await mercadoPagoRequest(
    `/v1/orders/${encodeURIComponent(providerPaymentId)}/cancel`,
    { method: "POST", idempotencyKey, body: {} }
  );
  return mercadoPagoState(order);
}

export async function refundMercadoPagoPayment(input: LilyPaymentProviderRefundInput) {
  if (!input.providerPaymentId || !input.providerReference) {
    throw new ApiError(409, "Pagamento não possui referências suficientes para estorno automático.", {
      code: "LILY_PAYMENT_PROVIDER_REFERENCE_REQUIRED"
    });
  }
  const full = input.amountCents === input.remainingCents;
  const body = full
    ? {}
    : {
      transactions: [{
        id: input.providerReference,
        amount: amountString(input.amountCents)
      }]
    };
  const order = await mercadoPagoRequest(
    `/v1/orders/${encodeURIComponent(input.providerPaymentId)}/refund`,
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body
    }
  );
  const state = mercadoPagoState(order);
  const refundReference = order.transactions?.refunds?.at(-1)?.id ?? null;
  return { ...state, operationReference: refundReference };
}

function parseSignature(value: string) {
  const parsed: Record<string, string> = {};
  for (const part of value.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (key && rest.length) parsed[key] = rest.join("=");
  }
  return parsed;
}

export function verifyMercadoPagoWebhookSignature(input: {
  signature: string;
  requestId: string;
  dataId: string;
}) {
  const parsed = parseSignature(input.signature);
  if (!parsed.ts || !parsed.v1) return false;

  const template = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${parsed.ts};`;
  const expected = crypto.createHmac("sha256", webhookSecret()).update(template).digest("hex");
  const actual = parsed.v1;
  if (!/^[a-f0-9]{64}$/i.test(actual)) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
