import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { createDecisionSchema, decisionContextSchema, decisionStatusSchema } from "@carro-chefe/contracts";
import { ApiError } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";

const decisionInclude = {
  contexts: { orderBy: { createdAt: "desc" as const } },
  uploads: { orderBy: { createdAt: "desc" as const } },
  auditEvents: { orderBy: { createdAt: "desc" as const }, take: 100 }
};

export async function governanceRoutes(app: FastifyInstance) {
  app.post("/api/v1/decisions", async (request, reply) => {
    const input = createDecisionSchema.parse(request.body);
    if (await prisma.decision.findUnique({ where: { id: input.id } })) throw new ApiError(409, "Já existe uma decisão com este ID.");
    if (!await prisma.agentDefinition.findUnique({ where: { id: input.ownerAgentId } })) throw new ApiError(400, "Agente responsável inexistente.");
    const result = await prisma.$transaction(async (tx) => {
      const decision = await tx.decision.create({ data: { id: input.id, projectId: "carro-chefe", question: input.question, ownerAgentId: input.ownerAgentId,
        due: input.due, recommendation: input.recommendation, status: "pending" } });
      await tx.auditEvent.create({ data: { decisionId: decision.id, actor: input.actor, action: "decision_added", entityType: "decision", entityId: decision.id,
        summary: `Decisão adicionada: ${decision.question}`, afterJson: JSON.stringify(decision) } });
      const event = await appendEvent(tx, "decision.created", "decision", decision.id, decision); return { decision, event };
    });
    broadcastEvent(result.event); return reply.code(201).send(result.decision);
  });
  app.get("/api/v1/decisions/:decisionId", async (request) => {
    const { decisionId } = request.params as { decisionId: string };
    const decision = await prisma.decision.findUnique({ where: { id: decisionId }, include: decisionInclude });
    if (!decision) throw new ApiError(404, "Decisão não encontrada.");
    return decision;
  });

  app.post("/api/v1/decisions/:decisionId/context", async (request, reply) => {
    const { decisionId } = request.params as { decisionId: string };
    const input = decisionContextSchema.parse(request.body);
    const decision = await prisma.decision.findUnique({ where: { id: decisionId } });
    if (!decision) throw new ApiError(404, "Decisão não encontrada.");
    const result = await prisma.$transaction(async (tx) => {
      const context = await tx.decisionContext.create({ data: { decisionId, ...input } });
      await tx.auditEvent.create({ data: { decisionId, actor: input.actor, action: "decision_context_added", entityType: "decision", entityId: decisionId,
        summary: `Informação adicionada à decisão: ${input.content.slice(0, 240)}`, afterJson: JSON.stringify({ contextId: context.id, sourceUrl: input.sourceUrl }) } });
      const event = await appendEvent(tx, "decision.context.added", "decision", decisionId, context);
      return { context, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send(result.context);
  });

  app.post("/api/v1/decisions/:decisionId/status", async (request) => {
    const { decisionId } = request.params as { decisionId: string };
    const input = decisionStatusSchema.parse(request.body);
    const current = await prisma.decision.findUnique({ where: { id: decisionId } });
    if (!current) throw new ApiError(404, "Decisão não encontrada.");
    if (current.status === input.status && current.resolution === input.resolution) throw new ApiError(400, "A decisão já possui este estado e resolução.");
    const result = await prisma.$transaction(async (tx) => {
      const decision = await tx.decision.update({ where: { id: decisionId }, data: { status: input.status, resolution: input.resolution } });
      await tx.auditEvent.create({ data: { decisionId, actor: input.actor, action: input.status === "cancelled" ? "decision_cancelled" : "decision_resolved",
        entityType: "decision", entityId: decisionId, summary: input.resolution,
        beforeJson: JSON.stringify({ status: current.status, resolution: current.resolution }), afterJson: JSON.stringify({ status: decision.status, resolution: decision.resolution }) } });
      const event = await appendEvent(tx, "decision.status.changed", "decision", decisionId, decision);
      return { decision, event };
    });
    broadcastEvent(result.event);
    return result.decision;
  });
}
