import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin } from "./admin-security";
import { requireLilyCsrf, requireLilySession, verifyPassword } from "./auth";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MFA_ISSUER = "CookLily";
const MFA_PERIOD_SECONDS = 30;
const MFA_DIGITS = 6;

const setupSchema = z.object({
  currentPassword: z.string().min(1).max(128)
}).strict();

const codeSchema = z.object({
  code: z.string().trim().min(6).max(32)
}).strict();

function isPrivileged(role: string) {
  return role === "staff" || role === "admin";
}

function requirePrivilegedRole(role: string) {
  if (!isPrivileged(role)) {
    throw new ApiError(403, "MFA é reservado às contas da equipe CookLily.", {
      code: "LILY_MFA_STAFF_REQUIRED"
    });
  }
}

function mfaEncryptionKey() {
  const encoded = process.env.LILY_MFA_ENCRYPTION_KEY?.trim();
  if (encoded) {
    const key = Buffer.from(encoded, "base64url");
    if (key.length !== 32) {
      throw new Error("LILY_MFA_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64url.");
    }
    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("LILY_MFA_ENCRYPTION_KEY é obrigatória em produção.");
  }

  // Chave determinística somente para desenvolvimento/teste. Produção falha fechada sem variável própria.
  return crypto.createHash("sha256").update("cooklily-dev-only-mfa-key-v1").digest();
}

