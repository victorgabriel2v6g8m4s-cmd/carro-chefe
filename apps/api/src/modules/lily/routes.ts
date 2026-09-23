import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { COOKLILY_ATTRIBUTION_PARAMS } from "./attribution";
import {
  LILY_ANALYTICS_VERSION,
  LILY_MARKETING_VERSION,
  LILY_PRIVACY_VERSION,
  LILY_SHARE_VERSION,
  LILY_TERMS_VERSION,
  clearLilySessionCookie,
  createLilySession,
  getConsentSnapshot,
  hashPassword,
  normalizeLilyPhone,
  publicLilyUser,
  requireLilyCsrf,
  requireLilySession,
  rotateLilyCsrf,
  verifyPassword
} from "./auth";

const optionalName = z.string().trim().min(1).max(80).optional().nullable();
const password = z.string().min(10).max(128);
const phone = z.string().trim().min(8).max(40);

const registerSchema = z.object({
  phone,
  password,
  displayName: optionalName,
  termsAccepted: z.literal(true),
  termsVersion: z.literal(LILY_TERMS_VERSION),
  privacyPolicyVersion: z.literal(LILY_PRIVACY_VERSION),
  consents: z.object({
    lilyMarketing: z.boolean().default(false),
    shareWithCarroChefe: z.boolean().default(false),
    analyticsOptional: z.boolean().default(false)
  }).default({
    lilyMarketing: false,
    shareWithCarroChefe: false,
    analyticsOptional: false
  })
}).strict();

const loginSchema = z.object({ phone, password }).strict();

function normalizeDisplayName(input?: string | null) {
  if (!input) return null;
  const normalized = input.trim().replace(/\s+/g, " ").slice(0, 80);
  return normalized || null;
}

function consentRows(userId: string, input: z.infer<typeof registerSchema>) {
  const now = new Date();
  return [
    {
      userId,
      purpose: "terms_required",
      version: `${input.termsVersion}+${input.privacyPolicyVersion}`,
      granted: true,
      source: "register",
      recordedAt: now
    },
    {
      userId,
      purpose: "lily_marketing",
      version: LILY_MARKETING_VERSION,
      granted: input.consents.lilyMarketing,
      source: "register",
      recordedAt: now
    },
    {
      userId,
      purpose: "share_with_carro_chefe",
      version: LILY_SHARE_VERSION,
      granted: input.consents.shareWithCarroChefe,
      source: "register",
      recordedAt: now
    },
    {
      userId,
      purpose: "analytics_optional",
      version: LILY_ANALYTICS_VERSION,
      granted: input.consents.analyticsOptional,
      source: "register",
      recordedAt: now
    }
  ];
}

export async function lilyRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/health", async () => {
    await lilyPrisma.$queryRawUnsafe("SELECT 1");
    return { status: "ok", service: "lily-acai" };
  });

  app.get("/api/v1/lily/public/config", async () => ({
    termsVersion: LILY_TERMS_VERSION,
    privacyPolicyVersion: LILY_PRIVACY_VERSION,
    consentVersions: {
      lilyMarketing: LILY_MARKETING_VERSION,
      shareWithCarroChefe: LILY_SHARE_VERSION,
      analyticsOptional: LILY_ANALYTICS_VERSION
    },
    brand: {
      name: "CookLily",
      wordmark: "cookLily"
    },
    social: {
      instagram: "acai._lily",
      whatsapp: "+5567999289187"
    },
    tracking: {
      canonical: { qr: "la_qr", campaign: "la_campaign", variant: "la_variant" },
      acceptedAliases: COOKLILY_ATTRIBUTION_PARAMS,
      precedence: "la_* over cc_*"
    }
  }));

  app.post("/api/v1/lily/auth/register", {
    config: { rateLimit: { max: 8, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const phoneNormalized = normalizeLilyPhone(input.phone);
    if (!phoneNormalized) throw new ApiError(400, "Telefone inválido.", { code: "LILY_INVALID_PHONE" });

    const existing = await lilyPrisma.lilyUser.findUnique({ where: { phoneNormalized } });
    if (existing) throw new ApiError(409, "Já existe uma conta CookLily para este telefone.", { code: "LILY_PHONE_EXISTS" });

    const passwordHash = await hashPassword(input.password);
    let created: { id: string; phoneNormalized: string; displayName: string | null; role: string; status: string };
    try {
      created = await lilyPrisma.$transaction(async (tx) => {
        const user = await tx.lilyUser.create({
          data: {
            phoneNormalized,
            passwordHash,
            displayName: normalizeDisplayName(input.displayName),
            role: "customer",
            status: "active"
          }
        });
        await tx.lilyConsentRecord.createMany({ data: consentRows(user.id, input) });
        return user;
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new ApiError(409, "Já existe uma conta CookLily para este telefone.", { code: "LILY_PHONE_EXISTS" });
      }
      throw error;
    }

    const session = await createLilySession(created.id, request, reply);
    const consents = await getConsentSnapshot(created.id);
    return reply.code(201).send({
      user: publicLilyUser(created),
      csrfToken: session.csrfToken,
      sessionExpiresAt: session.expiresAt,
      consents
    });
  });

  app.post("/api/v1/lily/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const phoneNormalized = normalizeLilyPhone(input.phone);
    if (!phoneNormalized) throw new ApiError(401, "Telefone ou senha inválidos.", { code: "LILY_INVALID_CREDENTIALS" });

    const user = await lilyPrisma.lilyUser.findUnique({ where: { phoneNormalized } });
    if (!user || user.status !== "active" || !await verifyPassword(input.password, user.passwordHash)) {
      throw new ApiError(401, "Telefone ou senha inválidos.", { code: "LILY_INVALID_CREDENTIALS" });
    }
    const session = await createLilySession(user.id, request, reply);
    return {
      user: publicLilyUser(user),
      csrfToken: session.csrfToken,
      sessionExpiresAt: session.expiresAt,
      consents: await getConsentSnapshot(user.id)
    };
  });

  app.get("/api/v1/lily/auth/me", async (request) => {
    const context = await requireLilySession(request);
    const csrfToken = await rotateLilyCsrf(context.session.id);
    return {
      user: publicLilyUser(context.user),
      csrfToken,
      sessionExpiresAt: context.session.expiresAt,
      consents: await getConsentSnapshot(context.user.id)
    };
  });

  app.post("/api/v1/lily/auth/logout", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    await lilyPrisma.lilySession.update({
      where: { id: context.session.id },
      data: { revokedAt: new Date() }
    });
    clearLilySessionCookie(request, reply);
    return reply.code(204).send();
  });
}
