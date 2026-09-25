import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";

export const LILY_TERMS_VERSION = "lily-terms-v1";
export const LILY_PRIVACY_VERSION = "lily-privacy-v1";
export const LILY_MARKETING_VERSION = "lily-marketing-v1";
export const LILY_SHARE_VERSION = "lily-share-carro-chefe-v1";
export const LILY_ANALYTICS_VERSION = "lily-analytics-v1";

const SESSION_COOKIE = "lily_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

export type LilySessionContext = {
  session: {
    id: string;
    csrfTokenHash: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    phoneNormalized: string;
    displayName: string | null;
    role: string;
    status: string;
  };
};

export function normalizeLilyPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
  if (national.length !== 10 && national.length !== 11) return null;
  if (/^(\d)\1+$/.test(national)) return null;
  const areaCode = national.slice(0, 2);
  const subscriber = national.slice(2);
  if (areaCode.startsWith("0") || subscriber.startsWith("0")) return null;
  if (national.length === 11 && subscriber[0] !== "9") return null;
  return `+55${national}`;
}

function scryptAsync(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024
    }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    hash.toString("base64url")
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltEncoded, hashEncoded] = encoded.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !saltEncoded || !hashEncoded) return false;
  const parsedN = Number(n);
  const parsedR = Number(r);
  const parsedP = Number(p);
  if (parsedN !== SCRYPT_N || parsedR !== SCRYPT_R || parsedP !== SCRYPT_P) return false;
  const salt = Buffer.from(saltEncoded, "base64url");
  const expected = Buffer.from(hashEncoded, "base64url");
  const actual = await scryptAsync(password, salt);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readCookie(request: FastifyRequest, name: string) {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const entry of header.split(";")) {
    const [key, ...valueParts] = entry.trim().split("=");
    if (key === name) return valueParts.join("=") || null;
  }
  return null;
}

function sessionCookie(value: string, maxAgeSeconds: number, secure: boolean) {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/api/v1/lily",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function requestUsesHttps(request: FastifyRequest) {
  return request.protocol === "https" || process.env.NODE_ENV === "production";
}

export function clearLilySessionCookie(request: FastifyRequest, reply: FastifyReply) {
  reply.header("Set-Cookie", sessionCookie("", 0, requestUsesHttps(request)));
}

export async function createLilySession(userId: string, request: FastifyRequest, reply: FastifyReply) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrfToken = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await lilyPrisma.lilySession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      csrfTokenHash: hashToken(csrfToken),
      expiresAt
    }
  });
  reply.header("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000), requestUsesHttps(request)));
  return { csrfToken, expiresAt };
}

async function loadLilySession(token: string): Promise<LilySessionContext | null> {
  const now = new Date();
  const record = await lilyPrisma.lilySession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });
  if (!record || record.revokedAt || record.expiresAt <= now || record.user.status !== "active") return null;
  await lilyPrisma.lilySession.update({
    where: { id: record.id },
    data: { lastSeenAt: now }
  });
  return {
    session: {
      id: record.id,
      csrfTokenHash: record.csrfTokenHash,
      expiresAt: record.expiresAt
    },
    user: {
      id: record.user.id,
      phoneNormalized: record.user.phoneNormalized,
      displayName: record.user.displayName,
      role: record.user.role,
      status: record.user.status
    }
  };
}

export async function getOptionalLilySession(request: FastifyRequest): Promise<LilySessionContext | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return loadLilySession(token);
}

export async function requireLilySession(request: FastifyRequest): Promise<LilySessionContext> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) throw new ApiError(401, "Sessão Lily necessária.", { code: "LILY_AUTH_REQUIRED" });
  const context = await loadLilySession(token);
  if (!context) throw new ApiError(401, "Sessão Lily inválida ou expirada.", { code: "LILY_SESSION_INVALID" });
  return context;
}

export async function rotateLilyCsrf(sessionId: string) {
  const token = crypto.randomBytes(24).toString("base64url");
  await lilyPrisma.lilySession.update({
    where: { id: sessionId },
    data: { csrfTokenHash: hashToken(token) }
  });
  return token;
}

export function requireLilyCsrf(request: FastifyRequest, context: LilySessionContext) {
  const supplied = request.headers["x-lily-csrf"];
  if (typeof supplied !== "string") {
    throw new ApiError(403, "Token CSRF ausente.", { code: "LILY_CSRF_REQUIRED" });
  }
  const actual = hashToken(supplied);
  const expected = context.session.csrfTokenHash;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new ApiError(403, "Token CSRF inválido.", { code: "LILY_CSRF_INVALID" });
  }
}

export function publicLilyUser(user: LilySessionContext["user"]) {
  return {
    id: user.id,
    phone: user.phoneNormalized,
    displayName: user.displayName,
    role: user.role
  };
}

export async function getConsentSnapshot(userId: string) {
  const records = await lilyPrisma.lilyConsentRecord.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" }
  });
  const latest = new Map<string, (typeof records)[number]>();
  for (const record of records) if (!latest.has(record.purpose)) latest.set(record.purpose, record);
  return Object.fromEntries([...latest.entries()].map(([purpose, record]) => [purpose, {
    granted: record.granted,
    version: record.version,
    recordedAt: record.recordedAt,
    revokedAt: record.revokedAt
  }]));
}
