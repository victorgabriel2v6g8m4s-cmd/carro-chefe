import { parseResponse, type AuthPayload } from "../../api";

export class LilyPaymentChoiceRequestError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(message);
    this.name = "LilyPaymentChoiceRequestError";
  }
}

async function parsePaymentChoiceResponse<T>(response: Response): Promise<T> {
  const rawBody = response.status === 204 ? "" : await response.text().catch(() => "");
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = rawBody ? JSON.parse(rawBody) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch { /* respostas sem JSON usam a mensagem genérica */ }
  if (!response.ok) {
    const details = body?.details && typeof body.details === "object" && !Array.isArray(body.details)
      ? body.details as Record<string, unknown>
      : null;
    const message = typeof body?.error === "string" ? body.error
      : response.status >= 500 ? "O serviço de pagamento não confirmou a solicitação. O pedido permanece aguardando pagamento."
      : "Não foi possível concluir a solicitação.";
    const requestId = typeof body?.requestId === "string" ? body.requestId : response.headers.get("x-request-id");
    throw new LilyPaymentChoiceRequestError(
      requestId ? `${message} (referência ${requestId})` : message,
      typeof details?.code === "string" ? details.code : null
    );
  }
  return body as T;
}

export type LilyCheckoutPaymentMethod = "pix" | "credit_card" | "debit_card";
export type LilyPaymentProviderId = "cooklily_pix" | "sicredi_pix" | "mercado_pago" | "manual" | "homologation_mock";

export type LilyPaymentMethodRule = {
  method: LilyCheckoutPaymentMethod;
  enabled: boolean;
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  maxDiscountCents: number | null;
  minimumOrderCents: number;
};

export type LilyPaymentPricing = {
  method: LilyCheckoutPaymentMethod;
  baseAmountCents: number;
  eligibleAmountCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  amountCents: number;
  rule: LilyPaymentMethodRule;
};

export type LilyPaymentOption = {
  id: LilyCheckoutPaymentMethod;
  label: string;
  available: boolean;
  providers: LilyPaymentProviderId[];
  preferredProvider: LilyPaymentProviderId | null;
  requiresPayerEmail: boolean;
  fallbackMayUsePayerEmail: boolean;
  discountLabel: string | null;
  originalAmountCents: number;
  couponDiscountCents: number;
  pricing: LilyPaymentPricing;
};

export type LilyChoicePayment = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  provider: LilyPaymentProviderId | string;
  method: LilyCheckoutPaymentMethod | string;
  status: string;
  amountCents: number;
  currency: string;
  instructions: string | null;
  providerData: {
    ticketUrl: string | null;
    qrCode: string | null;
    qrCodeBase64: string | null;
    paymentMethodId: string | null;
    paymentMethodType: string | null;
    installments: number | null;
  } | null;
  pricing: {
    baseAmountCents: number;
    eligibleAmountCents: number;
    deliveryFeeCents: number;
    couponDiscountCents: number;
    couponShippingDiscountCents: number;
    discountCents: number;
    amountCents: number;
    rule: LilyPaymentMethodRule | null;
  };
  routing: {
    fallbackChain: LilyPaymentProviderId[];
    actualProvider: LilyPaymentProviderId | string;
  };
  expiresAt: string | null;
  approvedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LilyPaymentOptionsPayload = {
  enabled: boolean;
  homologation: boolean;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    baseAmountCents: number;
    deliveryFeeCents: number;
    currency: "BRL";
  };
  publicKey: string | null;
  methods: LilyPaymentOption[];
  activePayment: LilyChoicePayment | null;
};

function accessHeaders(
  input: { session?: AuthPayload | null; guestAccessToken?: string | null; homologation?: boolean },
  mutate = false
) {
  const headers: Record<string, string> = {};
  if (input.guestAccessToken) headers["X-Lily-Order-Token"] = input.guestAccessToken;
  if (input.homologation) headers["X-Lily-Homologation"] = "1";
  if (mutate && input.session) headers["X-Lily-CSRF"] = input.session.csrfToken;
  return headers;
}

export async function getLilyPaymentOptions(input: {
  orderId: string;
  session?: AuthPayload | null;
  guestAccessToken?: string | null;
  homologation?: boolean;
}) {
  const response = await fetch(`/api/v1/lily/orders/${encodeURIComponent(input.orderId)}/payment-options`, {
    credentials: "same-origin",
    headers: accessHeaders(input)
  });
  return parseResponse<LilyPaymentOptionsPayload>(response);
}

export async function createLilyPaymentChoice(input: {
  orderId: string;
  method: LilyCheckoutPaymentMethod;
  idempotencyKey: string;
  session?: AuthPayload | null;
  guestAccessToken?: string | null;
  homologation?: boolean;
  payer?: {
    email: string;
    identification?: { type: string; number: string };
  };
  card?: {
    token: string;
    paymentMethodId: string;
    installments: number;
  };
}) {
  const response = await fetch("/api/v1/lily/payments/options", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
      ...accessHeaders(input, true)
    },
    body: JSON.stringify({
      orderId: input.orderId,
      method: input.method,
      ...(input.payer ? { payer: input.payer } : {}),
      ...(input.card ? { card: input.card } : {})
    })
  });
  return parsePaymentChoiceResponse<LilyChoicePayment>(response);
}

export type AdminPaymentChoiceSettings = {
  paymentsEnabled: boolean;
  manualPixEnabled: boolean;
  manualPixInstructions: string | null;
  mercadoPagoPixEnabled: boolean;
  mercadoPagoCardEnabled: boolean;
  activePixProvider: "cooklily_pix" | "sicredi_pix";
  sicrediPix: { bank: "Sicredi"; keyConfigured: boolean; maskedKey: string; merchantName: string; merchantCity: string; merchantNameConfigured: boolean; merchantCityConfigured: boolean; ready: boolean };
  methods: LilyPaymentMethodRule[];
  readiness: {
    cookLilyPix: {
      keyConfigured: boolean;
      merchantNameConfigured: boolean;
      merchantCityConfigured: boolean;
      ready: boolean;
      reconciliationReady?: boolean;
    };
    mercadoPago: {
      accessTokenConfigured: boolean;
      publicKeyConfigured?: boolean;
      publicKey?: string | null;
      webhookSecretConfigured: boolean;
      pixReady: boolean;
      cardReady: boolean;
    };
    pixFallbackChain: LilyPaymentProviderId[];
  };
};

export async function getAdminPaymentChoiceSettings() {
  const response = await fetch("/api/v1/lily/admin/payment-options/settings", { credentials: "same-origin" });
  return parseResponse<AdminPaymentChoiceSettings>(response);
}

export async function saveAdminPaymentChoiceSettings(
  input: Omit<AdminPaymentChoiceSettings, "readiness" | "sicrediPix"> & { sicrediPixKey?: string; sicrediPixMerchantName?: string; sicrediPixMerchantCity?: string },
  csrfToken: string
) {
  const response = await fetch("/api/v1/lily/admin/payment-options/settings", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(input)
  });
  return parseResponse<AdminPaymentChoiceSettings>(response);
}

export async function getAdminPixQr(provider: "cooklily_pix" | "sicredi_pix") {
  const response = await fetch(`/api/v1/lily/admin/payment-options/pix-qr?provider=${provider}`, { credentials: "same-origin", cache: "no-store" });
  return parseResponse<{ provider: string; qrCode: string }>(response);
}
