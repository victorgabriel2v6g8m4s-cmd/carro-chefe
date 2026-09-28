import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyCourier } from "./admin-security";
import { getLilyOperationalSettings } from "./fulfillment";
import {
  lilyLogisticsCodeConfiguration,
  verifyLilyOrderSecurityCode
} from "./logistics-codes";
import {
  getOrCreateLilyRouteEstimate,
  lilyRoutingConfiguration,
  serializeLilyRouteEstimate
} from "./routing";

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

export const LILY_ASSIGNMENT_STATUSES = [
  "active",
  "completed",
  "abandoned",
  "reassigned",
  "cancelled"
] as const;

type AssignmentStatus = typeof LILY_ASSIGNMENT_STATUSES[number];

const courierDeclineSchema = z.object({
  reason: z.enum(["route_not_viable", "capacity", "vehicle", "personal", "other"]),
  note: z.string().trim().max(300).nullable().optional()
}).strict();

const courierAbandonSchema = z.object({
  reason: z.enum(["vehicle", "incident", "personal", "other"]),
  note: z.string().trim().max(300).nullable().optional()
}).strict();

const adminReassignSchema = z.object({
  courierUserId: idSchema.nullable().optional(),
  reason: z.enum(["operational", "courier_unavailable", "support", "other"]),
  note: z.string().trim().max(300).nullable().optional()
}).strict();

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LILY_ASSIGNMENT_STATUSES).optional()
});

const adminHistoryQuerySchema = historyQuerySchema.extend({
  courierUserId: idSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

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
  deliveryEvents: { orderBy: { createdAt: "asc" as const } },
  routeEstimate: true
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

function serializeDelivery(
  order: any,
  actorUserId: string,
  options: { redactHistoricalAddress?: boolean; forceFullAddress?: boolean } = {}
) {
  const address = parseAddress(order.addressSnapshotJson);
  const assignedToActor = order.courierUserId === actorUserId;
  const revealFullAddress = options.forceFullAddress
    || (assignedToActor && !options.redactHistoricalAddress);
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
    destination: revealFullAddress ? fullAddress(address) : publicAddress(address),
    routeEstimate: assignedToActor || options.forceFullAddress
      ? serializeLilyRouteEstimate(order.routeEstimate, {
          deliveryStatus: order.deliveryStatus,
          deliveryEvents: order.deliveryEvents,
          includeMap: true
        })
      : null,
    deliveryEvents: order.deliveryEvents.map((event: any) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      note: event.note,
      createdAt: event.createdAt
    }))
  };
}

function serializeAssignment(assignment: any) {
  return {
    id: assignment.id,
    courierUserId: assignment.courierUserId,
    status: assignment.status,
    assignedBy: assignment.assignedBy,
    assignedAt: assignment.assignedAt,
    endedAt: assignment.endedAt,
    endReason: assignment.endReason
  };
}

function pagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit))
  };
}

