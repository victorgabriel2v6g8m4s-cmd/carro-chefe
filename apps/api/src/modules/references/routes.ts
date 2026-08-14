import type { FastifyInstance } from "fastify";
import { getScopedReferences } from "./service";

export async function referenceRoutes(app: FastifyInstance) {
  app.get("/api/v1/references", async (request) => {
    const query = request.query as { taskId?: string; q?: string; limit?: string };
    return getScopedReferences(query.taskId, query.q, Number(query.limit ?? 80));
  });
}
