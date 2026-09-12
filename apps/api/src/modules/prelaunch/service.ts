export const PRELAUNCH_CONSENT_VERSION = "prelaunch-whatsapp-v1";
export const PRELAUNCH_PRIVACY_POLICY_VERSION = "prelaunch-privacy-v1";

export const prelaunchEventNames = [
  "qr_scan",
  "landing_view",
  "signup_cta_click",
  "form_start",
  "signup_submit",
  "signup_success",
  "signup_duplicate",
  "signup_error",
  "reward_view",
  "instagram_click",
  "whatsapp_click",
  "privacy_open",
  "consent_analytics_granted"
] as const;

export type PrelaunchEventName = (typeof prelaunchEventNames)[number];

export function normalizeBrazilWhatsappPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;

  if (national.length !== 10 && national.length !== 11) return null;
  const areaCode = national.slice(0, 2);
  const subscriber = national.slice(2);
  if (/^(\d)\1+$/.test(national)) return null;
  if (areaCode.startsWith("0") || subscriber.startsWith("0")) return null;
  if (national.length === 11 && subscriber[0] !== "9") return null;

  return `+55${national}`;
}

export function normalizeOptionalFirstName(input?: string | null): string | null {
  if (!input) return null;
  const normalized = input.trim().replace(/\s+/g, " ").slice(0, 80);
  return normalized || null;
}

export function sanitizeTrackingValue(input?: string | null, maxLength = 120): string | null {
  if (!input) return null;
  const value = input.trim().slice(0, maxLength);
  if (!value) return null;
  return /^[A-Za-z0-9._:-]+$/.test(value) ? value : null;
}

export function resolveFirstSeenAt(input?: string | null, now = new Date()): Date {
  if (!input) return now;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return now;
  const maxFutureSkewMs = 5 * 60 * 1000;
  const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() > now.getTime() + maxFutureSkewMs) return now;
  if (parsed.getTime() < now.getTime() - maxAgeMs) return now;
  return parsed;
}
