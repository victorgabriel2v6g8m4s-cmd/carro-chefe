import type { FastifyInstance } from "fastify";
import type { Prisma } from "@lily-acai/database";
import { lilyPrisma } from "@lily-acai/database";
import { z } from "zod";
import { ApiError } from "../../lib/errors";
import { requireLilyCourier } from "./admin-security";

const COURIER_LOCATION_MAX_AGE_MS = 90_000;
const DISPATCH_RECHECK_INTERVAL_MS = 5_000;

export const courierAvailabilitySchema = z.object({
  available: z.boolean(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
}).strict().superRefine((value, context) => {
  if (value.available && (value.latitude === undefined || value.longitude === undefined)) {
    context.addIssue({ code: "custom", message: "Ative a localização para ficar disponível." });
  }
});

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function offerNextCourier(tx: Prisma.TransactionClient, orderId: string, now: Date) {
  const [order, settings] = await Promise.all([
    tx.lilyOrder.findUnique({ where: { id: orderId } }),
    tx.lilyOperationalSettings.findUnique({ where: { id: "default" } })
  ]);
  if (!order || order.fulfillmentType !== "delivery" || !settings
    || order.status !== "paid"
    || order.operationStatus !== "ready_for_dispatch"
    || order.deliveryStatus !== "waiting_courier"
    || order.courierUserId || order.offeredCourierUserId
    || !order.dispatchCheckedAt
    || settings.pickupLatitude === null || settings.pickupLatitude === undefined
    || settings.pickupLongitude === null || settings.pickupLongitude === undefined) return null;

  const cutoff = new Date(now.getTime() - COURIER_LOCATION_MAX_AGE_MS);
  const couriers = await tx.lilyUser.findMany({
    where: {
      role: "courier",
      status: "active",
      courierAvailable: true,
      courierLatitude: { not: null },
      courierLongitude: { not: null },
      courierLocationUpdatedAt: { gte: cutoff }
    },
    select: { id: true, courierLatitude: true, courierLongitude: true, courierLocationUpdatedAt: true }
  });
  const attempted = await tx.lilyDeliveryAssignment.findMany({
    where: { orderId, courierUserId: { in: couriers.map((courier) => courier.id) } },
    select: { courierUserId: true }
  });
  const attemptedIds = new Set(attempted.map((assignment) => assignment.courierUserId));
  const pendingOffers = await tx.lilyOrder.findMany({
    where: {
      offeredCourierUserId: { in: couriers.map((courier) => courier.id) },
      courierOfferExpiresAt: { gt: now },
      deliveryStatus: "waiting_courier"
    },
    select: { offeredCourierUserId: true }
  });
  const busyCourierIds = new Set(pendingOffers.flatMap((order) => order.offeredCourierUserId ? [order.offeredCourierUserId] : []));
  const eligible = couriers.filter((courier) => !attemptedIds.has(courier.id) && !busyCourierIds.has(courier.id));
  eligible.sort((left, right) => distanceMeters(
    { latitude: settings.pickupLatitude!, longitude: settings.pickupLongitude! },
    { latitude: left.courierLatitude!, longitude: left.courierLongitude! }
  ) - distanceMeters(
    { latitude: settings.pickupLatitude!, longitude: settings.pickupLongitude! },
    { latitude: right.courierLatitude!, longitude: right.courierLongitude! }
  ));
  const next = eligible[0];
  if (!next) return null;

  const expiresAt = new Date(now.getTime() + settings.courierOfferTimeoutSeconds * 1000);
  const claimed = await tx.lilyOrder.updateMany({
    where: {
      id: orderId,
      status: "paid",
      operationStatus: "ready_for_dispatch",
      deliveryStatus: "waiting_courier",
      courierUserId: null,
      offeredCourierUserId: null
    },
    data: { offeredCourierUserId: next.id, courierOfferExpiresAt: expiresAt, deliveryUpdatedAt: now }
  });
  if (claimed.count !== 1) return null;
  await tx.lilyOrderDeliveryEvent.create({
    data: {
      orderId,
      fromStatus: "waiting_courier",
      toStatus: "waiting_courier",
      actor: "system:courier-dispatch",
      note: "offer_sent",
      createdAt: now
    }
  });
  return { courierUserId: next.id, expiresAt };
}

export async function offerCourierForOrder(orderId: string) {
  return lilyPrisma.$transaction((tx) => offerNextCourier(tx, orderId, new Date()));
}

async function dispatchWaitingOrders() {
  const orders = await lilyPrisma.lilyOrder.findMany({
    where: {
      fulfillmentType: "delivery",
      status: "paid",
      operationStatus: "ready_for_dispatch",
      deliveryStatus: "waiting_courier",
      courierUserId: null,
      offeredCourierUserId: null,
      dispatchCheckedAt: { not: null }
    },
    orderBy: [{ deliveryUpdatedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
    take: 100
  });
  for (const order of orders) await offerCourierForOrder(order.id);
}

async function releaseCourierOffers(userId: string) {
  const now = new Date();
  const orders = await lilyPrisma.lilyOrder.findMany({
    where: { offeredCourierUserId: userId, deliveryStatus: "waiting_courier", courierUserId: null },
    select: { id: true, deliveryUpdatedAt: true },
    take: 100
  });
  for (const order of orders) {
    await lilyPrisma.$transaction(async (tx) => {
      const released = await tx.lilyOrder.updateMany({
        where: { id: order.id, offeredCourierUserId: userId, deliveryStatus: "waiting_courier", courierUserId: null },
        data: { offeredCourierUserId: null, courierOfferExpiresAt: null, deliveryUpdatedAt: now }
      });
      if (released.count !== 1) return;
      await tx.lilyDeliveryAssignment.create({
        data: {
          orderId: order.id,
          courierUserId: userId,
          status: "unavailable",
          assignedBy: "system:courier-dispatch",
          assignedAt: order.deliveryUpdatedAt ?? now,
          endedAt: now,
          endReason: "courier_went_offline"
        }
      });
      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: order.id,
          fromStatus: "waiting_courier",
          toStatus: "waiting_courier",
          actor: "system:courier-dispatch",
          note: "offer_courier_unavailable",
          createdAt: now
        }
      });
      await offerNextCourier(tx, order.id, now);
    });
  }
}

