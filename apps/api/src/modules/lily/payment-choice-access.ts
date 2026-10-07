import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { requireLilyStaff } from "./admin-security";
import { getOptionalLilySession, requireLilyCsrf } from "./auth";

export const paymentChoiceIdSchema = z.string().trim().min(1).max(120);

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function timingSafeStringEqual(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function readPaymentChoiceIdempotencyKey(request: FastifyRequest) {
  const raw = request.headers["idempotency-key"];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^[A-Za-z0-9._:-]{16,120}$/.test(value)) {
    throw new ApiError(400, "Idempotency-Key de pagamento inválido ou ausente.", {
      code: "LILY_PAYMENT_IDEMPOTENCY_REQUIRED"
    });
  }
  return value;
}

export async function requirePaymentChoiceOrderAccess(
  request: FastifyRequest,
  orderId: string,
  mutate: boolean
) {
  const order = await lilyPrisma.lilyOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Pedido não encontrado.");
  const context = await getOptionalLilySession(request);

  if (order.userId) {
    if (!context || context.user.id !== order.userId) throw new ApiError(404, "Pedido não encontrado.");
    if (mutate) requireLilyCsrf(request, context);
    return { order, context };
  }

  const supplied = request.headers["x-lily-order-token"];
  if (typeof supplied !== "string" || !order.guestAccessTokenHash) {
    throw new ApiError(401, "Token do pedido necessário.", { code: "LILY_ORDER_TOKEN_REQUIRED" });
  }
  if (!timingSafeStringEqual(hashToken(supplied), order.guestAccessTokenHash)) {
    throw new ApiError(401, "Token do pedido inválido.", { code: "LILY_ORDER_TOKEN_INVALID" });
  }
  return { order, context: null };
}

function homologationRequested(request: FastifyRequest) {
  return request.headers["x-lily-homologation"] === "1";
}

export async function requirePaymentChoiceHomologationIfRequested(
  request: FastifyRequest,
  mutate = false
) {
  if (!homologationRequested(request)) return false;
  await requireLilyStaff(request, mutate);
  return true;
}
