import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { z } from "zod";
import { config } from "../../config";
import { ApiError } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";

const endpointSchema = z.object({ name: z.string().min(2).max(100), url: z.string().url(), events: z.array(z.string().min(1)).min(1), secretRef: z.string().min(2).max(200) });

function validSignature(rawBody: string, signature: string | undefined) {
  if (!config.webhookSecret || !signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex")}`;
  const left = Buffer.from(expected); const right = Buffer.from(signature);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function webhookRoutes(app: FastifyInstance) {
  app.get("/api/v1/webhooks", async () => prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" } }));
  app.post("/api/v1/webhooks", async (request, reply) => {
    const input = endpointSchema.parse(request.body);
    return reply.code(201).send(await prisma.webhookEndpoint.create({ data: { ...input, eventsJson: JSON.stringify(input.events), events: undefined } as any }));
  });
  app.post("/api/v1/integrations/:provider/webhook", async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const rawBody = (request as any).rawBody ?? JSON.stringify(request.body ?? {});
    const signature = request.headers["x-carrochefe-signature"] as string | undefined;
    if (!validSignature(rawBody, signature)) throw new ApiError(401, "Assinatura de webhook inválida.");
    const payload = request.body as Record<string, unknown>;
    const externalId = String(request.headers["x-idempotency-key"] ?? payload.id ?? "");
    if (!externalId) throw new ApiError(400, "Informe x-idempotency-key ou id no payload.");
    const eventType = String(request.headers["x-event-type"] ?? payload.type ?? "unknown");
    const existing = await prisma.webhookInbox.findUnique({ where: { provider_externalId: { provider, externalId } } });
    if (existing) return reply.code(200).send({ duplicate: true, id: existing.id });
    const result = await prisma.$transaction(async (tx) => {
      const inbox = await tx.webhookInbox.create({ data: { provider, externalId, eventType, payloadJson: rawBody, signatureValid: true } });
      const event = await appendEvent(tx, `integration.${provider}.${eventType}`, "webhook_inbox", inbox.id, payload);
      return { inbox, event };
    });
    broadcastEvent(result.event);
    return reply.code(202).send({ accepted: true, id: result.inbox.id });
  });
}
