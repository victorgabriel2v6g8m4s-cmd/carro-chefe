import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { lilyAttributionInputSchema, normalizeLilyAttribution } from "./attribution";
import { requireLilyStaff } from "./admin-security";

export const LILY_ANALYTICS_CONSENT_VERSION = "cooklily-analytics-v1";

export const LILY_ANALYTICS_EVENTS = [
  "page_view",
  "catalog_view",
  "product_view",
  "product_configured",
  "combo_view",
  "combo_configured",
  "add_to_cart",
  "cart_view",
  "checkout_start",
  "order_created",
  "payment_start",
  "payment_confirmed",
  "instagram_click",
  "whatsapp_click",
  "privacy_open",
  "analytics_consent_granted"
] as const;

const surfaceSchema = z.enum([
  "landing",
  "catalog",
  "product",
  "combo",
  "cart",
  "checkout",
  "payment",
  "account",
  "ranking",
  "privacy"
]);

const slugSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,119}$/);
const pathSchema = z.string().trim().startsWith("/").max(240)
  .refine((value) => !value.includes("?") && !value.includes("#"), "O path analítico não pode conter query ou fragment.");

const analyticsMetadataSchema = z.object({
  surface: surfaceSchema.optional(),
  productSlug: slugSchema.optional(),
  comboSlug: slugSchema.optional(),
  variantSizeMl: z.number().int().min(50).max(5000).optional(),
  addonCount: z.number().int().min(0).max(100).optional(),
  itemCount: z.number().int().min(0).max(200).optional(),
  fulfillmentType: z.enum(["pickup", "delivery"]).optional(),
  paymentMethod: z.enum(["pix", "manual_pix", "card"]).optional()
}).strict().default({});

const analyticsEventSchema = z.object({
  eventId: z.string().uuid(),
  sessionId: z.string().uuid(),
  event: z.enum(LILY_ANALYTICS_EVENTS),
  consentVersion: z.literal(LILY_ANALYTICS_CONSENT_VERSION),
  path: pathSchema,
  attribution: lilyAttributionInputSchema.default({}),
  metadata: analyticsMetadataSchema
}).strict();

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
  campaign: z.string().trim().min(1).max(120).optional(),
  includeHomologation: z.coerce.boolean().optional().default(false)
});

const funnelEvents = [
  "catalog_view",
  "product_view",
  "add_to_cart",
  "checkout_start",
  "order_created",
  "payment_confirmed"
] as const;

function aggregateProductEvents(rows: Array<{ productSlug: string | null; event: string; _count: { _all: number } }>) {
  const products = new Map<string, { productSlug: string; views: number; addToCart: number }>();
  for (const row of rows) {
    if (!row.productSlug) continue;
    const current = products.get(row.productSlug) ?? { productSlug: row.productSlug, views: 0, addToCart: 0 };
    if (row.event === "product_view") current.views += row._count._all;
    if (row.event === "add_to_cart") current.addToCart += row._count._all;
    products.set(row.productSlug, current);
  }
  return [...products.values()]
    .sort((a, b) => b.addToCart - a.addToCart || b.views - a.views || a.productSlug.localeCompare(b.productSlug))
    .slice(0, 50);
}

export async function lilyAnalyticsRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/public/analytics/events", {
    config: { rateLimit: { max: 180, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const input = analyticsEventSchema.parse(request.body);
    const attribution = normalizeLilyAttribution(input.attribution);

    await lilyPrisma.lilyAnalyticsEvent.upsert({
      where: { eventId: input.eventId },
      update: {},
      create: {
        eventId: input.eventId,
        sessionId: input.sessionId,
        event: input.event,
        path: input.path,
        laQr: attribution.laQr,
        laCampaign: attribution.laCampaign,
        laVariant: attribution.laVariant,
        surface: input.metadata.surface ?? null,
        productSlug: input.metadata.productSlug ?? null,
        comboSlug: input.metadata.comboSlug ?? null,
        variantSizeMl: input.metadata.variantSizeMl ?? null,
        addonCount: input.metadata.addonCount ?? null,
        itemCount: input.metadata.itemCount ?? null,
        fulfillmentType: input.metadata.fulfillmentType ?? null,
        paymentMethod: input.metadata.paymentMethod ?? null,
        metadataJson: JSON.stringify(input.metadata)
      }
    });

    return reply.code(202).send({ accepted: true });
  });

  app.get("/api/v1/lily/admin/analytics/summary", async (request) => {
    await requireLilyStaff(request);
    const query = summaryQuerySchema.parse(request.query);
    const now = new Date();
    const from = new Date(now.getTime() - query.days * 24 * 60 * 60 * 1000);

    const eventWhere = {
      createdAt: { gte: from, lte: now },
      ...(query.campaign ? { laCampaign: query.campaign } : {})
    };

    const orderWhere = {
      createdAt: { gte: from, lte: now },
      ...(query.campaign ? { laCampaign: query.campaign } : {}),
      ...(query.includeHomologation ? {} : { isHomologation: false })
    };

    const [
      eventCounts,
      attributionGroups,
      productGroups,
      orderAggregate,
      paidAggregate,
      funnelSessionRows
    ] = await Promise.all([
      lilyPrisma.lilyAnalyticsEvent.groupBy({
        by: ["event"],
        where: eventWhere,
        _count: { _all: true }
      }),
      lilyPrisma.lilyAnalyticsEvent.groupBy({
        by: ["laCampaign", "laQr", "laVariant"],
        where: eventWhere,
        _count: { _all: true }
      }),
      lilyPrisma.lilyAnalyticsEvent.groupBy({
        by: ["productSlug", "event"],
        where: {
          ...eventWhere,
          productSlug: { not: null },
          event: { in: ["product_view", "add_to_cart"] }
        },
        _count: { _all: true }
      }),
      lilyPrisma.lilyOrder.aggregate({
        where: orderWhere,
        _count: { _all: true },
        _sum: { grandTotalCents: true }
      }),
      lilyPrisma.lilyOrder.aggregate({
        where: { ...orderWhere, paidAt: { not: null } },
        _count: { _all: true },
        _sum: { grandTotalCents: true }
      }),
      Promise.all(funnelEvents.map(async (event) => ({
        event,
        sessions: (await lilyPrisma.lilyAnalyticsEvent.findMany({
          where: { ...eventWhere, event },
          select: { sessionId: true },
          distinct: ["sessionId"]
        })).length
      })))
    ]);

    const attribution = attributionGroups
      .map((row) => ({
        campaign: row.laCampaign,
        qr: row.laQr,
        variant: row.laVariant,
        events: row._count._all
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 50);

    return {
      generatedAt: now,
      window: { from, to: now, days: query.days },
      filters: {
        campaign: query.campaign ?? null,
        includeHomologation: query.includeHomologation
      },
      events: Object.fromEntries(eventCounts.map((row) => [row.event, row._count._all])),
      funnel: funnelSessionRows,
      attribution,
      products: aggregateProductEvents(productGroups),
      orders: {
        created: orderAggregate._count._all,
        grossOrderValueCents: orderAggregate._sum.grandTotalCents ?? 0,
        paid: paidAggregate._count._all,
        paidGrossCents: paidAggregate._sum.grandTotalCents ?? 0
      }
    };
  });
}
