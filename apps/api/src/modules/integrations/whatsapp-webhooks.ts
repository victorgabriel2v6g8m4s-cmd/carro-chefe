import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";

declare module "fastify" {
  interface FastifyRequest { rawBody?: string }
}

type Integration = "cooklily" | "carro-chefe";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function verifyToken(supplied: string, expected: string) {
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length
    && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
}

function verifySignature(rawBody: string, signature: string, appSecret: string) {
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(signature);
  return expectedBytes.length === suppliedBytes.length
    && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
}

function configurationFor(integration: Integration) {
  if (integration === "cooklily") {
    return {
      verifyToken: env("COOKLILY_WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
      appSecret: env("COOKLILY_WHATSAPP_APP_SECRET")
    };
  }
  return {
    verifyToken: env("CARRO_CHEFE_WHATSAPP_WEBHOOK_VERIFY_TOKEN"),
    appSecret: env("CARRO_CHEFE_WHATSAPP_APP_SECRET")
  };
}

function webhookPath(integration: Integration) {
  return `/api/v1/integrations/${integration}/whatsapp/webhook`;
}

const verificationQuery = z.object({
  "hub.mode": z.string().optional(),
  "hub.verify_token": z.string().optional(),
  "hub.challenge": z.string().optional()
}).passthrough();

type MetaWebhookBody = {
  entry?: Array<{ changes?: Array<{ value?: { messages?: unknown[]; statuses?: unknown[] } }> }>;
};

function getRecords(body: MetaWebhookBody) {
  const records: Array<{ kind: string; item: Record<string, unknown> }> = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const item of value.messages ?? []) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          records.push({ kind: "message.received", item: item as Record<string, unknown> });
        }
      }
      for (const item of value.statuses ?? []) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const statusItem = item as Record<string, unknown>;
          const status = typeof statusItem.status === "string" ? statusItem.status : "unknown";
          records.push({ kind: `message.status.${status.slice(0, 40)}`, item: statusItem });
        }
      }
    }
  }
  return records;
}

export async function integrationWhatsAppWebhookRoutes(app: FastifyInstance) {
  for (const integration of ["cooklily", "carro-chefe"] as const) {
    const path = webhookPath(integration);

    app.get(path, async (request, reply) => {
      const query = verificationQuery.parse(request.query);
      const expected = configurationFor(integration).verifyToken;
      if (!expected) {
        return reply.code(503).send({ error: "Webhook WhatsApp ainda não configurado." });
      }
      const valid = verifyToken(query["hub.verify_token"] ?? "", expected);
      if (query["hub.mode"] !== "subscribe" || !valid || !query["hub.challenge"]) {
        return reply.code(403).send({ error: "Verificação de webhook recusada." });
      }
      return reply.type("text/plain; charset=utf-8").send(query["hub.challenge"]);
    });

    app.post(path, {
      config: { rateLimit: { max: 300, timeWindow: "1 minute" } }
    }, async (request, reply) => {
      const appSecret = configurationFor(integration).appSecret;
      if (!appSecret) {
        return reply.code(503).send({ error: "Webhook WhatsApp ainda não configurado." });
      }
      const rawBody = request.rawBody;
      const signature = request.headers["x-hub-signature-256"];
      if (!rawBody || typeof signature !== "string" || !verifySignature(rawBody, signature, appSecret)) {
        return reply.code(401).send({ error: "Assinatura de webhook inválida." });
      }

      const records = getRecords(request.body as MetaWebhookBody);

      if (integration === "cooklily") {
        const receivedAt = new Date();
        for (const record of records) {
          const serialized = JSON.stringify(record.item);
          const payloadHash = crypto.createHash("sha256").update(serialized).digest("hex");
          const dedupeKey = crypto.createHash("sha256").update(record.kind + ":" + serialized).digest("hex");
          const providerMessageId = typeof record.item.id === "string"
            ? record.item.id.slice(0, 200)
            : null;
          const providerStatus = typeof record.item.status === "string"
            ? record.item.status.slice(0, 40)
            : null;
          await lilyPrisma.lilyWhatsAppWebhookEvent.upsert({
            where: { dedupeKey },
            update: {},
            create: {
              dedupeKey,
              eventType: record.kind,
              providerMessageId,
              providerStatus,
              payloadHash,
              receivedAt
            }
          });
        }
      }

      // Carro Chefe only acknowledges verified events until its event-processing
      // workflow is implemented. Neither integration persists message text or raw payloads.
      return reply.code(200).send({ received: true, events: records.length });
    });
  }
}
