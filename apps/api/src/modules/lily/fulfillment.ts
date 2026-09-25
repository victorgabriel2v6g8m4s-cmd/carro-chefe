import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";

const SETTINGS_ID = "default";
const moneySchema = z.number().int().min(0).max(10_000_000);
const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const strategySchema = z.enum(["flat", "zone"]);

export const lilyBusinessHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: timeSchema,
  closesAt: timeSchema
}).strict().refine((value) => value.opensAt < value.closesAt, {
  message: "Horário de fechamento deve ser posterior ao de abertura."
});

const businessHoursSchema = z.array(lilyBusinessHourSchema).max(21);

const settingsPatchSchema = z.object({
  ordersEnabled: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  minimumOrderCents: moneySchema.optional(),
  deliveryStrategy: strategySchema.optional(),
  flatDeliveryFeeCents: moneySchema.optional(),
  pickupAddressText: z.string().trim().max(500).nullable().optional(),
  pickupInstructions: z.string().trim().max(1000).nullable().optional(),
  instagramHandle: z.string().trim().min(1).max(30).regex(/^@?[A-Za-z0-9._]+$/).optional(),
  whatsappPhone: z.string().trim().min(8).max(24).regex(/^\+?[0-9 ()-]+$/).optional(),
  publicAddressText: z.string().trim().max(500).nullable().optional(),
  loyaltyOrderCentsPerPoint: z.number().int().min(1).max(100000).optional(),
  loyaltyCampaignBonusPoints: z.number().int().min(0).max(100000).optional(),
  loyaltyCouponBonusPoints: z.number().int().min(0).max(100000).optional(),
  businessHours: businessHoursSchema.optional(),
  timezone: z.literal("America/Campo_Grande").optional()
}).strict();

const zoneCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  status: z.enum(["active", "paused"]).default("active"),
  feeCents: moneySchema,
  minimumOrderCents: moneySchema.default(0),
  neighborhoods: z.array(z.string().trim().min(2).max(120)).max(120).default([]),
  postalCodePrefixes: z.array(z.string().trim().min(3).max(8)).max(120).default([]),
  sortOrder: z.number().int().min(-10000).max(10000).default(0)
}).strict();

const zonePatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["active", "paused"]).optional(),
  feeCents: moneySchema.optional(),
  minimumOrderCents: moneySchema.optional(),
  neighborhoods: z.array(z.string().trim().min(2).max(120)).max(120).optional(),
  postalCodePrefixes: z.array(z.string().trim().min(3).max(8)).max(120).optional(),
  sortOrder: z.number().int().min(-10000).max(10000).optional()
}).strict();

type BusinessHour = z.infer<typeof lilyBusinessHourSchema>;

function safeStringArray(input: string) {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseBusinessHours(input: string): BusinessHour[] {
  try {
    const parsed = businessHoursSchema.safeParse(JSON.parse(input));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

const weekdayIndex: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
};

function localClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    dayOfWeek: weekdayIndex[part("weekday")] ?? -1,
    minuteOfDay: Number(part("hour")) * 60 + Number(part("minute"))
  };
}

export async function getLilyOperationalSettings() {
  return lilyPrisma.lilyOperationalSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID }
  });
}

export function lilyOpenNow(
  settings: Awaited<ReturnType<typeof getLilyOperationalSettings>>,
  now = new Date()
) {
  const hours = parseBusinessHours(settings.businessHoursJson);
  if (!hours.length) return false;
  try {
    const clock = localClock(now, settings.timezone);
    return hours.some((window) =>
      window.dayOfWeek === clock.dayOfWeek
      && clock.minuteOfDay >= minutes(window.opensAt)
      && clock.minuteOfDay <= minutes(window.closesAt)
    );
  } catch {
    return false;
  }
}

