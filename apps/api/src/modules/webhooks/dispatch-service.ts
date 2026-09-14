import { prisma } from "@carro-chefe/database";
import { config } from "../../config";
import { validateWebhookDestination } from "./destination-policy";
import { webhookSignature } from "./signature";
import { webhookEventListSchema } from "./schemas";

type DispatchEvent = { id: string; topic: string; payloadJson: string };
type DispatchEndpoint = { id: string; url: string; secretRef: string };

function secretFor(reference: string) {
  const secret = process.env[reference];
  if (!secret) throw new Error(`Segredo ${reference} não configurado no ambiente.`);
  return secret;
}

async function deliver(event: DispatchEvent, endpoint: DispatchEndpoint) {
  const delivery = await prisma.webhookDelivery.upsert({
    where: { endpointId_eventId: { endpointId: endpoint.id, eventId: event.id } },
    create: { endpointId: endpoint.id, eventId: event.id },
    update: {}
  });
  if (delivery.status === "delivered") return true;
  try {
    const destination = await validateWebhookDestination(endpoint.url);
    const signature = webhookSignature(event.payloadJson, secretFor(endpoint.secretRef));
    const response = await fetch(destination, { method: "POST", headers: { "Content-Type": "application/json", "X-CarroChefe-Signature": signature,
      "X-Idempotency-Key": event.id, "X-Event-Type": event.topic }, body: event.payloadJson,
      signal: AbortSignal.timeout(config.outboundWebhookTimeoutMs), redirect: "error" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: "delivered", attempt: { increment: 1 }, responseCode: response.status, deliveredAt: new Date(), error: null } });
    return true;
  } catch (error) {
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: "failed", attempt: { increment: 1 }, error: error instanceof Error ? error.message : String(error) } });
    return false;
  }
}

function endpointAccepts(eventsJson: string, topic: string) {
  try {
    const parsed = webhookEventListSchema.safeParse(JSON.parse(eventsJson));
    return parsed.success && (parsed.data.includes("*") || parsed.data.includes(topic));
  } catch {
    return false;
  }
}

export async function dispatchNextWebhookEvent() {
  const event = await prisma.outboxEvent.findFirst({ where: { status: "pending", availableAt: { lte: new Date() } }, orderBy: { createdAt: "asc" } });
  if (!event) return false;
  const endpoints = (await prisma.webhookEndpoint.findMany({ where: { enabled: true } })).filter((endpoint) => endpointAccepts(endpoint.eventsJson, event.topic));
  const outcomes = await Promise.all(endpoints.map((endpoint) => deliver(event, endpoint)));
  const succeeded = outcomes.every(Boolean);
  const attempts = event.attempts + 1;
  await prisma.outboxEvent.update({ where: { id: event.id }, data: succeeded ? { status: "processed", attempts, processedAt: new Date(), lastError: null } : {
    attempts, lastError: "Uma ou mais entregas falharam.", availableAt: new Date(Date.now() + Math.min(300_000, 2 ** attempts * 1000)), status: attempts >= 8 ? "failed" : "pending"
  } });
  return true;
}
