import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { ApiError } from "../../lib/errors";

export async function agentStatsRoutes(app: FastifyInstance) {
  app.get("/api/v1/agents", async () => prisma.agentDefinition.findMany({ orderBy: { order: "asc" } }));
  app.get("/api/v1/agents/:agentId/stats", async (request) => {
    const { agentId } = request.params as { agentId: string }; const agent = await prisma.agentDefinition.findUnique({ where: { id: agentId } });
    if (!agent) throw new ApiError(404, "Agente não encontrado.");
    const [runs, interactions, usage] = await Promise.all([prisma.agentRun.findMany({ where: { agentId }, include: { report: true }, orderBy: { createdAt: "desc" }, take: 500 }), prisma.agentCommunication.count({ where: { OR: [{ sourceId: agentId }, { targetId: agentId }] } }), prisma.usageRecord.aggregate({ where: { run: { agentId } }, _avg: { totalTokens: true, durationMs: true }, _sum: { totalTokens: true } })]);
    const terminal = runs.filter((run) => ["succeeded", "failed", "cancelled"].includes(run.status));
    const succeeded = terminal.filter((run) => run.status === "succeeded" && run.report?.outcome === "succeeded").length, failed = terminal.filter((run) => run.status === "failed" || run.report?.outcome === "failed").length, partial = terminal.filter((run) => run.report?.outcome === "partial").length;
    const measured = succeeded + failed + partial, successRate = measured ? Math.round((succeeded / measured) * 100) : null;
    return { agent, interactions, runs: runs.length, terminalRuns: terminal.length, succeeded, failed, partial, successRate, performance: successRate === null ? "Sem amostra suficiente" : successRate >= 85 ? "Excelente" : successRate >= 70 ? "Bom" : "Requer atenção", usage: { totalTokens: usage._sum.totalTokens, averageTokens: Math.round(usage._avg.totalTokens ?? 0), averageDurationMs: Math.round(usage._avg.durationMs ?? 0) }, recentRuns: runs.slice(0, 8).map((run) => ({ id: run.id, taskId: run.taskId, title: run.title, status: run.status, outcome: run.report?.outcome, createdAt: run.createdAt })) };
  });
  app.get("/api/v1/usage/summary", async () => { const usage = await prisma.usageRecord.findMany(); const measured = usage.filter((entry) => entry.source === "runtime"); return { source: measured.length ? "runtime" : "unavailable", totalTokens: measured.reduce((sum, entry) => sum + (entry.totalTokens ?? 0), 0), inputTokens: measured.reduce((sum, entry) => sum + (entry.inputTokens ?? 0), 0), outputTokens: measured.reduce((sum, entry) => sum + (entry.outputTokens ?? 0), 0), records: usage.length, planQuota: null, note: measured.length ? "Consumo reportado pelas execuções conectadas." : "Conecte o bridge local do Codex para receber consumo real." }; });
}
