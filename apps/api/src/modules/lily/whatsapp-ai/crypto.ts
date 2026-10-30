import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

function rootKey() {
  const configured = process.env.COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY?.trim() ?? "";
  let key: Buffer;
  try {
    key = Buffer.from(configured, "base64url");
  } catch {
    throw new Error("WHATSAPP_AI_ENCRYPTION_KEY_INVALID");
  }
  if (key.length !== 32) throw new Error("WHATSAPP_AI_ENCRYPTION_KEY_INVALID");
  return key;
}

function deriveKey(context: string) {
  return Buffer.from(hkdfSync("sha256", rootKey(), "cooklily-whatsapp-ai-v1", context, 32));
}

export function hashWhatsAppContact(phoneE164: string) {
  return createHmac("sha256", deriveKey("contact-index-v1")).update(phoneE164).digest("hex");
}

export function encryptWhatsAppPrivateValue(value: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("message-encryption-v1"), nonce);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", nonce.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptWhatsAppPrivateValue(value: string) {
  const [version, nonceText, tagText, ciphertextText, extra] = value.split(".");
  if (version !== "v1" || !nonceText || !tagText || !ciphertextText || extra !== undefined) {
    throw new Error("WHATSAPP_AI_CIPHERTEXT_INVALID");
  }
  const nonce = Buffer.from(nonceText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");
  if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length > 8192) {
    throw new Error("WHATSAPP_AI_CIPHERTEXT_INVALID");
  }
  const decipher = createDecipheriv("aes-256-gcm", deriveKey("message-encryption-v1"), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

