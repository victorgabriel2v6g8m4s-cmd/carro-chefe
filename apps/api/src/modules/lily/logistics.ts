import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyCourier } from "./admin-security";
import { getLilyOperationalSettings } from "./fulfillment";
import {
  lilyLogisticsCodeConfiguration,
  verifyLilyOrderSecurityCode
} from "./logistics-codes";

const idSchema = z.string().trim().min(1).max(120);

export const LILY_DELIVERY_STATUSES = [
  "not_ready",
  "waiting_courier",
  "courier_accepted",
  "courier_arrived_pickup",
  "picked_up",
  "left_pickup",
  "courier_arrived_delivery",
  "delivered",
  "left_delivery",
  "cancelled"
] as const;

type DeliveryStatus = typeof LILY_DELIVERY_STATUSES[number];

const transitionSchema = z.object({
  action: z.enum([
    "arrived_pickup",
    "confirm_pickup",
    "left_pickup",
    "arrived_delivery",
    "confirm_delivery",
    "left_delivery"
  ]),
  code: z.string().trim().regex(/^\d{6}$/).optional(),
  note: z.string().trim().max(300).nullable().optional()
}).strict();

const deliveryInclude = {
  items: { select: { id: true, quantity: true } },
  deliveryEvents: { orderBy: { createdAt: "asc" as const } }
};

function parseAddress(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function publicAddress(address: Record<string, unknown> | null) {
  if (!address) return null;
  return {
    neighborhood: typeof address.neighborhood === "string" ? address.neighborhood : null,
    city: typeof address.city === "string" ? address.city : null,
    state: typeof address.state === "string" ? address.state : null
  };
}

function fullAddress(address: Record<string, unknown> | null) {
  if (!address) return null;
  return {
    postalCode: typeof address.postalCode === "string" ? address.postalCode : null,
    street: typeof address.street === "string" ? address.street : null,
    number: typeof address.number === "string" ? address.number : null,
    complement: typeof address.complement === "string" ? address.complement : null,
    neighborhood: typeof address.neighborhood === "string" ? address.neighborhood : null,
    city: typeof address.city === "string" ? address.city : null,
    state: typeof address.state === "string" ? address.state : null,
    reference: typeof address.reference === "string" ? address.reference : null
  };
}

function serializeDelivery(order: any, actorUserId: string) {
  const address = parseAddress(order.addressSnapshotJson);
  const assignedToActor = order.courierUserId === actorUserId;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    financialStatus: order.status,
    operationStatus: order.operationStatus,
    deliveryStatus: order.deliveryStatus,
    deliveryUpdatedAt: order.deliveryUpdatedAt,
    courierUserId: assignedToActor ? order.courierUserId : null,
    assignedToMe: assignedToActor,
    isHomologation: order.isHomologation,
    itemCount: order.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
    createdAt: order.createdAt,
    destination: assignedToActor ? fullAddress(address) : publicAddress(address),
    deliveryEvents: order.deliveryEvents.map((event: any) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      note: event.note,
      createdAt: event.createdAt
    }))
  };
}

function nextStatusForAction(current: DeliveryStatus, action: z.infer<typeof transitionSchema>["action"]) {
  const expected: Record<z.infer<typeof transitionSchema>["action"], [DeliveryStatus, DeliveryStatus]> = {
    arrived_pickup: ["courier_accepted", "courier_arrived_pickup"],
    confirm_pickup: ["courier_arrived_pickup", "picked_up"],
    left_pickup: ["picked_up", "left_pickup"],
    arrived_delivery: ["left_pickup", "courier_arrived_delivery"],
    confirm_delivery: ["courier_arrived_delivery", "delivered"],
    left_delivery: ["delivered", "left_delivery"]
  };
  const [required, next] = expected[action];
  if (current !== required) {
    throw new ApiError(409, "Esta ação não corresponde à etapa atual da entrega.", {
      code: "LILY_DELIVERY_TRANSITION_INVALID",
      deliveryStatus: current,
      action,
      requiredStatus: required
    });
  }
  return next;
}

async function assignedOrder(orderId: string, courierUserId: string) {
  const order = await lilyPrisma.lilyOrder.findFirst({
    where: {
      id: orderId,
      fulfillmentType: "delivery",
      courierUserId
    },
    include: deliveryInclude
  });
  if (!order) {
    throw new ApiError(404, "Entrega não encontrada para esta conta.", {
      code: "LILY_COURIER_DELIVERY_NOT_FOUND"
    });
  }
  return order;
}

