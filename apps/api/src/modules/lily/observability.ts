import type { FastifyInstance } from "fastify";
import { lilyPrisma } from "@lily-acai/database";
import { requireLilyStaff } from "./admin-security";

const PIX_REVIEW_STATUSES = [
  "unmatched",
  "no_txid",
  "ambiguous",
  "discrepant",
  "duplicate_payment",
  "late_payment",
  "race_lost"
];

const DELIVERY_IN_PROGRESS = [
  "courier_accepted",
  "courier_arrived_pickup",
  "picked_up",
  "left_pickup",
  "courier_arrived_delivery",
  "delivered"
];

export async function lilyObservabilityRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/observability/summary", async (request, reply) => {
    await requireLilyStaff(request);
    reply.header("Cache-Control", "no-store");
    const generatedAt = new Date();

    await lilyPrisma.$queryRawUnsafe("SELECT 1");

    const [
      awaitingPayment,
      paidActive,
      preparing,
      readyForDispatch,
      waitingCourier,
      deliveryInProgress,
      whatsappPending,
      whatsappFailed,
      whatsappDead,
      pixReviewRequired,
      pixState,
      latestOrder
    ] = await Promise.all([
      lilyPrisma.lilyOrder.count({ where: { status: "awaiting_payment" } }),
      lilyPrisma.lilyOrder.count({
        where: {
          status: "paid",
          operationStatus: { notIn: ["completed", "cancelled"] }
        }
      }),
      lilyPrisma.lilyOrder.count({ where: { operationStatus: "preparing" } }),
      lilyPrisma.lilyOrder.count({ where: { operationStatus: "ready_for_dispatch" } }),
      lilyPrisma.lilyOrder.count({ where: { deliveryStatus: "waiting_courier" } }),
      lilyPrisma.lilyOrder.count({ where: { deliveryStatus: { in: DELIVERY_IN_PROGRESS } } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "pending" } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "failed" } }),
      lilyPrisma.lilyWhatsAppNotification.count({ where: { status: "dead" } }),
      lilyPrisma.lilyPixSettlement.count({ where: { matchStatus: { in: PIX_REVIEW_STATUSES } } }),
      lilyPrisma.lilyPixReconciliationState.findUnique({
        where: { source: "pix_api_v2" },
        select: {
          lastSuccessfulAt: true,
          lastAttemptAt: true,
          lastErrorCode: true,
          updatedAt: true
        }
      }),
      lilyPrisma.lilyOrder.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          status: true,
          operationStatus: true,
          deliveryStatus: true,
          fulfillmentType: true,
          isHomologation: true
        }
      })
    ]);

    return {
      generatedAt,
      database: { status: "ok" },
      orders: {
        awaitingPayment,
        paidActive,
        preparing,
        readyForDispatch,
        waitingCourier,
        deliveryInProgress,
        latest: latestOrder
      },
      whatsapp: {
        pending: whatsappPending,
        failed: whatsappFailed,
        dead: whatsappDead
      },
      pixReconciliation: {
        reviewRequired: pixReviewRequired,
        lastSuccessfulAt: pixState?.lastSuccessfulAt ?? null,
        lastAttemptAt: pixState?.lastAttemptAt ?? null,
        lastErrorCode: pixState?.lastErrorCode ?? null,
        updatedAt: pixState?.updatedAt ?? null
      }
    };
  });
}
