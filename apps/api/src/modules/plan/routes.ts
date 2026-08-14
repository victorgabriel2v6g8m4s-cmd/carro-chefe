import type { FastifyInstance } from "fastify";
import { getBootstrap, getLegacyPlan } from "./service";
import { prisma } from "@carro-chefe/database";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../../config";

export async function planRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => ({ status: "ok", service: "Carro Chefe Central Operacional", storage: "prisma-sqlite", time: new Date().toISOString() }));
  app.get("/api/schema", async () => ({ version: "v1", workflow: "consultar → executar → perguntar/responder → auditar", realtime: "SSE" }));
  app.get("/api/v1", async () => ({ version: "v1", documentation: "/api/v1/openapi.yaml", health: "/api/health", bootstrap: "/api/v1/bootstrap", intents: "/api/v1/intents", managementConversations: "/api/v1/management-conversations", references: "/api/v1/references", notifications: "/api/v1/notifications", tasks: "/api/v1/tasks", runs: "/api/v1/agent-runs", questions: "/api/v1/agent-questions", uploads: "/api/v1/uploads", events: "/api/v1/events" }));
  app.get("/api/v1/openapi.yaml", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (_request, reply) => reply.type("application/yaml; charset=utf-8").send(await fs.readFile(path.join(config.projectRoot, "apps", "api", "openapi.yaml"), "utf8")));
  app.get("/api/plan", getLegacyPlan);
  app.get("/api/v1/bootstrap", getBootstrap);
  app.get("/api/v1/audit", async (request) => {
    const query = request.query as { taskId?: string; decisionId?: string; entityType?: string; action?: string; q?: string; page?: string; pageSize?: string };
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.max(10, Math.min(100, Number(query.pageSize ?? 25) || 25));
    const where = { taskId: query.taskId || undefined, decisionId: query.decisionId || undefined,
      entityType: query.entityType || undefined, action: query.action || undefined,
      OR: query.q ? [{ action: { contains: query.q } }, { entityType: { contains: query.q } }, { entityId: { contains: query.q } }, { summary: { contains: query.q } }, { actor: { contains: query.q } }] : undefined };
    const [items, total] = await Promise.all([
      prisma.auditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.auditEvent.count({ where })
    ]);
    return { items, page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