export async function lilyLogisticsRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/courier/deliveries", async (request) => {
    const context = await requireLilyCourier(request);
    const query = z.object({
      includeFinished: z.coerce.boolean().optional().default(false),
      limit: z.coerce.number().int().min(1).max(100).default(50)
    }).parse(request.query);

    const activeMineStatuses = query.includeFinished
      ? LILY_DELIVERY_STATUSES.filter((status) => status !== "not_ready")
      : LILY_DELIVERY_STATUSES.filter((status) => !["not_ready", "left_delivery", "cancelled"].includes(status));

    const [available, mine, settings] = await Promise.all([
      lilyPrisma.lilyOrder.findMany({
        where: {
          fulfillmentType: "delivery",
          operationStatus: "ready_for_dispatch",
          status: "paid",
          deliveryStatus: "waiting_courier",
          courierUserId: null
        },
        include: deliveryInclude,
        orderBy: [{ deliveryUpdatedAt: "asc" }, { createdAt: "asc" }],
        take: query.limit
      }),
      lilyPrisma.lilyOrder.findMany({
        where: {
          fulfillmentType: "delivery",
          courierUserId: context.user.id,
          deliveryStatus: { in: activeMineStatuses }
        },
        include: deliveryInclude,
        orderBy: [{ deliveryUpdatedAt: "desc" }, { createdAt: "desc" }],
        take: query.limit
      }),
      getLilyOperationalSettings()
    ]);

    return {
      pickupAddressText: settings.pickupAddressText,
      logisticsCodesReady: lilyLogisticsCodeConfiguration().ready,
      available: available.map((order) => serializeDelivery(order, context.user.id)),
      mine: mine.map((order) => serializeDelivery(order, context.user.id))
    };
  });

  app.post("/api/v1/lily/courier/deliveries/:id/accept", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } }
  }, async (request) => {
    const context = await requireLilyCourier(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const now = new Date();

    const result = await lilyPrisma.$transaction(async (tx) => {
      const claimed = await tx.lilyOrder.updateMany({
        where: {
          id,
          fulfillmentType: "delivery",
          status: "paid",
          operationStatus: "ready_for_dispatch",
          deliveryStatus: "waiting_courier",
          courierUserId: null
        },
        data: {
          courierUserId: context.user.id,
          deliveryStatus: "courier_accepted",
          deliveryUpdatedAt: now
        }
      });

      if (claimed.count !== 1) {
        throw new ApiError(409, "Esta entrega já foi aceita ou não está mais disponível.", {
          code: "LILY_DELIVERY_ALREADY_CLAIMED"
        });
      }

      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: id,
          fromStatus: "waiting_courier",
          toStatus: "courier_accepted",
          actor: `courier:${context.user.id}`,
          createdAt: now
        }
      });

      return tx.lilyOrder.findUnique({
        where: { id },
        include: deliveryInclude
      });
    });

    await auditLilyAdmin(context.user.id, "delivery.accept", "order", id);
    return serializeDelivery(result, context.user.id);
  });

  app.post("/api/v1/lily/courier/deliveries/:id/transition", {
    config: { rateLimit: { max: 12, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilyCourier(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = transitionSchema.parse(request.body);
    const current = await assignedOrder(id, context.user.id);

    const next = nextStatusForAction(current.deliveryStatus as DeliveryStatus, input.action);

    if (input.action === "confirm_pickup") {
      if (!lilyLogisticsCodeConfiguration().ready) {
        throw new ApiError(503, "Códigos logísticos ainda não estão configurados.", {
          code: "LILY_LOGISTICS_CODE_KEY_REQUIRED"
        });
      }
      if (!input.code || !verifyLilyOrderSecurityCode(id, "pickup", input.code)) {
        await auditLilyAdmin(context.user.id, "delivery.pickup_code_failed", "order", id, {
          deliveryStatus: current.deliveryStatus
        });
        throw new ApiError(401, "Código de coleta inválido.", {
          code: "LILY_PICKUP_CODE_INVALID"
        });
      }
    }

    if (input.action === "confirm_delivery") {
      if (!lilyLogisticsCodeConfiguration().ready) {
        throw new ApiError(503, "Códigos logísticos ainda não estão configurados.", {
          code: "LILY_LOGISTICS_CODE_KEY_REQUIRED"
        });
      }
      if (!input.code || !verifyLilyOrderSecurityCode(id, "delivery", input.code)) {
        await auditLilyAdmin(context.user.id, "delivery.delivery_code_failed", "order", id, {
          deliveryStatus: current.deliveryStatus
        });
        throw new ApiError(401, "Código de entrega inválido.", {
          code: "LILY_DELIVERY_CODE_INVALID"
        });
      }
    }

    const now = new Date();
    const updated = await lilyPrisma.$transaction(async (tx) => {
      const moved = await tx.lilyOrder.updateMany({
        where: {
          id,
          courierUserId: context.user.id,
          deliveryStatus: current.deliveryStatus,
          deliveryUpdatedAt: current.deliveryUpdatedAt
        },
        data: {
          deliveryStatus: next,
          deliveryUpdatedAt: now,
          ...(next === "delivered" ? { completedAt: current.completedAt ?? now } : {})
        }
      });

      if (moved.count !== 1) {
        throw new ApiError(409, "A entrega mudou de etapa enquanto você operava. Atualize a tela.", {
          code: "LILY_DELIVERY_CONFLICT"
        });
      }

      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: id,
          fromStatus: current.deliveryStatus,
          toStatus: next,
          actor: `courier:${context.user.id}`,
          note: input.note || null,
          createdAt: now
        }
      });

      return tx.lilyOrder.findUnique({
        where: { id },
        include: deliveryInclude
      });
    });

    await auditLilyAdmin(context.user.id, `delivery.${input.action}`, "order", id, {
      fromStatus: current.deliveryStatus,
      toStatus: next
    });

    return serializeDelivery(updated, context.user.id);
  });
}
