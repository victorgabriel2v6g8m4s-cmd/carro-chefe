import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@carro-chefe/database";
import { ApiError } from "../../lib/errors";
import {
  PRELAUNCH_CONSENT_VERSION,
  PRELAUNCH_PRIVACY_POLICY_VERSION,
  normalizeBrazilWhatsappPhone,
  normalizeOptionalFirstName,
  prelaunchEventNames,
  resolveFirstSeenAt,
  sanitizeTrackingValue
} from "./service";

const attributionSchema = z.object({
  ccQr: z.string().max(120).nullable().optional(),
  ccCampaign: z.string().max(120).nullable().optional(),
  ccVariant: z.string().max(120).nullable().optional()
}).default({});

const signupSchema = z.object({
  phone: z.string().trim().min(8).max(40),
  firstName: z.string().trim().max(80).nullable().optional(),
  marketingConsent: z.literal(true),
  consentVersion: z.literal(PRELAUNCH_CONSENT_VERSION),
  privacyPolicyVersion: z.literal(PRELAUNCH_PRIVACY_POLICY_VERSION),
  firstSeenAt: z.string().datetime({ offset: true }).nullable().optional(),
  attribution: attributionSchema,
  website: z.string().max(200).optional().default("")
});

const analyticsMetadataSchema = z.object({
  experiment: z.string().max(80).nullable().optional(),
  ctaVariant: z.string().max(80).nullable().optional(),
  formPosition: z.string().max(80).nullable().optional(),
  hasProductMedia: z.boolean().nullable().optional(),
  section: z.enum(["hero", "reward", "product_teaser", "brand_story", "social"]).nullable().optional()
}).strict().default({});

const analyticsEventSchema = z.object({
  sessionId: z.string().trim().regex(/^[A-Za-z0-9_-]{16,96}$/),
  event: z.enum(prelaunchEventNames),
  path: z.string().trim().startsWith("/").max(240),
  attribution: attributionSchema,
  metadata: analyticsMetadataSchema
});

function cleanAttribution(input: z.infer<typeof attributionSchema>) {
  return {
    ccQr: sanitizeTrackingValue(input.ccQr),
    ccCampaign: sanitizeTrackingValue(input.ccCampaign),
    ccVariant: sanitizeTrackingValue(input.ccVariant)
  };
}

export async function prelaunchRoutes(app: any) {
  app.get("/api/v1/public/prelaunch/config", async () => ({
    consentVersion: PRELAUNCH_CONSENT_VERSION,
    privacyPolicyVersion: PRELAUNCH_PRIVACY_POLICY_VERSION
  }));

  app.post("/api/v1/public/prelaunch/signup", {
    config: { rateLimit: { max: 12, timeWindow: "1 minute" } }
  }, async (request: any, reply: any) => {
    const input = signupSchema.parse(request.body);

    // Honeypot: para não ensinar automação a detectar a armadilha, simulamos
    // a mesma resposta de sucesso sem persistir qualquer dado.
    if (input.website.trim()) return reply.code(201).send({ status: "created" });

    const phoneNormalized = normalizeBrazilWhatsappPhone(input.phone);
    if (!phoneNormalized) {
      throw new ApiError(400, "Confira o número. Digite DDD + telefone, por exemplo (67) 99204-6721.", { code: "INVALID_PHONE" });
    }

    const existing = await prisma.prelaunchLead.findUnique({ where: { phoneNormalized } });
    if (existing) return reply.send({ status: "duplicate" });

    const now = new Date();
    const attribution = cleanAttribution(input.attribution);

    try {
      await prisma.prelaunchLead.create({
        data: {
          phoneNormalized,
          firstName: normalizeOptionalFirstName(input.firstName),
          marketingConsentAt: now,
          consentVersion: input.consentVersion,
          privacyPolicyVersion: input.privacyPolicyVersion,
          ccQr: attribution.ccQr,
          ccCampaign: attribution.ccCampaign,
          ccVariant: attribution.ccVariant,
          firstSeenAt: resolveFirstSeenAt(input.firstSeenAt, now),
          signupAt: now,
          status: "active"
        }
      });
      return reply.code(201).send({ status: "created" });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") return reply.send({ status: "duplicate" });
      throw error;
    }
  });

  app.post("/api/v1/public/prelaunch/events", {
    config: { rateLimit: { max: 180, timeWindow: "1 minute" } }
  }, async (request: any, reply: any) => {
    const input = analyticsEventSchema.parse(request.body);
    const attribution = cleanAttribution(input.attribution);

    await prisma.prelaunchAnalyticsEvent.create({
      data: {
        sessionId: input.sessionId,
        event: input.event,
        ccQr: attribution.ccQr,
        ccCampaign: attribution.ccCampaign,
        ccVariant: attribution.ccVariant,
        path: input.path,
        metadataJson: JSON.stringify(input.metadata),
        requestId: randomUUID()
      }
    });

    return reply.code(202).send({ accepted: true });
  });
}
