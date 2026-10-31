import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma, type LilyOrderReview } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "./auth";

const idSchema = z.string().trim().min(1).max(120);
const dimensionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().default("")
}).strict();
export const orderReviewSchema = z.object({
  store: dimensionSchema.optional(),
  delivery: dimensionSchema.optional(),
  platform: dimensionSchema.optional()
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Selecione pelo menos uma categoria para avaliar."
});

function serializeReview(review: Pick<LilyOrderReview,
  "submittedAt" | "storeRating" | "storeComment" | "deliveryRating" | "deliveryComment" | "platformRating" | "platformComment"
> | null) {
  if (!review) return null;
  return {
    submittedAt: review.submittedAt,
    store: review.storeRating === null ? null : { rating: review.storeRating, comment: review.storeComment ?? "" },
    delivery: review.deliveryRating === null ? null : { rating: review.deliveryRating, comment: review.deliveryComment ?? "" },
    platform: review.platformRating === null ? null : { rating: review.platformRating, comment: review.platformComment ?? "" }
  };
}

export async function lilyOrderReviewRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/customer/orders/:id/review", async (request) => {
    const context = await requireLilySession(request);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const order = await lilyPrisma.lilyOrder.findFirst({
      where: { id, userId: context.user.id },
      select: { id: true, fulfillmentType: true, operationStatus: true, deliveryStatus: true, review: true }
    });
    if (!order) throw new ApiError(404, "Pedido não encontrado para esta conta.", { code: "LILY_ORDER_NOT_FOUND" });
    const eligible = order.fulfillmentType === "delivery"
      ? ["delivered", "left_delivery"].includes(order.deliveryStatus)
      : order.operationStatus === "completed";
    return { eligible, fulfillmentType: order.fulfillmentType, review: serializeReview(order.review) };
  });

  app.post("/api/v1/lily/customer/orders/:id/review", {
    config: { rateLimit: { max: 10, timeWindow: "10 minutes" } }
  }, async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = orderReviewSchema.parse(request.body);
    const order = await lilyPrisma.lilyOrder.findFirst({
      where: { id, userId: context.user.id },
      select: { id: true, fulfillmentType: true, operationStatus: true, deliveryStatus: true }
    });
    if (!order) throw new ApiError(404, "Pedido não encontrado para esta conta.", { code: "LILY_ORDER_NOT_FOUND" });
    const eligible = order.fulfillmentType === "delivery"
      ? ["delivered", "left_delivery"].includes(order.deliveryStatus)
      : order.operationStatus === "completed";
    if (!eligible) throw new ApiError(409, "A avaliação fica disponível após concluir o pedido.", {
      code: "LILY_ORDER_REVIEW_NOT_READY"
    });
    if (input.delivery && order.fulfillmentType !== "delivery") {
      throw new ApiError(400, "Este pedido não teve entrega para avaliar.", { code: "LILY_ORDER_REVIEW_DELIVERY_INVALID" });
    }

    try {
      const review = await lilyPrisma.lilyOrderReview.create({
        data: {
          orderId: order.id,
          userId: context.user.id,
          storeRating: input.store?.rating ?? null,
          storeComment: input.store?.comment || null,
          deliveryRating: input.delivery?.rating ?? null,
          deliveryComment: input.delivery?.comment || null,
          platformRating: input.platform?.rating ?? null,
          platformComment: input.platform?.comment || null
        }
      });
      return reply.code(201).send({ review: serializeReview(review) });
    } catch (cause) {
      if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") {
        throw new ApiError(409, "Este pedido já recebeu uma avaliação.", { code: "LILY_ORDER_REVIEW_ALREADY_SUBMITTED" });
      }
      throw cause;
    }
  });
}
