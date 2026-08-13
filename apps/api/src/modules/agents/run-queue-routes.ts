import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";

export async function runQueueRoutes(app: FastifyInstance) {
  app.get("/api/v1/agent-run-queue", async (request) => {
    const query = request.query as { status?: string; limit?: string };
    const limit = Math.max(1, Math.min(50, Number(query.limit ?? 12) || 12));
    return prisma.agentRun.findMany({ where: { status: query.status || "queued", provider: "codex-local" },
      select: { id: true, intentId: true, provider: true, purpose: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: limit });
  });
}