export async function expireCourierOffers() {
  const now = new Date();
  const expired = await lilyPrisma.lilyOrder.findMany({
    where: {
      deliveryStatus: "waiting_courier",
      courierUserId: null,
      offeredCourierUserId: { not: null },
      courierOfferExpiresAt: { lte: now }
    },
    select: { id: true, offeredCourierUserId: true, courierOfferExpiresAt: true, deliveryUpdatedAt: true },
    take: 50
  });
  for (const offer of expired) {
    await lilyPrisma.$transaction(async (tx) => {
      const cleared = await tx.lilyOrder.updateMany({
        where: {
          id: offer.id,
          offeredCourierUserId: offer.offeredCourierUserId,
          courierOfferExpiresAt: { lte: now },
          deliveryStatus: "waiting_courier",
          courierUserId: null
        },
        data: { offeredCourierUserId: null, courierOfferExpiresAt: null, deliveryUpdatedAt: now }
      });
      if (cleared.count !== 1 || !offer.offeredCourierUserId) return;
      await tx.lilyDeliveryAssignment.create({
        data: {
          orderId: offer.id,
          courierUserId: offer.offeredCourierUserId,
          status: "expired",
          assignedBy: "system:courier-dispatch",
          assignedAt: offer.deliveryUpdatedAt ?? now,
          endedAt: now,
          endReason: "offer_timeout"
        }
      });
      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: offer.id,
          fromStatus: "waiting_courier",
          toStatus: "waiting_courier",
          actor: "system:courier-dispatch",
          note: "offer_expired",
          createdAt: now
        }
      });
      await offerNextCourier(tx, offer.id, now);
    });
  }
}

async function expireStaleCourierLocations() {
  const cutoff = new Date(Date.now() - COURIER_LOCATION_MAX_AGE_MS);
  const stale = await lilyPrisma.lilyUser.findMany({
    where: { courierAvailable: true, courierLocationUpdatedAt: { lt: cutoff } },
    select: { id: true },
    take: 100
  });
  for (const courier of stale) {
    await lilyPrisma.lilyUser.updateMany({
      where: { id: courier.id, courierAvailable: true, courierLocationUpdatedAt: { lt: cutoff } },
      data: {
        courierAvailable: false,
        courierLatitude: null,
        courierLongitude: null,
        courierLocationUpdatedAt: null
      }
    });
    await releaseCourierOffers(courier.id);
  }
}

export async function lilyCourierAvailabilityRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/courier/availability", async (request) => {
    const context = await requireLilyCourier(request);
    if (context.user.role !== "courier") throw new ApiError(403, "Somente entregadores podem alterar disponibilidade.", {
      code: "LILY_COURIER_AVAILABILITY_ROLE_REQUIRED"
    });
    const user = await lilyPrisma.lilyUser.findUniqueOrThrow({
      where: { id: context.user.id },
      select: { courierAvailable: true, courierLocationUpdatedAt: true }
    });
    return {
      available: user.courierAvailable && Boolean(user.courierLocationUpdatedAt
        && Date.now() - user.courierLocationUpdatedAt.getTime() <= COURIER_LOCATION_MAX_AGE_MS)
    };
  });

  app.put("/api/v1/lily/courier/availability", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request) => {
    const context = await requireLilyCourier(request, true);
    if (context.user.role !== "courier") throw new ApiError(403, "Somente entregadores podem alterar disponibilidade.", {
      code: "LILY_COURIER_AVAILABILITY_ROLE_REQUIRED"
    });
    const input = courierAvailabilitySchema.parse(request.body);
    const updated = await lilyPrisma.lilyUser.update({
      where: { id: context.user.id },
      data: input.available
        ? {
            courierAvailable: true,
            courierLatitude: input.latitude,
            courierLongitude: input.longitude,
            courierLocationUpdatedAt: new Date()
          }
        : {
            courierAvailable: false,
            courierLatitude: null,
            courierLongitude: null,
            courierLocationUpdatedAt: null
          },
      select: { courierAvailable: true }
    });
    if (input.available) await dispatchWaitingOrders();
    else await releaseCourierOffers(context.user.id);
    return { available: updated.courierAvailable };
  });

  const timer = setInterval(() => {
    void Promise.all([expireCourierOffers(), expireStaleCourierLocations()]).catch(() => undefined);
  }, DISPATCH_RECHECK_INTERVAL_MS);
  timer.unref();
  app.addHook("onClose", async () => clearInterval(timer));
}

export async function ensurePickupConfigured() {
  const settings = await lilyPrisma.lilyOperationalSettings.findUnique({ where: { id: "default" } });
  if (settings?.pickupLatitude == null || settings.pickupLongitude == null) {
    throw new ApiError(409, "Configure as coordenadas do ponto de coleta antes de abrir o despacho.", {
      code: "LILY_PICKUP_COORDINATES_REQUIRED"
    });
  }
}
