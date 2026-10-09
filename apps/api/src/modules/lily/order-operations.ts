import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import { getLilyOperationalSettings } from "./fulfillment";
import { lilyKitchenPreparationSla } from "./operational-sla";

const idSchema = z.string().trim().min(1).max(120);

const overviewQuerySchema = z.object({
  state: z.enum(["active", "attention", "completed", "cancelled", "all"]).default("active"),
  fulfillment: z.enum(["pickup", "delivery"]).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

type OverviewOrder = {
  id: string;
  orderNumber: string;
  status: string;
  operationStatus: string;
  operationUpdatedAt: Date;
  deliveryStatus: string;
  deliveryUpdatedAt: Date | null;
  fulfillmentType: string;
  isHomologation: boolean;
  grandTotalCents: number;
  createdAt: Date;
  completedAt: Date | null;
  items: Array<{ quantity: number }>;
};

function flowState(order: OverviewOrder) {
  if (
    order.operationStatus === "cancelled"
    || order.deliveryStatus === "cancelled"
    || ["cancelled", "refunded"].includes(order.status)
  ) {
    return "cancelled" as const;
  }

  if (
    order.operationStatus === "completed"
    || (order.fulfillmentType === "delivery" && order.deliveryStatus === "left_delivery")
  ) {
    return "completed" as const;
  }

  return "active" as const;
}

function nextAction(order: OverviewOrder) {
  const state = flowState(order);
  if (state === "completed" || state === "cancelled") return null;

  if (order.status !== "paid") {
    return {
      kind: "payment" as const,
      label: "Ver pagamento",
      path: "/painel/pagamentos"
    };
  }

  if (["received", "waiting_payment", "preparing"].includes(order.operationStatus)) {
    return {
      kind: "kitchen" as const,
      label: order.operationStatus === "preparing" ? "Acompanhar preparo" : "Liberar para produção",
      path: "/painel/cozinha"
    };
  }

  if (order.operationStatus === "ready_for_dispatch" && order.fulfillmentType === "pickup") {
    return {
      kind: "pickup" as const,
      label: "Confirmar retirada",
      path: "/painel/pedidos"
    };
  }

  if (order.fulfillmentType === "delivery") {
    return {
      kind: "delivery" as const,
      label: "Acompanhar entrega",
      path: "/painel/entregas"
    };
  }

  return null;
}

function attentionFlags(
  order: OverviewOrder,
  kitchenPreparationSlaMinutes: number | null | undefined,
  now: Date
) {
  const flags: string[] = [];
  const sla = lilyKitchenPreparationSla(order, kitchenPreparationSlaMinutes, now);

  if (
    order.status === "paid"
    && ["received", "waiting_payment"].includes(order.operationStatus)
  ) {
    flags.push("paid_waiting_kitchen");
  }

  if (sla?.status === "overdue") {
    flags.push("preparation_overdue");
  }

  if (
    order.status !== "paid"
    && ["preparing", "ready_for_dispatch", "completed"].includes(order.operationStatus)
  ) {
    flags.push("operation_ahead_of_payment");
  }

  if (
    order.fulfillmentType === "delivery"
    && order.operationStatus === "ready_for_dispatch"
    && order.deliveryStatus === "not_ready"
  ) {
    flags.push("delivery_queue_not_opened");
  }

  return { flags, sla };
}

function serializeOverviewOrder(
  order: OverviewOrder,
  kitchenPreparationSlaMinutes: number | null | undefined,
  now: Date
) {
  const attention = attentionFlags(order, kitchenPreparationSlaMinutes, now);
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
    createdAt: order.createdAt,
    completedAt: order.completedAt,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    flowState: flowState(order),
    attention: attention.flags,
    sla: attention.sla,
    nextAction: nextAction(order)
  };
}

function matchesState(
  order: ReturnType<typeof serializeOverviewOrder>,
  state: z.infer<typeof overviewQuerySchema>["state"]
) {
  if (state === "all") return true;
  if (state === "attention") return order.attention.length > 0;
  return order.flowState === state;
}

export async function lilyOrderOperationsRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/orders/overview", async (request) => {
    await requireLilyStaff(request);
    const query = overviewQuerySchema.parse(request.query);
    const settings = await getLilyOperationalSettings();

    const rows = await lilyPrisma.lilyOrder.findMany({
      where: {
        ...(query.fulfillment ? { fulfillmentType: query.fulfillment } : {}),
        ...(query.q ? { orderNumber: { contains: query.q } } : {}),
        // Apply the cancellation filter in the database before take=200.
        // Otherwise recent active orders can push older cancelled orders out of the result set.
        ...(query.state === "cancelled" ? {
          OR: [
            { status: { in: ["cancelled", "refunded"] } },
            { operationStatus: "cancelled" },
            { deliveryStatus: "cancelled" }
          ]
        } : {})
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        operationStatus: true,
        operationUpdatedAt: true,
        deliveryStatus: true,
        deliveryUpdatedAt: true,
        fulfillmentType: true,
        isHomologation: true,
        grandTotalCents: true,
        createdAt: true,
        completedAt: true,
        items: { select: { quantity: true } }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200
    });

    const now = new Date();
    const serialized = rows.map((order) =>
      serializeOverviewOrder(order, settings.kitchenPreparationSlaMinutes, now)
    );
    const filtered = serialized.filter((order) => matchesState(order, query.state)).slice(0, query.limit);

    return {
      generatedAt: now,
      filters: query,
      summary: {
        visible: filtered.length,
        attention: filtered.filter((order) => order.attention.length > 0).length,
        awaitingPayment: filtered.filter((order) => order.financialStatus !== "paid" && order.flowState === "active").length,
        preparing: filtered.filter((order) => order.operationStatus === "preparing").length,
        ready: filtered.filter((order) => order.operationStatus === "ready_for_dispatch").length,
        deliveryInProgress: filtered.filter((order) =>
          order.fulfillmentType === "delivery"
          && !["not_ready", "waiting_courier", "left_delivery", "cancelled"].includes(order.deliveryStatus)
        ).length,
        completed: filtered.filter((order) => order.flowState === "completed").length
      },
      orders: filtered
    };
  });

  app.post("/api/v1/lily/admin/orders/:id/complete-pickup", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
  }, async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const current = await lilyPrisma.lilyOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        operationStatus: true,
        operationUpdatedAt: true,
        deliveryStatus: true,
        deliveryUpdatedAt: true,
        fulfillmentType: true,
        isHomologation: true,
        grandTotalCents: true,
        createdAt: true,
        completedAt: true,
        items: { select: { quantity: true } }
      }
    });

    if (!current) throw new ApiError(404, "Pedido não encontrado.");
    if (current.fulfillmentType !== "pickup") {
      throw new ApiError(409, "Somente pedidos de retirada podem ser concluídos por este fluxo.", {
        code: "LILY_PICKUP_COMPLETION_NOT_PICKUP"
      });
    }
    if (current.status !== "paid") {
      throw new ApiError(409, "A retirada só pode ser concluída após pagamento confirmado.", {
        code: "LILY_PICKUP_COMPLETION_PAYMENT_REQUIRED"
      });
    }
    if (current.operationStatus !== "ready_for_dispatch") {
      throw new ApiError(409, "O pedido ainda não está pronto para retirada.", {
        code: "LILY_PICKUP_COMPLETION_NOT_READY",
        operationStatus: current.operationStatus
      });
    }

    const now = new Date();
    const updated = await lilyPrisma.$transaction(async (tx) => {
      const moved = await tx.lilyOrder.updateMany({
        where: {
          id,
          status: "paid",
          fulfillmentType: "pickup",
          operationStatus: "ready_for_dispatch",
          operationUpdatedAt: current.operationUpdatedAt
        },
        data: {
          operationStatus: "completed",
          operationUpdatedAt: now,
          completedAt: current.completedAt ?? now
        }
      });

      if (moved.count !== 1) {
        throw new ApiError(409, "O pedido mudou enquanto você confirmava a retirada. Atualize o painel.", {
          code: "LILY_PICKUP_COMPLETION_CONFLICT"
        });
      }

      await tx.lilyOrderOperationEvent.create({
        data: {
          orderId: id,
          fromStatus: "ready_for_dispatch",
          toStatus: "completed",
          actor: `staff:${context.user.id}`,
          note: "Retirada confirmada pela equipe.",
          createdAt: now
        }
      });

      return tx.lilyOrder.findUnique({
        where: { id },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          operationStatus: true,
          operationUpdatedAt: true,
          deliveryStatus: true,
          deliveryUpdatedAt: true,
          fulfillmentType: true,
          isHomologation: true,
          grandTotalCents: true,
          createdAt: true,
          completedAt: true,
          items: { select: { quantity: true } }
        }
      });
    });

    await auditLilyAdmin(context.user.id, "order.pickup.complete", "order", id, {
      orderNumber: current.orderNumber,
      fromStatus: "ready_for_dispatch",
      toStatus: "completed"
    });

    const settings = await getLilyOperationalSettings();
    return serializeOverviewOrder(updated!, settings.kitchenPreparationSlaMinutes, now);
  });
}
