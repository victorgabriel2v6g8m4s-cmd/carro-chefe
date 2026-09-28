import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import {
  lilyLogisticsCodeConfiguration,
  lilyOrderSecurityCode
} from "./logistics-codes";

const idSchema = z.string().trim().min(1).max(120);
const noteSchema = z.object({
  note: z.string().trim().max(300).nullable().optional()
}).strict();

export const LILY_OPERATION_STATUSES = [
  "received",
  "waiting_payment",
  "preparing",
  "ready_for_dispatch",
  "cancelled"
] as const;

type OperationStatus = typeof LILY_OPERATION_STATUSES[number];

const operationInclude = {
  items: { include: { addons: true } },
  operationEvents: { orderBy: { createdAt: "asc" as const } },
  deliveryEvents: { orderBy: { createdAt: "asc" as const } }
};

function nextOperationStatus(order: {
  status: string;
  operationStatus: string;
}): OperationStatus {
  if (order.operationStatus === "received") {
    return order.status === "paid" ? "preparing" : "waiting_payment";
  }
  if (order.operationStatus === "waiting_payment") {
    if (order.status !== "paid") {
      throw new ApiError(409, "O pedido ainda não possui pagamento confirmado.", {
        code: "LILY_ORDER_PAYMENT_REQUIRED"
      });
    }
    return "preparing";
  }
  if (order.operationStatus === "preparing") return "ready_for_dispatch";

  throw new ApiError(409, "Este pedido não possui uma próxima etapa de cozinha disponível.", {
    code: "LILY_ORDER_OPERATION_FINAL",
    operationStatus: order.operationStatus
  });
}

function serializeKitchenOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    financialStatus: order.status,
    operationStatus: order.operationStatus,
    operationUpdatedAt: order.operationUpdatedAt,
    deliveryStatus: order.deliveryStatus,
    deliveryUpdatedAt: order.deliveryUpdatedAt,
    fulfillmentType: order.fulfillmentType,
    isHomologation: order.isHomologation,
    grandTotalCents: order.grandTotalCents,
    customerNote: order.customerNote,
    pickupCode: order.fulfillmentType === "delivery"
      && order.operationStatus === "ready_for_dispatch"
      && lilyLogisticsCodeConfiguration().ready
        ? lilyOrderSecurityCode(order.id, "pickup")
        : null,
    createdAt: order.createdAt,
    items: order.items.map((item: any) => ({
      id: item.id,
      productName: item.productNameSnapshot,
      variantName: item.variantNameSnapshot,
      sizeMl: item.sizeMl,
      quantity: item.quantity,
      note: item.customerNote,
      flavors: JSON.parse(item.flavorsSnapshotJson),
      configuration: JSON.parse(item.configurationSnapshotJson),
      addons: item.addons.map((addon: any) => ({
        name: addon.addonNameSnapshot,
        quantity: addon.quantity
      }))
    })),
    operationEvents: order.operationEvents.map((event: any) => ({
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      actor: event.actor,
      note: event.note,
      createdAt: event.createdAt
    }))
  };
}

export async function lilyOperationsRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/kitchen/orders", async (request) => {
    await requireLilyStaff(request);

    const query = z.object({
      includeFinished: z.coerce.boolean().optional().default(false),
      limit: z.coerce.number().int().min(1).max(200).default(100)
    }).parse(request.query);

    const orders = await lilyPrisma.lilyOrder.findMany({
      where: query.includeFinished
        ? {}
        : { operationStatus: { in: ["received", "waiting_payment", "preparing", "ready_for_dispatch"] } },
      include: operationInclude,
      orderBy: [
        { operationUpdatedAt: "asc" },
        { createdAt: "asc" }
      ],
      take: query.limit
    });

    return {
      orders: orders.map(serializeKitchenOrder),
      statuses: LILY_OPERATION_STATUSES
    };
  });

  app.post("/api/v1/lily/admin/kitchen/orders/:id/advance", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
  }, async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = noteSchema.parse(request.body ?? {});

    const current = await lilyPrisma.lilyOrder.findUnique({
      where: { id },
      include: operationInclude
    });
    if (!current) throw new ApiError(404, "Pedido não encontrado.");

    const next = nextOperationStatus(current);
    const now = new Date();
    const opensDeliveryQueue = next === "ready_for_dispatch" && current.fulfillmentType === "delivery";

    const updated = await lilyPrisma.$transaction(async (tx) => {
      const result = await tx.lilyOrder.updateMany({
        where: {
          id,
          operationStatus: current.operationStatus,
          operationUpdatedAt: current.operationUpdatedAt
        },
        data: {
          operationStatus: next,
          operationUpdatedAt: now,
          ...(opensDeliveryQueue
            ? {
                deliveryStatus: "waiting_courier",
                deliveryUpdatedAt: now,
                courierUserId: null
              }
            : {})
        }
      });

      if (result.count !== 1) {
        throw new ApiError(409, "O pedido mudou de etapa enquanto você operava. Atualize a fila.", {
          code: "LILY_ORDER_OPERATION_CONFLICT"
        });
      }

      await tx.lilyOrderOperationEvent.create({
        data: {
          orderId: id,
          fromStatus: current.operationStatus,
          toStatus: next,
          actor: `staff:${context.user.id}`,
          note: input.note || null,
          createdAt: now
        }
      });

      if (opensDeliveryQueue) {
        await tx.lilyOrderDeliveryEvent.create({
          data: {
            orderId: id,
            fromStatus: current.deliveryStatus,
            toStatus: "waiting_courier",
            actor: `staff:${context.user.id}`,
            note: "Pedido liberado pela cozinha para a fila de entrega.",
            createdAt: now
          }
        });
      }

      return tx.lilyOrder.findUnique({
        where: { id },
        include: operationInclude
      });
    });

    await auditLilyAdmin(context.user.id, "order.operation.advance", "order", id, {
      fromStatus: current.operationStatus,
      toStatus: next,
      financialStatus: current.status,
      ...(opensDeliveryQueue ? { deliveryStatus: "waiting_courier" } : {})
    });

    return serializeKitchenOrder(updated);
  });
}
