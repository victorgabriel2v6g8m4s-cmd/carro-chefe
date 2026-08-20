import type { FastifyInstance } from "fastify";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";
import { broadcastEvent } from "../../lib/outbox";
import { acceptInboundWebhook } from "./accept-inbound";
import { webhookEventTypeSchema, webhookExternalIdSchema, webhookPayload, webhookProviderSchema } from "./schemas";
import { hasValidWebhookSignature } from "./signature";

function boundedHeader(value: string | string[] | undefined, fallback = "") {
  const normalized = Array.isArray(value) ? value[0] : value;
  return (normalized ?? fallback).trim().slice(0, 200);
}

export async function inboundWebhookRoutes(app: FastifyInstance) {
  app.post("/api/v1/integrations/:provider/webhook", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { provider } = webhookProviderSchema.parse(request.params);
    const rawBody = request.rawBody ?? JSON.stringify(request.body ?? {});
    const signature = boundedHeader(request.headers["x-carrochefe-signature"]);
    if (!hasValidWebhookSignature(rawBody, signature, config.webhookSecret)) {
      request.log.warn({ provider }, "Webhook rejeitado por assinatura inválida");
      throw new ApiError(401, "Assinatura de webhook inválida.", { code: "WEBHOOK_SIGNATURE_INVALID" });
    }
    const payload = webhookPayload(request.body);
    const externalIdValue = boundedHeader(request.headers["x-idempotency-key"], typeof payload.id === "string" ? payload.id : "");
    if (!externalIdValue) throw new ApiError(400, "Informe x-idempotency-key ou id no payload.", { code: "WEBHOOK_IDEMPOTENCY_KEY_REQUIRED" });
    const externalId = webhookExternalIdSchema.parse(externalIdValue);
    const eventType = webhookEventTypeSchema.parse(boundedHeader(request.headers["x-event-type"], typeof payload.type === "string" ? payload.type : "unknown"));
    const result = await acceptInboundWebhook({ provider, externalId, eventType, rawBody, payload });
    if (result.duplicate) return reply.code(200).send({ duplicate: true, id: result.id });
    broadcastEvent(result.event);
    return reply.code(202).send({ accepted: true, id: result.id });
  });
}
