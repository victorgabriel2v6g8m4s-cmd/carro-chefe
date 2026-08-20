import crypto from "node:crypto";

export function webhookSignature(payload: string, secret: string) {
  return `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function hasValidWebhookSignature(payload: string, signature: string | undefined, secret: string | null) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(webhookSignature(payload, secret));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
