import { parseResponse, type AuthPayload } from "../../api";

export type LilyPaymentConfig = {
  enabled: boolean;
  providerConfigured: boolean;
  methods: Array<{ id: "manual_pix"; label: string; confirmation: "manual" }>;
};

export type LilyPayment = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  provider: string;
  method: string;
  status: string;
  amountCents: number;
  currency: string;
  instructions: string | null;
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

function accessHeaders(input: { session?: AuthPayload | null; guestAccessToken?: string | null }, mutate = false) {
  const headers: Record<string, string> = {};
  if (input.guestAccessToken) headers["X-Lily-Order-Token"] = input.guestAccessToken;
  if (mutate && input.session) headers["X-Lily-CSRF"] = input.session.csrfToken;
  return headers;
}

export async function getLilyPaymentConfig() {
  const response = await fetch("/api/v1/lily/public/payments/config", { credentials: "same-origin" });
  return parseResponse<LilyPaymentConfig>(response);
}

export async function createLilyPayment(input: {
  orderId: string;
  method: "manual_pix";
  idempotencyKey: string;
  session?: AuthPayload | null;
  guestAccessToken?: string | null;
}) {
  const response = await fetch("/api/v1/lily/payments", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
      ...accessHeaders(input, true)
    },
    body: JSON.stringify({ orderId: input.orderId, method: input.method })
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
  return parseResponse<{ payments: LilyPayment[] }>(response);
}

export type AdminPaymentSettings = {
  paymentsEnabled: boolean;
  paymentProvider: "manual";
  manualPixEnabled: boolean;
  manualPixInstructions: string | null;
};

export async function getAdminPaymentSettings() {
  const response = await fetch("/api/v1/lily/admin/payments/settings", { credentials: "same-origin" });
  return parseResponse<AdminPaymentSettings>(response);
}

export async function saveAdminPaymentSettings(input: AdminPaymentSettings, csrfToken: string) {
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
  input: { amountCents: number; providerReference: string; note?: string | null },
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
