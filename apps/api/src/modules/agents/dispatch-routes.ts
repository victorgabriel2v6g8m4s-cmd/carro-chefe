import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { agentDispatchSchema } from "@carro-chefe/contracts";
import { ApiError, parseJson } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { resolveReferenceContext } from "../references/service";
import { assessComplexity, assertAgentScope, selectRuntimeProfile } from "./model-policy";
import { requireRun } from "./run-presenter";

function presentDispatch(item: any) {
  return { ...item, context: parseJson(item.contextJson, {}), dependencies: parseJson(item.dependenciesJson, []), onSuccess: parseJson(item.onSuccessJson, {}),
    contextJson: undefined, dependenciesJson: undefined, onSuccessJson: undefined };
}

function consolidatedObjective(source: any, items: any[]) {
  const requests = items.map((item, index) => `${index + 1}. ${item.message}${item.dataRef ? `\n   Contexto solicitado: ${item.dataRef}` : ""}`).join("\n");
  const references = items.flatMap((item) => parseJson<{ references?: any[] }>(item.contextJson, { references: [] }).references ?? []);
  const uniqueReferences = [...new Map(references.map((item) => [`${item.type}:${item.id}`, item])).values()];
  return `Consulta consolidada de ${source.agentId} (${source.id}).\nSolicitações:\n${requests}${uniqueReferences.length ? `\nReferências resolvidas pela Central:\n${uniqueReferences.map((item) => `- ${item.id}: ${item.label}${item.detail ? ` — ${item.detail}` : ""}`).join("\n")}` : ""}\nEntregue um parecer objetivo ao agente solicitante. Não execute programação fora da sua especialidade.`;
}

export async function dispatchRoutes(app: FastifyInstance) {
  app.get("/api/v1/agent-runs/:runId/dispatches", async (request) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    return (await prisma.agentDispatch.findMany({ where: { sourceRunId: runId }, include: { targetAgent: true, resultRun: { include: { report: true } } }, orderBy: { createdAt: "asc" } })).map(presentDispatch);
  });

  app.post("/api/v1/agent-runs/:runId/send", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = await requireRun(runId);
    const input = agentDispatchSchema.parse(request.body);
    const target = await prisma.agentDefinition.findUnique({ where: { id: input.to } });
    if (!target?.enabled) throw new ApiError(400, "Agente de destino inexistente ou desabilitado.");
    const scope = assertAgentScope(target.id, input.msg);
    if (!scope.allowed) throw new ApiError(422, scope.message!);
    const references = await resolveReferenceContext(input.dependencies, run.taskId);
    if (references.length !== new Set(input.dependencies).size) throw new ApiError(400, "Uma ou mais dependências não existem no projeto.");
    const context = { sourceRunId: run.id, taskId: run.taskId, intentId: run.intentId, dataRef: input.data,
      task: run.task ? { id: run.task.id, title: run.task.title, status: run.task.status, acceptance: run.task.acceptance } : null, references };
    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.agentDispatch.create({ data: { sourceRunId: run.id, targetAgentId: target.id, message: input.msg, dataRef: input.data,
        contextJson: JSON.stringify(context), isRequiredToProceed: input.isRequiredToProceed,
        dependenciesJson: JSON.stringify(input.dependencies), onSuccessJson: JSON.stringify(input.onSuccess) } });
      await tx.agentCommunication.create({ data: { runId: run.id, intentId: run.intentId, sourceId: run.agentId, targetId: target.id,
        kind: "coordination", status: "planned", summary: input.msg, metadataJson: JSON.stringify({ dispatchId: dispatch.id, batched: true, required: input.isRequiredToProceed }) } });
      const event = await appendEvent(tx, "agent.dispatch.buffered", "agent_run", run.id, { dispatchId: dispatch.id, targetAgentId: target.id, required: input.isRequiredToProceed });
      return { dispatch, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send({ ...presentDispatch(result.dispatch), contextRoute: `/api/v1/agent-dispatches/${result.dispatch.id}/context` });
  });

  app.get("/api/v1/agent-dispatches/:dispatchId/context", async (request) => {
    const item = await prisma.agentDispatch.findUnique({ where: { id: (request.params as { dispatchId: string }).dispatchId } });
    if (!item) throw new ApiError(404, "Contexto de delegação não encontrado.");
    return presentDispatch(item);
  });

  app.post("/api/v1/agent-runs/:runId/dispatches/flush", async (request) => {
    const { runId } = request.params as { runId: string };
    const source = await requireRun(runId);
    const buffered = await prisma.agentDispatch.findMany({ where: { sourceRunId: runId, status: "buffered" }, include: { targetAgent: true }, orderBy: { createdAt: "asc" } });
    if (!buffered.length) return { createdRuns: [], requiredPending: false };
    const grouped = new Map<string, typeof buffered>();
    for (const item of buffered) grouped.set(item.targetAgentId, [...(grouped.get(item.targetAgentId) ?? []), item]);
    const groups = [...grouped.entries()];
    const createdRuns: string[] = [];
    const events: any[] = [];
    await prisma.$transaction(async (tx) => {
      for (const [targetAgentId, items] of groups) {
        const target = items[0].targetAgent;
        const objective = consolidatedObjective(source, items);
        const complexity = assessComplexity(objective, source.task?.impact, source.task?.urgency);
        const profile = selectRuntimeProfile(targetAgentId, complexity, target.model);
        const child = await tx.agentRun.create({ data: { taskId: source.taskId, agentId: targetAgentId, intentId: source.intentId,
          managementConversationId: source.managementConversationId, parentRunId: source.id, provider: "codex-local", purpose: "consultation",
          title: `Consulta consolidada de ${source.agentId}`, objective, requestedBy: source.agentId, complexity,
          selectedModel: profile.model, selectedReasoningEffort: profile.effort, routingReason: `${profile.reason}; ${items.length} solicitação(ões) em lote` } });
        createdRuns.push(child.id);
        await tx.agentDispatch.updateMany({ where: { id: { in: items.map((item) => item.id) } }, data: { status: "dispatched", resultRunId: child.id, dispatchedAt: new Date() } });
        await tx.agentMessage.create({ data: { runId: child.id, sender: source.agentId, kind: "update", content: objective } });
        await tx.agentCommunication.create({ data: { runId: child.id, intentId: source.intentId, sourceId: source.agentId, targetId: targetAgentId,
          kind: "handoff", status: "delivered", summary: `${items.length} solicitação(ões) consolidadas em uma única execução.`, metadataJson: JSON.stringify({ sourceRunId: source.id, dispatchIds: items.map((item) => item.id) }) } });
        events.push(await appendEvent(tx, "agent.dispatch.flushed", "agent_run", source.id, { sourceRunId: source.id, resultRunId: child.id, targetAgentId, dispatchIds: items.map((item) => item.id) }));
      }
      if (buffered.some((item) => item.isRequiredToProceed)) await tx.agentRun.update({ where: { id: source.id }, data: { status: "waiting_dependency", currentStep: "Aguardando pareceres obrigatórios consolidados" } });
    });
    events.forEach(broadcastEvent);
    return { createdRuns, requiredPending: buffered.some((item) => item.isRequiredToProceed) };
  });
}
