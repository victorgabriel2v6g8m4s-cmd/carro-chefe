import { ApiError } from "../../lib/errors";
import type { LilyCheckoutPaymentMethod } from "./payment-method-rules";

const DEFAULT_API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 10_000;

type ChoiceInput = {
  paymentId: string;
  orderId: string;
  amountCents: number;
  method: LilyCheckoutPaymentMethod;
  idempotencyKey: string;
  payer?: {
    email: string;
    identification?: { type: string; number: string };
  };
  card?: {
    token: string;
    paymentMethodId: string;
    installments: number;
  };
};

type ChoiceResult = {
  providerPaymentId: string | null;
  providerReference: string | null;
  status: "pending" | "approved" | "failed";
  paidCents: number | null;
  instructions: string | null;
  expiresAt: Date | null;
  providerData: {
    ticketUrl: string | null;
    qrCode: string | null;
    qrCodeBase64: string | null;
    paymentMethodId: string | null;
    paymentMethodType: string | null;
    installments: number | null;
  } | null;
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

function amountString(cents: number) {
  return (cents / 100).toFixed(2);
}

function firstPayment(order: any) {
  return order?.transactions?.payments?.[0] ?? null;
}

function localStatus(order: any): ChoiceResult["status"] {
  const payment = firstPayment(order);
  const status = payment?.status ?? order?.status ?? "created";
  const detail = payment?.status_detail ?? order?.status_detail ?? null;
  if (status === "processed" && detail === "accredited") return "approved";
  if (["failed", "charged_back", "canceled", "expired"].includes(status)) return "failed";
  return "pending";
}

export async function createMercadoPagoChoicePayment(input: ChoiceInput): Promise<ChoiceResult> {
  if (!input.payer?.email) {
    throw new ApiError(400, "Informe o e-mail do pagador.", {
      code: "LILY_PAYMENT_PAYER_EMAIL_REQUIRED"
    });
  }

  let paymentMethod: Record<string, unknown>;
  if (input.method === "pix") {
    paymentMethod = { id: "pix", type: "bank_transfer", expiration_time: "PT30M" };
  } else {
    if (!input.card?.token || !input.card.paymentMethodId) {
      throw new ApiError(400, "Token do cartão inválido ou ausente.", {
        code: "LILY_PAYMENT_CARD_TOKEN_REQUIRED"
      });
    }
    paymentMethod = {
      id: input.card.paymentMethodId,
      type: input.method,
      token: input.card.token,
      installments: input.method === "debit_card" ? 1 : Math.max(1, input.card.installments)
    };
  }

  const payer: Record<string, unknown> = { email: input.payer.email };
  if (input.payer.identification?.type && input.payer.identification.number) {
    payer.identification = {
      type: input.payer.identification.type,
      number: input.payer.identification.number
    };
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/v1/orders`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        capture_mode: "automatic",
        total_amount: amountString(input.amountCents),
        external_reference: `cooklily:${input.orderId}`,
        payer,
        transactions: {
          payments: [{ amount: amountString(input.amountCents), payment_method: paymentMethod }]
        }
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch {
    // Não há fallback silencioso após uma tentativa externa: um timeout pode ter
    // criado a cobrança no provedor. A idempotência permite repetir com segurança.
    throw new ApiError(502, "Não foi possível confirmar a criação no processador de pagamento.", {
      code: "LILY_PAYMENT_PROVIDER_UNCERTAIN",
      provider: "mercado_pago"
    });
  }

  const order = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new ApiError(502, "O processador de pagamento recusou a operação.", {
      code: "LILY_PAYMENT_PROVIDER_REJECTED",
      provider: "mercado_pago",
      providerStatus: response.status
    });
  }
  if (!order || typeof order !== "object") {
    throw new ApiError(502, "Resposta inválida do processador de pagamento.", {
      code: "LILY_PAYMENT_PROVIDER_INVALID_RESPONSE",
      provider: "mercado_pago"
    });
  }

  const payment = firstPayment(order);
  const paidAmount = Number(payment?.paid_amount ?? payment?.amount ?? order?.total_amount ?? "0");
  const paidCents = Number.isFinite(paidAmount) ? Math.round(paidAmount * 100) : null;
  const providerData = {
    ticketUrl: typeof payment?.payment_method?.ticket_url === "string" ? payment.payment_method.ticket_url : null,
    qrCode: typeof payment?.payment_method?.qr_code === "string" ? payment.payment_method.qr_code : null,
    qrCodeBase64: typeof payment?.payment_method?.qr_code_base64 === "string" ? payment.payment_method.qr_code_base64 : null,
    paymentMethodId: typeof payment?.payment_method?.id === "string" ? payment.payment_method.id : null,
    paymentMethodType: typeof payment?.payment_method?.type === "string" ? payment.payment_method.type : input.method,
    installments: typeof payment?.payment_method?.installments === "number"
      ? payment.payment_method.installments
      : input.method === "debit_card" ? 1 : input.card?.installments ?? null
  };

  return {
    providerPaymentId: typeof order.id === "string" ? order.id : null,
    providerReference: typeof payment?.id === "string" ? payment.id : null,
    status: localStatus(order),
    paidCents,
    instructions: input.method === "pix" ? providerData.qrCode : null,
    expiresAt: input.method === "pix" ? new Date(Date.now() + 30 * 60 * 1000) : null,
    providerData
  };
}
