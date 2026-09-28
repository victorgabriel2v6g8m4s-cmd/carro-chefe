import crypto from "node:crypto";
import { ApiError } from "../../lib/errors";

const CODE_DIGITS = 6;

function configuredKey() {
  const encoded = process.env.COOKLILY_LOGISTICS_CODE_KEY?.trim();
  if (!encoded) return null;
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) {
    throw new Error("COOKLILY_LOGISTICS_CODE_KEY deve conter exatamente 32 bytes em base64url.");
  }
  return key;
}

function logisticsKey() {
  const key = configuredKey();
  if (key) return key;

  if (process.env.NODE_ENV === "production") {
    throw new ApiError(503, "Códigos logísticos ainda não estão configurados.", {
      code: "LILY_LOGISTICS_CODE_KEY_REQUIRED"
    });
  }

  return crypto.createHash("sha256")
    .update("cooklily-dev-only-logistics-code-key-v1")
    .digest();
}

export function lilyLogisticsCodeConfiguration() {
  const encoded = process.env.COOKLILY_LOGISTICS_CODE_KEY?.trim();
  let configured = false;
  if (encoded) {
    try {
      configured = Buffer.from(encoded, "base64url").length === 32;
    } catch {
      configured = false;
    }
  }
  return {
    configured,
    ready: configured || process.env.NODE_ENV !== "production"
  };
}

export function lilyOrderSecurityCode(orderId: string, kind: "pickup" | "delivery") {
  const digest = crypto.createHmac("sha256", logisticsKey())
    .update(`${kind}:${orderId}`)
    .digest();
  const value = digest.readUInt32BE(0) % (10 ** CODE_DIGITS);
  return String(value).padStart(CODE_DIGITS, "0");
}

export function verifyLilyOrderSecurityCode(
  orderId: string,
  kind: "pickup" | "delivery",
  supplied: string
) {
  if (!/^\d{6}$/.test(supplied)) return false;
  const expected = Buffer.from(lilyOrderSecurityCode(orderId, kind));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