function ensureReassignable(status: string) {
  if (!["waiting_courier", "courier_accepted", "courier_arrived_pickup"].includes(status)) {
    throw new ApiError(409, "A entrega já passou do ponto seguro para desistência ou reatribuição.", {
      code: "LILY_DELIVERY_REASSIGNMENT_LOCKED",
      deliveryStatus: status
    });
  }
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
          courierUserId: null,
          deliveryEvents: {
            none: {
              actor: `courier:${context.user.id}`,
              note: { in: ["courier_rejected", "courier_abandoned"] }
            }
          },
          deliveryAssignments: {
            none: {
              courierUserId: context.user.id,
              status: { in: ["abandoned", "reassigned"] }
            }
          }
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

  app.get("/api/v1/lily/courier/deliveries/:id/route", {
    config: { rateLimit: { max: 12, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilyCourier(request);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const current = await assignedOrder(id, context.user.id);

    const result = await getOrCreateLilyRouteEstimate(id);
    if (!result.available) {
      return {
        available: false,
        reason: result.reason,
        provider: lilyRoutingConfiguration().provider
      };
    }

    const fresh = await lilyPrisma.lilyOrder.findUnique({
      where: { id },
      include: deliveryInclude
    });
    return {
      available: true,
      cached: result.cached,
      estimate: fresh
        ? serializeLilyRouteEstimate(fresh.routeEstimate, {
            deliveryStatus: fresh.deliveryStatus,
            deliveryEvents: fresh.deliveryEvents,
            includeMap: true
          })
        : serializeLilyRouteEstimate(result.estimate, {
            deliveryStatus: current.deliveryStatus,
            deliveryEvents: current.deliveryEvents,
            includeMap: true
          })
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

      await tx.lilyDeliveryAssignment.create({
        data: {
          orderId: id,
          courierUserId: context.user.id,
          status: "active",
          assignedBy: `courier:${context.user.id}`,
          assignedAt: now
        }
      });

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

      if (next === "left_delivery") {
        const closed = await tx.lilyDeliveryAssignment.updateMany({
          where: {
            orderId: id,
            courierUserId: context.user.id,
            status: "active"
          },
          data: {
            status: "completed",
            endedAt: now,
            endReason: "completed"
          }
        });
        if (closed.count !== 1) {
          throw new ApiError(409, "O vínculo desta entrega está inconsistente. Atualize a tela.", {
            code: "LILY_DELIVERY_ASSIGNMENT_CONFLICT"
          });
        }
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

  app.post("/api/v1/lily/courier/deliveries/:id/reject", {
    config: { rateLimit: { max: 20, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilyCourier(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = courierDeclineSchema.parse(request.body);
    const current = await lilyPrisma.lilyOrder.findUnique({ where: { id } });

    if (!current
      || current.fulfillmentType !== "delivery"
      || current.status !== "paid"
      || current.operationStatus !== "ready_for_dispatch"
      || current.deliveryStatus !== "waiting_courier"
      || current.courierUserId) {
      throw new ApiError(409, "Esta entrega não está disponível para recusa.", {
        code: "LILY_DELIVERY_REJECT_INVALID"
      });
    }

    await lilyPrisma.$transaction(async (tx) => {
      const guarded = await tx.lilyOrder.updateMany({
        where: {
          id,
          fulfillmentType: "delivery",
          status: "paid",
          operationStatus: "ready_for_dispatch",
          deliveryStatus: "waiting_courier",
          courierUserId: null,
          deliveryUpdatedAt: current.deliveryUpdatedAt
        },
        data: {
          deliveryUpdatedAt: current.deliveryUpdatedAt
        }
      });
      if (guarded.count !== 1) {
        throw new ApiError(409, "A entrega mudou enquanto você recusava. Atualize a tela.", {
          code: "LILY_DELIVERY_CONFLICT"
        });
      }
      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: id,
          fromStatus: "waiting_courier",
          toStatus: "waiting_courier",
          actor: `courier:${context.user.id}`,
          note: "courier_rejected"
        }
      });
    });

    await auditLilyAdmin(context.user.id, "delivery.reject", "order", id, {
      reason: input.reason,
      note: input.note || null
    });
    return { rejected: true };
  });

  app.post("/api/v1/lily/courier/deliveries/:id/abandon", {
    config: { rateLimit: { max: 12, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilyCourier(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = courierAbandonSchema.parse(request.body);
    const current = await assignedOrder(id, context.user.id);
    ensureReassignable(current.deliveryStatus);

    if (current.deliveryStatus === "waiting_courier") {
      throw new ApiError(409, "Esta entrega ainda não está atribuída a você.", {
        code: "LILY_DELIVERY_ABANDON_INVALID"
      });
    }

    const now = new Date();
    const updated = await lilyPrisma.$transaction(async (tx) => {
      const released = await tx.lilyOrder.updateMany({
        where: {
          id,
          courierUserId: context.user.id,
          deliveryStatus: current.deliveryStatus,
          deliveryUpdatedAt: current.deliveryUpdatedAt
        },
        data: {
          courierUserId: null,
          deliveryStatus: "waiting_courier",
          deliveryUpdatedAt: now
        }
      });
      if (released.count !== 1) {
        throw new ApiError(409, "A entrega mudou enquanto você desistia. Atualize a tela.", {
          code: "LILY_DELIVERY_CONFLICT"
        });
      }

      const closed = await tx.lilyDeliveryAssignment.updateMany({
        where: {
          orderId: id,
          courierUserId: context.user.id,
          status: "active"
        },
        data: {
          status: "abandoned",
          endedAt: now,
          endReason: input.reason,
          endNote: input.note || null
        }
      });
      if (closed.count !== 1) {
        throw new ApiError(409, "O vínculo desta entrega está inconsistente. Atualize a tela.", {
          code: "LILY_DELIVERY_ASSIGNMENT_CONFLICT"
        });
      }

      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: id,
          fromStatus: current.deliveryStatus,
          toStatus: "waiting_courier",
          actor: `courier:${context.user.id}`,
          note: "courier_abandoned",
          createdAt: now
        }
      });

      return tx.lilyOrder.findUnique({ where: { id }, include: deliveryInclude });
    });

    await auditLilyAdmin(context.user.id, "delivery.abandon", "order", id, {
      fromStatus: current.deliveryStatus,
      reason: input.reason,
      note: input.note || null
    });
    return serializeDelivery(updated, context.user.id);
  });

  app.get("/api/v1/lily/courier/deliveries/history", async (request) => {
    const context = await requireLilyCourier(request);
    const query = historyQuerySchema.parse(request.query);
    const where = {
      courierUserId: context.user.id,
      ...(query.status ? { status: query.status } : {})
    };
    const skip = (query.page - 1) * query.limit;
    const [total, assignments] = await Promise.all([
      lilyPrisma.lilyDeliveryAssignment.count({ where }),
      lilyPrisma.lilyDeliveryAssignment.findMany({
        where,
        include: { order: { include: deliveryInclude } },
        orderBy: { assignedAt: "desc" },
        skip,
        take: query.limit
      })
    ]);

    return {
      ...pagination(query.page, query.limit, total),
      items: assignments.map((assignment) => ({
        assignment: serializeAssignment(assignment),
        delivery: serializeDelivery(assignment.order, context.user.id, {
          redactHistoricalAddress: assignment.status !== "active"
        })
      }))
    };
  });

  app.get("/api/v1/lily/admin/deliveries", async (request) => {
    await requireLilyAdmin(request);
    const query = z.object({
      status: z.enum(LILY_DELIVERY_STATUSES).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50)
    }).parse(request.query);

    const orders = await lilyPrisma.lilyOrder.findMany({
      where: {
        fulfillmentType: "delivery",
        ...(query.status
          ? { deliveryStatus: query.status }
          : { deliveryStatus: { notIn: ["not_ready", "not_applicable"] } })
      },
      include: deliveryInclude,
      orderBy: [{ deliveryUpdatedAt: "desc" }, { createdAt: "desc" }],
      take: query.limit
    });

    const courierIds = [...new Set(orders.map((order) => order.courierUserId).filter(Boolean))] as string[];
    const couriers = courierIds.length
      ? await lilyPrisma.lilyUser.findMany({
          where: { id: { in: courierIds } },
          select: { id: true, displayName: true, role: true, status: true }
        })
      : [];
    const courierById = new Map(couriers.map((courier) => [courier.id, courier]));

    const eligibleCouriers = await lilyPrisma.lilyUser.findMany({
      where: {
        role: { in: ["courier", "admin"] },
        status: "active",
        staffPasswordUpgradeRequired: false,
        mfaEnabled: true
      },
      select: { id: true, displayName: true, role: true },
      orderBy: [{ displayName: "asc" }, { createdAt: "asc" }]
    });

    return {
      couriers: eligibleCouriers,
      deliveries: orders.map((order) => ({
        ...serializeDelivery(order, "", { forceFullAddress: true }),
        courier: order.courierUserId ? courierById.get(order.courierUserId) ?? {
          id: order.courierUserId,
          displayName: null,
          role: "unknown",
          status: "unknown"
        } : null
      }))
    };
  });

  app.post("/api/v1/lily/admin/deliveries/:id/reassign", {
    config: { rateLimit: { max: 30, timeWindow: "10 minutes" } }
  }, async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = adminReassignSchema.parse(request.body);
    const targetCourierUserId = input.courierUserId ?? null;
    const current = await lilyPrisma.lilyOrder.findFirst({
      where: { id, fulfillmentType: "delivery" },
      include: deliveryInclude
    });
    if (!current) {
      throw new ApiError(404, "Entrega não encontrada.", { code: "LILY_ADMIN_DELIVERY_NOT_FOUND" });
    }
    ensureReassignable(current.deliveryStatus);

    if ((targetCourierUserId ?? null) === (current.courierUserId ?? null)) {
      throw new ApiError(409, targetCourierUserId
        ? "A entrega já está atribuída a este entregador."
        : "A entrega já está disponível na fila.", {
        code: "LILY_DELIVERY_REASSIGNMENT_NOOP"
      });
    }

    if (targetCourierUserId) {
      const target = await lilyPrisma.lilyUser.findUnique({ where: { id: targetCourierUserId } });
      if (!target
        || !["courier", "admin"].includes(target.role)
        || target.status !== "active"
        || target.staffPasswordUpgradeRequired
        || !target.mfaEnabled) {
        throw new ApiError(400, "O entregador de destino não está apto para receber entregas.", {
          code: "LILY_DELIVERY_TARGET_NOT_ELIGIBLE"
        });
      }
    }

    const now = new Date();
    const oldCourierUserId = current.courierUserId;
    const nextStatus = targetCourierUserId ? "courier_accepted" : "waiting_courier";

    const updated = await lilyPrisma.$transaction(async (tx) => {
      const moved = await tx.lilyOrder.updateMany({
        where: {
          id,
          courierUserId: oldCourierUserId,
          deliveryStatus: current.deliveryStatus,
          deliveryUpdatedAt: current.deliveryUpdatedAt
        },
        data: {
          courierUserId: targetCourierUserId,
          deliveryStatus: nextStatus,
          deliveryUpdatedAt: now
        }
      });
      if (moved.count !== 1) {
        throw new ApiError(409, "A entrega mudou enquanto era reatribuída. Atualize a tela.", {
          code: "LILY_DELIVERY_CONFLICT"
        });
      }

      if (oldCourierUserId) {
        const closed = await tx.lilyDeliveryAssignment.updateMany({
          where: { orderId: id, courierUserId: oldCourierUserId, status: "active" },
          data: {
            status: "reassigned",
            endedAt: now,
            endReason: input.reason,
            endNote: input.note || null
          }
        });
        if (closed.count !== 1) {
          throw new ApiError(409, "O vínculo anterior desta entrega está inconsistente.", {
            code: "LILY_DELIVERY_ASSIGNMENT_CONFLICT"
          });
        }
      }

      if (targetCourierUserId) {
        await tx.lilyDeliveryAssignment.create({
          data: {
            orderId: id,
            courierUserId: targetCourierUserId,
            status: "active",
            assignedBy: `admin:${context.user.id}`,
            assignedAt: now
          }
        });
      }

      await tx.lilyOrderDeliveryEvent.create({
        data: {
          orderId: id,
          fromStatus: current.deliveryStatus,
          toStatus: nextStatus,
          actor: `admin:${context.user.id}`,
          note: targetCourierUserId ? "admin_reassigned" : "admin_returned_to_queue",
          createdAt: now
        }
      });

      return tx.lilyOrder.findUnique({ where: { id }, include: deliveryInclude });
    });

    await auditLilyAdmin(context.user.id, "delivery.reassign", "order", id, {
      fromCourierUserId: oldCourierUserId,
      toCourierUserId: targetCourierUserId,
      fromStatus: current.deliveryStatus,
      toStatus: nextStatus,
      reason: input.reason,
      note: input.note || null
    });

    return serializeDelivery(updated, "", { forceFullAddress: true });
  });

  app.get("/api/v1/lily/admin/deliveries/history", async (request) => {
    await requireLilyAdmin(request);
    const query = adminHistoryQuerySchema.parse(request.query);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.courierUserId ? { courierUserId: query.courierUserId } : {}),
      ...((query.from || query.to) ? {
        assignedAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {})
        }
      } : {})
    };
    const skip = (query.page - 1) * query.limit;
    const [total, assignments] = await Promise.all([
      lilyPrisma.lilyDeliveryAssignment.count({ where }),
      lilyPrisma.lilyDeliveryAssignment.findMany({
        where,
        include: { order: { include: deliveryInclude } },
        orderBy: { assignedAt: "desc" },
        skip,
        take: query.limit
      })
    ]);

    const courierIds = [...new Set(assignments.map((assignment) => assignment.courierUserId))];
    const couriers = courierIds.length
      ? await lilyPrisma.lilyUser.findMany({
          where: { id: { in: courierIds } },
          select: { id: true, displayName: true, role: true, status: true }
        })
      : [];
    const courierById = new Map(couriers.map((courier) => [courier.id, courier]));

    return {
      ...pagination(query.page, query.limit, total),
      items: assignments.map((assignment) => ({
        assignment: serializeAssignment(assignment),
        courier: courierById.get(assignment.courierUserId) ?? {
          id: assignment.courierUserId,
          displayName: null,
          role: "unknown",
          status: "unknown"
        },
        delivery: serializeDelivery(assignment.order, "", { redactHistoricalAddress: true })
      }))
    };
  });
}
