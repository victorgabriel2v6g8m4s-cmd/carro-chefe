import crypto from "node:crypto";
import { deriveLilyPurposeKey } from "./secret-crypto";

const LINK_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const KEY = "whatsapp-order-link-v1";

function signature(payload: string) {
  return crypto.createHmac("sha256", deriveLilyPurposeKey(KEY)).update(payload).digest("base64url");
}

export function createLilyOrderAccessLink(orderId: string, now = Date.now()) {
  const id = Buffer.from(orderId).toString("base64url");
  const expiresAt = now + LINK_TTL_MS;
  const payload = `${id}~${expiresAt}`;
  return `${payload}~${signature(payload)}`;
}

export function verifyLilyOrderAccessLink(token: string, now = Date.now()) {
  if (token.length > 512) return null;
  const [id, expiresRaw, supplied, ...extra] = token.split("~");
  if (!id || !expiresRaw || !supplied || extra.length || !/^[A-Za-z0-9_-]{1,160}$/.test(id)) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + LINK_TTL_MS + 60_000) return null;
  const expected = Buffer.from(signature(`${id}~${expiresAt}`));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const orderId = Buffer.from(id, "base64url").toString("utf8");
    return orderId && orderId.length <= 120 ? { orderId, expiresAt } : null;
  } catch {
    return null;
  }
}
