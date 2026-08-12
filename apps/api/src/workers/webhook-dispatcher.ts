import crypto from "node:crypto";
import { prisma } from "@carro-chefe/database";
import { holdWorkerPort } from "./singleton";

const workerLock = await holdWorkerPort(4175, "Dispatcher de webhooks");
if (!workerLock) process.exit(0);
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

function secretFor(reference: string) {
  const secret = process.env[reference];
  if (!secret) throw new Error(`Segredo ${reference} não configurado no ambiente.`);
  return secret;
}

async function deliver(event: any, endpoint: any) {
  const existing = await prisma.webhookDelivery.findFirst({ where: { endpointId: endpoint.id, eventId: event.id } });
  if (existing?.status === "delivered") return true;
  const delivery = existing ?? await prisma.webhookDelivery.create({ data: { endpointId: endpoint.id, eventId: event.id } });
  const signature = `sha256=${crypto.createHmac("sha256", secretFor(endpoint.secretRef)).update(event.payloadJson).digest("hex")}`;
  try {
    const response = await fetch(endpoint.url, { method: "POST", headers: { "Content-Type": "application/json", "X-CarroChefe-Signature": signature, "X-Idempotency-Key": event.id, "X-Event-Type": event.topic }, body: event.payloadJson, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: "delivered", attempt: { increment: 1 }, responseCode: response.status, deliveredAt: new Date(), error: null } });
    return true;
  } catch (error) {
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: "failed", attempt: { increment: 1 }, error: error instanceof Error ? error.message : String(error) } });
    return false;
  }
}

console.log("Dispatcher de webhooks conectado à outbox. Ctrl+C para encerrar.");
while (!stopping) {
  const event = await prisma.outboxEvent.findFirst({ where: { status: "pending", availableAt: { lte: new Date() } }, orderBy: { createdAt: "asc" } });
  if (!event) { await new Promise((resolve) => setTimeout(resolve, 2500)); continue; }
  const endpoints = (await prisma.webhookEndpoint.findMany({ where: { enabled: true } })).filter((endpoint) => {
    const events = JSON.parse(endpoint.eventsJson) as string[];
    return events.includes("*") || events.includes(event.topic);
  });
  const outcomes = await Promise.all(endpoints.map((endpoint) => deliver(event, endpoint)));
  const succeeded = outcomes.every(Boolean);
  const attempts = event.attempts + 1;
  await prisma.outboxEvent.update({ where: { id: event.id }, data: succeeded ? { status: "processed", attempts, processedAt: new Date(), lastError: null } : {
    attempts, lastError: "Uma ou mais entregas falharam.", availableAt: new Date(Date.now() + Math.min(300_000, 2 ** attempts * 1000)), status: attempts >= 8 ? "failed" : "pending"
  } });
}
workerLock.close();
await prisma.$disconnect();