function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", mfaEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptSecret(encoded: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = encoded.split(".");
  if (version !== "v1" || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error("Segredo MFA cifrado inválido.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    mfaEncryptionKey(),
    Buffer.from(ivEncoded, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function base32Encode(buffer: Buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let offset = 0; offset < bits.length; offset += 5) {
    const chunk = bits.slice(offset, offset + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value: string) {
  const normalized = value.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Segredo TOTP base32 inválido.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpAt(secretBase32: string, counter: number) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", base32Decode(secretBase32)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  ) >>> 0;
  return String(binary % (10 ** MFA_DIGITS)).padStart(MFA_DIGITS, "0");
}

export function currentLilyTotp(secretBase32: string, nowMs = Date.now()) {
  const counter = Math.floor(nowMs / 1000 / MFA_PERIOD_SECONDS);
  return totpAt(secretBase32, counter);
}

function verifyTotp(secretBase32: string, supplied: string, nowMs = Date.now()) {
  if (!/^\d{6}$/.test(supplied)) return false;
  const counter = Math.floor(nowMs / 1000 / MFA_PERIOD_SECONDS);
  const suppliedBuffer = Buffer.from(supplied);
  for (const delta of [-1, 0, 1]) {
    const expectedBuffer = Buffer.from(totpAt(secretBase32, counter + delta));
    if (expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return true;
    }
  }
  return false;
}

function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hashRecoveryCode(userId: string, code: string) {
  return crypto.createHash("sha256").update(`${userId}:${normalizeRecoveryCode(code)}`).digest("hex");
}

function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

function recoveryHashes(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

async function mfaState(userId: string, sessionId: string, role: string) {
  const [user, session] = await Promise.all([
    lilyPrisma.lilyUser.findUnique({
      where: { id: userId },
      select: {
        mfaEnabled: true,
        mfaRecoveryCodesJson: true
      }
    }),
    lilyPrisma.lilySession.findUnique({
      where: { id: sessionId },
      select: { mfaVerifiedAt: true }
    })
  ]);
  if (!user || !session) throw new ApiError(401, "Sessão Lily inválida.", { code: "LILY_SESSION_INVALID" });
  const required = isPrivileged(role);
  return {
    required,
    enabled: user.mfaEnabled,
    verified: !required || Boolean(session.mfaVerifiedAt),
    setupRequired: required && !user.mfaEnabled,
    recoveryCodesRemaining: recoveryHashes(user.mfaRecoveryCodesJson).length
  };
}

export async function lilyMfaRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/customer/security/mfa/status", async (request) => {
    const context = await requireLilySession(request);
    return mfaState(context.user.id, context.session.id, context.user.role);
  });

  app.post("/api/v1/lily/customer/security/mfa/setup", {
    config: { rateLimit: { max: 4, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilySession(request);
    requirePrivilegedRole(context.user.role);
    requireLilyCsrf(request, context);
    if (context.user.staffPasswordUpgradeRequired) {
      throw new ApiError(403, "Atualize a senha da equipe antes de configurar MFA.", {
        code: "LILY_STAFF_PASSWORD_UPGRADE_REQUIRED"
      });
    }

    const input = setupSchema.parse(request.body);
    const user = await lilyPrisma.lilyUser.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        phoneNormalized: true,
        passwordHash: true,
        mfaEnabled: true
      }
    });
    if (!user) throw new ApiError(404, "Usuário não encontrado.");
    if (user.mfaEnabled) {
      throw new ApiError(409, "MFA já está ativa para esta conta.", { code: "LILY_MFA_ALREADY_ENABLED" });
    }
    if (!await verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new ApiError(401, "Senha atual incorreta.", { code: "LILY_CURRENT_PASSWORD_INVALID" });
    }

    const secret = base32Encode(crypto.randomBytes(20));
    await lilyPrisma.lilyUser.update({
      where: { id: user.id },
      data: {
        mfaSecretEncrypted: encryptSecret(secret),
        mfaRecoveryCodesJson: "[]",
        mfaEnrolledAt: null
      }
    });
    await auditLilyAdmin(user.id, "security.mfa.setup_started", "user", user.id);

    const label = encodeURIComponent(`${MFA_ISSUER}:${user.phoneNormalized}`);
    const issuer = encodeURIComponent(MFA_ISSUER);
    return {
      secret,
      otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${MFA_DIGITS}&period=${MFA_PERIOD_SECONDS}`
    };
  });

  app.post("/api/v1/lily/customer/security/mfa/confirm", {
    config: { rateLimit: { max: 8, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilySession(request);
    requirePrivilegedRole(context.user.role);
    requireLilyCsrf(request, context);
    if (context.user.staffPasswordUpgradeRequired) {
      throw new ApiError(403, "Atualize a senha da equipe antes de configurar MFA.", {
        code: "LILY_STAFF_PASSWORD_UPGRADE_REQUIRED"
      });
    }

    const input = codeSchema.parse(request.body);
    const user = await lilyPrisma.lilyUser.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true
      }
    });
    if (!user?.mfaSecretEncrypted) {
      throw new ApiError(409, "Inicie a configuração do MFA antes de confirmar.", {
        code: "LILY_MFA_SETUP_REQUIRED"
      });
    }
    if (user.mfaEnabled) {
      throw new ApiError(409, "MFA já está ativa para esta conta.", { code: "LILY_MFA_ALREADY_ENABLED" });
    }

    const secret = decryptSecret(user.mfaSecretEncrypted);
    if (!verifyTotp(secret, input.code)) {
      throw new ApiError(401, "Código do autenticador inválido.", { code: "LILY_MFA_CODE_INVALID" });
    }

    const codes = generateRecoveryCodes();
    const hashes = codes.map((code) => hashRecoveryCode(user.id, code));
    const now = new Date();
    await lilyPrisma.$transaction([
      lilyPrisma.lilyUser.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          mfaRecoveryCodesJson: JSON.stringify(hashes),
          mfaEnrolledAt: now
        }
      }),
      lilyPrisma.lilySession.update({
        where: { id: context.session.id },
        data: { mfaVerifiedAt: now }
      }),
      lilyPrisma.lilySession.updateMany({
        where: {
          userId: user.id,
          id: { not: context.session.id },
          revokedAt: null
        },
        data: { revokedAt: now }
      })
    ]);

    await auditLilyAdmin(user.id, "security.mfa.enabled", "user", user.id, {
      recoveryCodesIssued: codes.length
    });

    return {
      enabled: true,
      verified: true,
      recoveryCodes: codes
    };
  });

  app.post("/api/v1/lily/customer/security/mfa/verify", {
    config: { rateLimit: { max: 8, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilySession(request);
    requirePrivilegedRole(context.user.role);
    requireLilyCsrf(request, context);
    const input = codeSchema.parse(request.body);

    const user = await lilyPrisma.lilyUser.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        mfaEnabled: true,
        mfaSecretEncrypted: true,
        mfaRecoveryCodesJson: true
      }
    });
    if (!user?.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new ApiError(403, "Configure MFA antes de acessar funções administrativas.", {
        code: "LILY_STAFF_MFA_SETUP_REQUIRED"
      });
    }

    const secret = decryptSecret(user.mfaSecretEncrypted);
    let method: "totp" | "recovery" | null = verifyTotp(secret, input.code) ? "totp" : null;
    let hashes = recoveryHashes(user.mfaRecoveryCodesJson);

    if (!method) {
      const suppliedHash = hashRecoveryCode(user.id, input.code);
      const index = hashes.findIndex((hash) => {
        const expected = Buffer.from(hash);
        const actual = Buffer.from(suppliedHash);
        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
      });
      if (index >= 0) {
        method = "recovery";
        hashes = hashes.filter((_, current) => current !== index);
      }
    }

    if (!method) {
      throw new ApiError(401, "Código MFA inválido.", { code: "LILY_MFA_CODE_INVALID" });
    }

    const now = new Date();
    await lilyPrisma.$transaction([
      lilyPrisma.lilySession.update({
        where: { id: context.session.id },
        data: { mfaVerifiedAt: now }
      }),
      ...(method === "recovery"
        ? [lilyPrisma.lilyUser.update({
            where: { id: user.id },
            data: { mfaRecoveryCodesJson: JSON.stringify(hashes) }
          })]
        : [])
    ]);

    await auditLilyAdmin(user.id, "security.mfa.verified", "session", context.session.id, {
      method
    });

    return {
      verified: true,
      method,
      recoveryCodesRemaining: hashes.length
    };
  });
}
