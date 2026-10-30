import crypto from "node:crypto";

function encryptionKey() {
  const encoded = process.env.LILY_MFA_ENCRYPTION_KEY?.trim();
  if (encoded) {
    const key = Buffer.from(encoded, "base64url");
    if (key.length !== 32) throw new Error("LILY_MFA_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64url.");
    return key;
  }
  if (process.env.NODE_ENV === "production") throw new Error("LILY_MFA_ENCRYPTION_KEY é obrigatória em produção.");
  return crypto.createHash("sha256").update("cooklily-dev-only-mfa-key-v1").digest();
}

export function encryptLilySecret(secret: string, purpose: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`cooklily:${purpose}:v2`));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v2", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptLilySecret(encoded: string, purpose: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = encoded.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded || !["v1", "v2"].includes(version)) throw new Error("Segredo CookLily cifrado inválido.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
  if (version === "v2") decipher.setAAD(Buffer.from(`cooklily:${purpose}:v2`));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}
