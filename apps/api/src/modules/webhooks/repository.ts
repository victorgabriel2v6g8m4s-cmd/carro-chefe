import { prisma } from "@carro-chefe/database";
import { appendEvent } from "../../lib/outbox";

export function listWebhookEndpoints() {
  return prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export function createWebhookEndpoint(input: { name: string; url: string; events: string[]; secretRef: string }) {
  return prisma.webhookEndpoint.create({
    data: { name: input.name, url: input.url, eventsJson: JSON.stringify(input.events), secretRef: input.secretRef }
  });
}

export function findWebhookInbox(provider: string, externalId: string) {
  return prisma.webhookInbox.findUnique({ where: { provider_externalId: { provider, externalId } }, select: { id: true } });
}

export function createWebhookInbox(input: { provider: string; externalId: string; eventType: string; rawBody: string; payload: Record<string, unknown> }) {
  return prisma.$transaction(async (tx) => {
    const inbox = await tx.webhookInbox.create({ data: { provider: input.provider, externalId: input.externalId, eventType: input.eventType, payloadJson: input.rawBody, signatureValid: true } });
    const event = await appendEvent(tx, `integration.${input.provider}.${input.eventType}`, "webhook_inbox", inbox.id, input.payload);
    return { inbox, event };
  });
}
