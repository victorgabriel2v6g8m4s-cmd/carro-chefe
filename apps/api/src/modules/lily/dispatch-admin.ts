import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "./admin-security";
import { ensurePickupConfigured, offerCourierForOrder } from "./courier-dispatch";
import { enqueueLilyWhatsAppStage } from "./whatsapp";

const idSchema = z.string().trim().min(1).max(120);
const decisionSchema = z.object({
  action: z.enum(["accept", "reject"]),
  prepEstimateMinutes: z.number().int().min(1).max(720).optional(),
  reason: z.string().trim().min(3).max(300).optional()
}).strict().superRefine((value, context) => {
  if (value.action === "accept" && value.prepEstimateMinutes === undefined) {
    context.addIssue({ code: "custom", path: ["prepEstimateMinutes"], message: "Informe a previsão de preparo." });
  }
  if (value.action === "reject" && !value.reason) {
    context.addIssue({ code: "custom", path: ["reason"], message: "Informe o motivo da recusa." });
  }
});

const checklistSchema = z.object({
  itemsVerified: z.boolean(),
  volumeCount: z.number().int().min(1).max(30),
  packageSealed: z.boolean(),
  thermalBag: z.boolean()
}).strict();

export async function lilyDispatchAdminRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/admin/kitchen/orders/:id/decision", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = decisionSchema.parse(request.body);
    const current = await lilyPrisma.lilyOrder.findUnique({ where: { id } });
    if (!current || current.fulfillmentType !== "delivery" || current.operationStatus !== "received"
      || current.restaurantDecisionStatus !== "pending") {
      throw new ApiError(409, "Este pedido não está aguardando decisão do restaurante.", {
        code: "LILY_RESTAURANT_DECISION_UNAVAILABLE"
      });
    }

    const now = new Date();
    const accepted = input.action === "accept";
    const updated = await lilyPrisma.$transaction(async (tx) => {
      const result = await tx.lilyOrder.updateMany({
        where: {
          id,
          operationStatus: "received",
          restaurantDecisionStatus: "pending",
          operationUpdatedAt: current.operationUpdatedAt
        },
        data: {
          restaurantDecisionStatus: accepted ? "accepted" : "rejected",
          restaurantDecisionAt: now,
          restaurantDecisionReason: accepted ? null : input.reason,
          restaurantPrepEstimateMinutes: accepted ? input.prepEstimateMinutes : null,
          ...(!accepted && current.status === "paid" ? { refundStatus: "pending_confirmation" } : {}),
          ...(!accepted ? { operationStatus: "cancelled", operationUpdatedAt: now } : {})
        }
      });
      if (result.count !== 1) {
        throw new ApiError(409, "O pedido mudou enquanto você registrava a decisão. Atualize a fila.", {
          code: "LILY_RESTAURANT_DECISION_CONFLICT"
        });
      }
      await tx.lilyOrderOperationEvent.create({
        data: {
          orderId: id,
          fromStatus: current.operationStatus,
          toStatus: accepted ? current.operationStatus : "cancelled",
          actor: `staff:${context.user.id}`,
          note: accepted
            ? `restaurante_aceitou;previsao_preparo_min=${input.prepEstimateMinutes}`
            : `restaurante_recusou;motivo=${input.reason};reembolso_pendente=${current.status === "paid"}`,
          createdAt: now
        }
      });
      await enqueueLilyWhatsAppStage(tx, {
        orderId: id,
        optedIn: current.whatsappUpdatesOptIn,
        stage: accepted ? "restaurant_accepted" : "cancelled",
        at: now
      });
      return tx.lilyOrder.findUniqueOrThrow({ where: { id } });
    });
    await auditLilyAdmin(context.user.id, `order.restaurant.${input.action}`, "order", id, {
      reason: input.reason ?? null,
      prepEstimateMinutes: input.prepEstimateMinutes ?? null,
      refundRequired: !accepted && current.status === "paid"
    });
    return {
      order: {
        id: updated.id,
        restaurantDecisionStatus: updated.restaurantDecisionStatus,
        restaurantDecisionAt: updated.restaurantDecisionAt,
        restaurantPrepEstimateMinutes: updated.restaurantPrepEstimateMinutes,
        operationStatus: updated.operationStatus
      },
      refundRequired: !accepted && current.status === "paid",
      message: !accepted && current.status === "paid"
        ? "Pedido recusado. O reembolso ainda precisa ser confirmado pelo meio de pagamento."
        : undefined
    };
  });

  app.put("/api/v1/lily/admin/kitchen/orders/:id/dispatch-checklist", async (request) => {
    const context = await requireLilyStaff(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = checklistSchema.parse(request.body);
    const current = await lilyPrisma.lilyOrder.findUnique({ where: { id } });
    if (!current || current.fulfillmentType !== "delivery" || current.operationStatus !== "ready_for_dispatch"
      || current.restaurantDecisionStatus !== "accepted") {
      throw new ApiError(409, "A conferência só pode ser feita em pedido aceito e pronto para expedição.", {
        code: "LILY_DISPATCH_CHECKLIST_UNAVAILABLE"
      });
    }
    const complete = input.itemsVerified && input.volumeCount > 0 && input.packageSealed && input.thermalBag;
    if (complete) await ensurePickupConfigured();
    const now = new Date();
    await lilyPrisma.lilyOrder.update({
      where: { id },
      data: {
        dispatchChecklistJson: JSON.stringify(input),
        dispatchCheckedAt: complete ? now : null,
        dispatchCheckedBy: complete ? context.user.id : null
      }
    });
    const offer = complete ? await offerCourierForOrder(id) : null;
    await auditLilyAdmin(context.user.id, "delivery.dispatch-checklist", "order", id, {
      ...input,
      complete
    });
    return {
      complete,
      offered: Boolean(offer),
      message: complete
        ? offer
          ? "Conferência concluída e oferta enviada ao entregador mais próximo."
          : "Conferência concluída. A oferta será enviada quando houver entregador disponível."
        : "Conferência salva. Complete todos os itens antes de chamar entregadores."
    };
  });
}
