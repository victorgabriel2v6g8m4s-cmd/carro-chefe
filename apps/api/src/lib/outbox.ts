import type { Prisma, PrismaClient } from "@carro-chefe/database";
import { eventBus } from "./event-bus";

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function appendEvent(db: DbClient, topic: string, aggregateType: string, aggregateId: string, payload: unknown) {
  return db.outboxEvent.create({ data: {
    topic, aggregateType, aggregateId, payloadJson: JSON.stringify(payload)
  }});
}

export function broadcastEvent(event: { id: string; topic: string; aggregateType: string; aggregateId: string; payloadJson: string; createdAt: Date }) {
  eventBus.publish({
    id: event.id,
    topic: event.topic,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: JSON.parse(event.payloadJson),
    createdAt: event.createdAt.toISOString()
  });
}
