import { parseResponse, type AuthPayload } from "../../api";

export type LilyPaymentMethod = "manual_pix" | "pix" | "credit_card";

export type LilyPaymentConfig = {
  enabled: boolean;
  homologation: boolean;
  provider: "manual" | "mercado_pago";
  providerConfigured: boolean;
  publicKey: string | null;
  methods: Array<{
    id: LilyPaymentMethod;
    label: string;
    confirmation: "manual" | "automatic";
  }>;
};

export type LilyPaymentProviderData = {
  ticketUrl: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  paymentMethodId: string | null;
  paymentMethodType: string | null;
  installments: number | null;
};

export type LilyPayment = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  isHomologation: boolean;
  provider: string;
  method: string;
  status: string;
  isHomologation: boolean;
  amountCents: number;
  currency: string;
  instructions: string | null;
  providerData: LilyPaymentProviderData | null;
  expiresAt: string | null;
  approvedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  refundedCents: number;
  createdAt: string;
  updatedAt: string;
  events: Array<{
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
  }>;
  reconciliations: Array<{
    status: string;
    createdAt: string;
  }>;
};

export type LilyPaymentOrderContext = {
  id: string;
  orderNumber: string;
  status: string;
  amountCents: number;
  currency: "BRL";
};

type AdminReconciliation = {
  expectedGrossCents: number;
  reportedGrossCents: number;
  feeCents: number;
  netCents: number;
  discrepancyCents: number;
  status: string;
  providerReference: string | null;
  note: string | null;
  createdAt: string;
};

export type AdminPayment = Omit<LilyPayment, "events" | "reconciliations"> & {
  providerReference: string | null;
  events: Array<{
    source: string;
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
  }>;
  reconciliations: AdminReconciliation[];
  order: {
    id: string;
    orderNumber: string;
    phone: string;
    status: string;
    grandTotalCents: number;
    createdAt: string;
  };
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

export async function getLilyPaymentConfig(input: { session?: AuthPayload | null; homologation?: boolean } = {}) {
  const response = await fetch("/api/v1/lily/public/payments/config", {
    credentials: "same-origin",
    headers: accessHeaders(input)
  });
  return parseResponse<LilyPaymentConfig>(response);
}

export async function getLilyPaymentContext(input: {
  orderId: string;
  session?: AuthPayload | null;
  guestAccessToken?: string | null;
}) {
  const response = await fetch(
    `/api/v1/lily/orders/${encodeURIComponent(input.orderId)}/payment-context`,
    {
      credentials: "same-origin",
      headers: accessHeaders(input)
    }
  );
  return parseResponse<LilyPaymentOrderContext>(response);
}

export async function createLilyPayment(input: {
  orderId: string;
  method: LilyPaymentMethod;
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
  const response = await fetch("/api/v1/lily/payments", {
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
  return parseResponse<LilyPayment>(response);
}

export async function getLilyPayment(input: {
  paymentId: string;
  session?: AuthPayload | null;
  guestAccessToken?: string | null;
}) {
  const response = await fetch(`/api/v1/lily/payments/${encodeURIComponent(input.paymentId)}`, {
    credentials: "same-origin",
    headers: accessHeaders(input)
  });
  return parseResponse<LilyPayment>(response);
}

export async function getOrderPayments(input: {
  orderId: string;
  session?: AuthPayload | null;
  guestAccessToken?: string | null;
}) {
  const response = await fetch(`/api/v1/lily/orders/${encodeURIComponent(input.orderId)}/payments`, {
    credentials: "same-origin",
    headers: accessHeaders(input)
  });
  return parseResponse<{ order: LilyPaymentOrderContext; payments: LilyPayment[] }>(response);
}

export type AdminPaymentSettings = {
  paymentsEnabled: boolean;
  paymentProvider: "manual" | "mercado_pago";
  manualPixEnabled: boolean;
  manualPixInstructions: string | null;
  mercadoPagoPixEnabled: boolean;
  mercadoPagoCardEnabled: boolean;
  mercadoPago: {
    accessTokenConfigured: boolean;
    publicKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
    pixReady: boolean;
    cardReady: boolean;
  };
};

export async function getAdminPaymentSettings() {
  const response = await fetch("/api/v1/lily/admin/payments/settings", { credentials: "same-origin" });
  return parseResponse<AdminPaymentSettings>(response);
}

export async function saveAdminPaymentSettings(input: Omit<AdminPaymentSettings, "mercadoPago">, csrfToken: string) {
  const response = await fetch("/api/v1/lily/admin/payments/settings", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(input)
  });
  return parseResponse<AdminPaymentSettings>(response);
}

export async function getAdminPayments(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`/api/v1/lily/admin/payments${query}`, { credentials: "same-origin" });
  return parseResponse<{ payments: AdminPayment[] }>(response);
}

export async function confirmAdminPayment(
  paymentId: string,
  input: { providerReference: string; reportedGrossCents?: number; feeCents?: number; netCents?: number; note?: string | null },
  csrfToken: string
) {
  const response = await fetch(`/api/v1/lily/admin/payments/${encodeURIComponent(paymentId)}/confirm`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(input)
  });
  return parseResponse<AdminPayment>(response);
}

export async function cancelAdminPayment(paymentId: string, csrfToken: string) {
  const response = await fetch(`/api/v1/lily/admin/payments/${encodeURIComponent(paymentId)}/cancel`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-Lily-CSRF": csrfToken }
  });
  return parseResponse<AdminPayment>(response);
}

export async function reconcileAdminPayment(
  paymentId: string,
  input: {
    reportedGrossCents: number;
    feeCents: number;
    netCents: number;
    providerReference?: string | null;
    note?: string | null;
  },
  csrfToken: string
) {
  const response = await fetch(`/api/v1/lily/admin/payments/${encodeURIComponent(paymentId)}/reconcile`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(input)
  });
  return parseResponse<unknown>(response);
}

export async function refundAdminPayment(
  paymentId: string,
  input: { amountCents: number; providerReference?: string | null; note?: string | null },
  csrfToken: string
) {
  const response = await fetch(`/api/v1/lily/admin/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrfToken },
    body: JSON.stringify(input)
  });
  return parseResponse<AdminPayment>(response);
}
