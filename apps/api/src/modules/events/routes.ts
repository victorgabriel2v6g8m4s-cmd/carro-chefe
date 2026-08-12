import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { eventBus } from "../../lib/event-bus";

export async function eventRoutes(app: FastifyInstance) {
  app.get("/api/v1/events", async (request, reply) => {
    const lastId = String(request.headers["last-event-id"] ?? "");
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    if (lastId) {
      const last = await prisma.outboxEvent.findUnique({ where: { id: lastId } });
      if (last) {
        const missed = await prisma.outboxEvent.findMany({ where: { createdAt: { gt: last.createdAt } }, orderBy: { createdAt: "asc" }, take: 100 });
        for (const event of missed) reply.raw.write(`id: ${event.id}\nevent: ${event.topic}\ndata: ${event.payloadJson}\n\n`);
      }
    }
    reply.raw.write(`event: connected\ndata: {"time":"${new Date().toISOString()}"}\n\n`);
    const unsubscribe = eventBus.subscribe((event) => {
      reply.raw.write(`id: ${event.id}\nevent: ${event.topic}\ndata: ${JSON.stringify(event.payload)}\n\n`);
    });
    const heartbeat = setInterval(() => reply.raw.write(`: heartbeat ${Date.now()}\n\n`), 20_000);
    request.raw.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
  });
}