function normalizeNeighborhood(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizePostal(value: string) {
  return value.replace(/\D/g, "");
}

function serializeZone(zone: {
  id: string;
  name: string;
  status: string;
  feeCents: number;
  minimumOrderCents: number;
  neighborhoodsJson: string;
  postalCodePrefixesJson: string;
  sortOrder: number;
}) {
  return {
    id: zone.id,
    name: zone.name,
    status: zone.status,
    feeCents: zone.feeCents,
    minimumOrderCents: zone.minimumOrderCents,
    neighborhoods: safeStringArray(zone.neighborhoodsJson),
    postalCodePrefixes: safeStringArray(zone.postalCodePrefixesJson),
    sortOrder: zone.sortOrder
  };
}

export async function resolveLilyFulfillment(
  fulfillmentType: "pickup" | "delivery",
  address?: { postalCode: string; neighborhood: string }
) {
  const settings = await getLilyOperationalSettings();
  if (!settings.ordersEnabled) {
    throw new ApiError(409, "Pedidos online estão pausados no momento.", { code: "LILY_ORDERS_DISABLED" });
  }
  if (!lilyOpenNow(settings)) {
    throw new ApiError(409, "A CookLily está fora do horário configurado para pedidos.", { code: "LILY_OUTSIDE_BUSINESS_HOURS" });
  }

  if (fulfillmentType === "pickup") {
    if (!settings.pickupEnabled) {
      throw new ApiError(409, "Retirada não está disponível no momento.", { code: "LILY_PICKUP_DISABLED" });
    }
    return {
      fulfillmentType,
      deliveryFeeCents: 0,
      minimumOrderCents: settings.minimumOrderCents,
      deliveryZone: null,
      pickupAddressText: settings.pickupAddressText,
      pickupInstructions: settings.pickupInstructions
    };
  }

  if (!settings.deliveryEnabled) {
    throw new ApiError(409, "Entrega não está disponível no momento.", { code: "LILY_DELIVERY_DISABLED" });
  }
  if (!address) {
    throw new ApiError(400, "Endereço é obrigatório para entrega.", { code: "LILY_DELIVERY_ADDRESS_REQUIRED" });
  }

  if (settings.deliveryStrategy === "flat") {
    return {
      fulfillmentType,
      deliveryFeeCents: settings.flatDeliveryFeeCents,
      minimumOrderCents: settings.minimumOrderCents,
      deliveryZone: null,
      pickupAddressText: null,
      pickupInstructions: null
    };
  }

  const zones = await lilyPrisma.lilyDeliveryZone.findMany({
    where: { status: "active" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  const neighborhood = normalizeNeighborhood(address.neighborhood);
  const postalCode = normalizePostal(address.postalCode);
  const zone = zones.find((candidate) => {
    const neighborhoods = safeStringArray(candidate.neighborhoodsJson).map(normalizeNeighborhood);
    const prefixes = safeStringArray(candidate.postalCodePrefixesJson).map(normalizePostal).filter(Boolean);
    return neighborhoods.includes(neighborhood) || prefixes.some((prefix) => postalCode.startsWith(prefix));
  });
  if (!zone) {
    throw new ApiError(422, "Endereço fora das regiões de entrega configuradas.", { code: "LILY_DELIVERY_ZONE_NOT_FOUND" });
  }

  return {
    fulfillmentType,
    deliveryFeeCents: zone.feeCents,
    minimumOrderCents: Math.max(settings.minimumOrderCents, zone.minimumOrderCents),
    deliveryZone: { id: zone.id, name: zone.name },
    pickupAddressText: null,
    pickupInstructions: null
  };
}

export async function lilyFulfillmentRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/fulfillment", async () => {
    const settings = await getLilyOperationalSettings();
    const zones = await lilyPrisma.lilyDeliveryZone.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return {
      ordersEnabled: settings.ordersEnabled,
      pickupEnabled: settings.pickupEnabled,
      deliveryEnabled: settings.deliveryEnabled,
      minimumOrderCents: settings.minimumOrderCents,
      deliveryStrategy: settings.deliveryStrategy,
      flatDeliveryFeeCents: settings.flatDeliveryFeeCents,
      pickupAddressText: settings.pickupAddressText,
      pickupInstructions: settings.pickupInstructions,
      businessHours: parseBusinessHours(settings.businessHoursJson),
      timezone: settings.timezone,
      openNow: lilyOpenNow(settings),
      zones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        feeCents: zone.feeCents,
        minimumOrderCents: zone.minimumOrderCents
      }))
    };
  });

  app.get("/api/v1/lily/admin/fulfillment", async (request) => {
    await requireLilyStaff(request);
    const settings = await getLilyOperationalSettings();
    const zones = await lilyPrisma.lilyDeliveryZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return {
      settings: { ...settings, businessHours: parseBusinessHours(settings.businessHoursJson) },
      zones: zones.map(serializeZone)
    };
  });

  app.patch("/api/v1/lily/admin/fulfillment", async (request) => {
    const context = await requireLilyStaff(request, true);
    const input = settingsPatchSchema.parse(request.body);
    const current = await getLilyOperationalSettings();
    const businessHours = input.businessHours ?? parseBusinessHours(current.businessHoursJson);
    const merged = { ...current, ...input };

    if (merged.ordersEnabled && !merged.pickupEnabled && !merged.deliveryEnabled) {
      throw new ApiError(400, "Habilite retirada ou entrega antes de abrir pedidos.", { code: "LILY_FULFILLMENT_REQUIRED" });
    }
    if (merged.ordersEnabled && businessHours.length === 0) {
      throw new ApiError(400, "Configure pelo menos um horário antes de abrir pedidos.", { code: "LILY_BUSINESS_HOURS_REQUIRED" });
    }
    if (merged.pickupEnabled && !merged.pickupAddressText?.trim()) {
      throw new ApiError(400, "Informe o endereço de retirada antes de habilitá-la.", { code: "LILY_PICKUP_ADDRESS_REQUIRED" });
    }

    const updated = await lilyPrisma.lilyOperationalSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(input.ordersEnabled === undefined ? {} : { ordersEnabled: input.ordersEnabled }),
        ...(input.pickupEnabled === undefined ? {} : { pickupEnabled: input.pickupEnabled }),
        ...(input.deliveryEnabled === undefined ? {} : { deliveryEnabled: input.deliveryEnabled }),
        ...(input.minimumOrderCents === undefined ? {} : { minimumOrderCents: input.minimumOrderCents }),
        ...(input.deliveryStrategy === undefined ? {} : { deliveryStrategy: input.deliveryStrategy }),
        ...(input.flatDeliveryFeeCents === undefined ? {} : { flatDeliveryFeeCents: input.flatDeliveryFeeCents }),
        ...(input.pickupAddressText === undefined ? {} : { pickupAddressText: input.pickupAddressText || null }),
        ...(input.pickupInstructions === undefined ? {} : { pickupInstructions: input.pickupInstructions || null }),
        ...(input.instagramHandle === undefined ? {} : { instagramHandle: input.instagramHandle.replace(/^@+/, "") }),
        ...(input.whatsappPhone === undefined ? {} : { whatsappPhone: input.whatsappPhone.trim() }),
        ...(input.publicAddressText === undefined ? {} : { publicAddressText: input.publicAddressText || null }),
        ...(input.loyaltyOrderCentsPerPoint === undefined ? {} : { loyaltyOrderCentsPerPoint: input.loyaltyOrderCentsPerPoint }),
        ...(input.loyaltyCampaignBonusPoints === undefined ? {} : { loyaltyCampaignBonusPoints: input.loyaltyCampaignBonusPoints }),
        ...(input.loyaltyCouponBonusPoints === undefined ? {} : { loyaltyCouponBonusPoints: input.loyaltyCouponBonusPoints }),
        ...(input.businessHours === undefined ? {} : { businessHoursJson: JSON.stringify(input.businessHours) }),
        ...(input.timezone === undefined ? {} : { timezone: input.timezone })
      }
    });
    await auditLilyAdmin(context.user.id, "update", "fulfillment-settings", SETTINGS_ID, input);
    return { ...updated, businessHours: parseBusinessHours(updated.businessHoursJson) };
  });

  app.post("/api/v1/lily/admin/delivery-zones", async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const input = zoneCreateSchema.parse(request.body);
    const created = await lilyPrisma.lilyDeliveryZone.create({
      data: {
        name: input.name,
        status: input.status,
        feeCents: input.feeCents,
        minimumOrderCents: input.minimumOrderCents,
        neighborhoodsJson: JSON.stringify([...new Set(input.neighborhoods)]),
        postalCodePrefixesJson: JSON.stringify([...new Set(input.postalCodePrefixes.map(normalizePostal).filter(Boolean))]),
        sortOrder: input.sortOrder
      }
    });
    await auditLilyAdmin(context.user.id, "create", "delivery-zone", created.id, input);
    return reply.code(201).send(serializeZone(created));
  });

  app.patch("/api/v1/lily/admin/delivery-zones/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const input = zonePatchSchema.parse(request.body);
    const existing = await lilyPrisma.lilyDeliveryZone.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Região de entrega não encontrada.");

    const updated = await lilyPrisma.lilyDeliveryZone.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.status === undefined ? {} : { status: input.status }),
        ...(input.feeCents === undefined ? {} : { feeCents: input.feeCents }),
        ...(input.minimumOrderCents === undefined ? {} : { minimumOrderCents: input.minimumOrderCents }),
        ...(input.neighborhoods === undefined ? {} : { neighborhoodsJson: JSON.stringify([...new Set(input.neighborhoods)]) }),
        ...(input.postalCodePrefixes === undefined ? {} : {
          postalCodePrefixesJson: JSON.stringify([...new Set(input.postalCodePrefixes.map(normalizePostal).filter(Boolean))])
        }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder })
      }
    });
    await auditLilyAdmin(context.user.id, "update", "delivery-zone", id, input);
    return serializeZone(updated);
  });
}
