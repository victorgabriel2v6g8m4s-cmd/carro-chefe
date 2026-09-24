export type AuthPayload = {
  user: {
    id: string;
    phone: string;
    displayName: string | null;
    role: string;
  };
  csrfToken: string;
  sessionExpiresAt: string;
  consents: Record<string, {
    granted: boolean;
    version: string;
    recordedAt: string;
    revokedAt: string | null;
  }>;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body.error === "string" ? body.error : "Não foi possível concluir a solicitação.";
    throw new Error(message);
  }
  return body as T;
}

export async function getLilyConfig() {
  const response = await fetch("/api/v1/lily/public/config", { credentials: "same-origin" });
  return parseResponse<{
    termsVersion: string;
    privacyPolicyVersion: string;
    consentVersions: Record<string, string>;
    brand: { name: string; wordmark: string };
    tracking: unknown;
  }>(response);
}

export async function registerLily(input: {
  phone: string;
  password: string;
  displayName?: string;
  termsAccepted: true;
  termsVersion: string;
  privacyPolicyVersion: string;
  consents: {
    lilyMarketing: boolean;
    shareWithCarroChefe: boolean;
    analyticsOptional: boolean;
  };
}) {
  const response = await fetch("/api/v1/lily/auth/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<AuthPayload>(response);
}

export async function loginLily(input: { phone: string; password: string }) {
  const response = await fetch("/api/v1/lily/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<AuthPayload>(response);
}


export async function submitCookLilyLead(input: {
  phone: string;
  marketingConsent: true;
  consentVersion: string;
  privacyPolicyVersion: string;
  attribution?: Record<string, string>;
  website?: string;
}) {
  const response = await fetch("/api/v1/lily/public/leads", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<{ accepted: true }>(response);
}
