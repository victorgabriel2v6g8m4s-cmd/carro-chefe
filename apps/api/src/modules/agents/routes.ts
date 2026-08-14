import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { agentCommunicationSchema, agentLogSchema, agentReportSchema, agentStepSchema, createRunSchema, usageSchema } from "@carro-chefe/contracts";
import { z } from "zod";
import { ApiError, parseJson } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { markIntentRunning, reconcileIntent } from "../intents/service";
import { presentReport } from "./diagnostics";
import { finalizeAgentRun } from "./completion";
import { assessComplexity, assertAgentScope, selectRuntimeProfile } from "./model-policy";
import { presentRun, requireRun, runInclude } from "./run-presenter";
import { agentStatsRoutes } from "./stats-routes";
import { runQueueRoutes } from "./run-queue-routes";
import { repairMojibake } from "../../lib/text";
import { questionRoutes } from "./question-routes";
import { dispatchRoutes } from "./dispatch-routes";
import { capturePromptKnowledge } from "../knowledge/service";

const messageSchema = z.object({ sender: z.string().min(2).max(80), kind: z.enum(["update", "question", "answer", "decision", "error"]), content: z.string().min(1).max(8000) });
const statusSchema = z.object({ status: z.enum(["queued", "running", "waiting_input", "waiting_dependency", "succeeded", "failed", "cancelled"]), currentStep: z.string().max(500).nullable().optional(), externalThreadId: z.string().max(200).optional() });

export async function agentRoutes(app: FastifyInstance) {
  await agentStatsRoutes(app);
  await runQueueRoutes(app);
  await questionRoutes(app);
  await dispatchRoutes(app);
  app.get("/api/v1/agent-runs", async (request) => {
    const query = request.query as { taskId?: string; status?: string };
    const runs = await prisma.agentRun.findMany({ where: { taskId: query.taskId || undefined, status: query.status || undefined }, include: runInclude, orderBy: { createdAt: "desc" } });
    return runs.map(presentRun);
  });
  app.post("/api/v1/agent-runs", async (request, reply) => {
    const input = createRunSchema.parse(request.body);
    const [task, agent] = await Promise.all([input.taskId ? prisma.task.findUnique({ where: { id: input.taskId } }) : null, prisma.agentDefinition.findUnique({ where: { id: input.agentId } })]);
    if ((!task && input.purpose !== "management_chat") || !agent) throw new ApiError(400, "Tarefa ou agente inexistente.");
    const scope = assertAgentScope(agent.id, `${input.title}\n${input.objective}`);
    if (!scope.allowed) throw new ApiError(422, scope.message!);
    const complexity = input.complexity ?? assessComplexity(`${input.title}\n${input.objective}\n${task?.acceptance ?? ""}`, task?.impact, task?.urgency);
    const profile = selectRuntimeProfile(agent.id, complexity, agent.model);
    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.agentRun.create({ data: { ...input, complexity, selectedModel: profile.model, selectedReasoningEffort: profile.effort, routingReason: profile.reason } });
      await capturePromptKnowledge(tx, input.objective, { actor: input.requestedBy, sourceType: "prompt", sourceId: run.id, sourceRunId: run.id });
      await tx.agentMessage.create({ data: { runId: run.id, sender: input.requestedBy, kind: "update", content: `Execução criada: ${input.objective}` } });
      await tx.agentCommunication.create({ data: { runId: run.id, sourceId: input.requestedBy, targetId: input.agentId, kind: "delegation", summary: input.title } });
      await tx.auditEvent.create({ data: { taskId: task?.id, actor: input.requestedBy, action: "agent_run_created", entityType: "agent_run", entityId: run.id, summary: input.title } });
      const event = await appendEvent(tx, "agent.run.created", "agent_run", run.id, run);
      return { run, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send(await requireRun(result.run.id).then(presentRun));
  });
  app.get("/api/v1/agent-runs/:runId", async (request) => presentRun(await requireRun((request.params as { runId: string }).runId)));
  app.post("/api/v1/agent-runs/:runId/claim", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const now = new Date();
    const claimed = await prisma.agentRun.updateMany({ where: { id: runId, status: "queued" }, data: { status: "running", startedAt: now, lastHeartbeatAt: now } });
    if (!claimed.count) throw new ApiError(409, "A execução já foi assumida ou não está na fila.");
    const run = await requireRun(runId);
    if (run.purpose === "consultation") await prisma.agentDispatch.updateMany({ where: { resultRunId: runId, status: "dispatched" }, data: { status: "running" } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.run.claimed", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(run) } });
    broadcastEvent(event);
    const intentEvent = await markIntentRunning(run.intentId);
    if (intentEvent) broadcastEvent(intentEvent);
    return reply.code(200).send(presentRun(run));
  });
  app.patch("/api/v1/agent-runs/:runId", async (request) => {
    const { runId } = request.params as { runId: string };
    const current = await requireRun(runId);
    const input = statusSchema.parse(request.body);
    const now = new Date();
    const run = await prisma.agentRun.update({ where: { id: runId }, data: { status: input.status, currentStep: input.currentStep,
      externalThreadId: input.externalThreadId, lastHeartbeatAt: now, startedAt: input.status === "running" && !current.startedAt ? now : undefined,
      finishedAt: ["succeeded", "failed", "cancelled"].includes(input.status) ? now : undefined } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.run.updated", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(run) } });
    broadcastEvent(event);
    if (["succeeded", "failed", "cancelled"].includes(run.status)) await finalizeAgentRun(runId);
    const intentEvent = await reconcileIntent(run.intentId);
    if (intentEvent) broadcastEvent(intentEvent);
    return run;
  });
  app.post("/api/v1/agent-runs/:runId/heartbeat", async (request) => prisma.agentRun.update({ where: { id: (request.params as { runId: string }).runId }, data: { lastHeartbeatAt: new Date() } }));
  app.post("/api/v1/agent-runs/:runId/steps", async (request) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const input = agentStepSchema.parse(request.body);
    const step = await prisma.agentStep.upsert({ where: { runId_order: { runId, order: input.order } }, update: {
      ...input, startedAt: input.status === "in_progress" ? new Date() : undefined,
      finishedAt: ["completed", "failed"].includes(input.status) ? new Date() : undefined
    }, create: { runId, ...input, startedAt: input.status === "in_progress" ? new Date() : undefined,
      finishedAt: ["completed", "failed"].includes(input.status) ? new Date() : undefined } });
    await prisma.agentRun.update({ where: { id: runId }, data: { currentStep: step.title, lastHeartbeatAt: new Date() } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.step.updated", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(step) } });
    broadcastEvent(event);
    return step;
  });
  app.post("/api/v1/agent-runs/:runId/messages", async (request) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const message = await prisma.agentMessage.create({ data: { runId, ...messageSchema.parse(request.body) } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.message.created", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(message) } });
    broadcastEvent(event);
    return message;
  });
  app.post("/api/v1/agent-runs/:runId/report", async (request) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const input = agentReportSchema.parse(request.body);
    const data = { outcome: input.outcome, summary: input.summary, diagnosis: input.diagnosis,
      successesJson: JSON.stringify(input.successes), failuresJson: JSON.stringify(input.failures),
      recommendationsJson: JSON.stringify(input.recommendations), evidenceJson: JSON.stringify(input.evidence), generatedBy: input.generatedBy };
    const report = await prisma.agentRunReport.upsert({ where: { runId }, update: data, create: { runId, ...data } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.report.updated", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(report) } });
    broadcastEvent(event);
    const current = await prisma.agentRun.findUnique({ where: { id: runId }, select: { status: true } });
    if (current && ["succeeded", "failed", "cancelled"].includes(current.status)) await finalizeAgentRun(runId);
    return presentReport(report);
  });
  app.post("/api/v1/agent-runs/:runId/communications", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = await requireRun(runId);
    const input = agentCommunicationSchema.parse(request.body);
    const communication = await prisma.agentCommunication.create({ data: { runId, intentId: input.intentId ?? run.intentId,
      sourceId: input.sourceId, targetId: input.targetId, kind: input.kind, status: input.status,
      summary: input.summary, metadataJson: JSON.stringify(input.metadata) } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.communication.created", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(communication) } });
    broadcastEvent(event);
    return reply.code(201).send({ ...communication, metadata: input.metadata, metadataJson: undefined });
  });
  app.get("/api/v1/agent-communications", async (request) => {
    const query = request.query as { intentId?: string; runId?: string; limit?: string };
    const limit = Math.max(1, Math.min(500, Number(query.limit ?? 200) || 200));
    const items = await prisma.agentCommunication.findMany({ where: { intentId: query.intentId || undefined, runId: query.runId || undefined }, orderBy: { createdAt: "desc" }, take: limit });
    return items.reverse().map((item) => ({ ...item, metadata: parseJson(item.metadataJson, {}), metadataJson: undefined }));
  });
  app.get("/api/v1/agent-runs/:runId/logs", async (request) => {
    const { runId } = request.params as { runId: string };
    const query = request.query as { afterSequence?: string; limit?: string };
    await requireRun(runId);
    const afterSequence = Math.max(0, Number(query.afterSequence ?? 0) || 0);
    const limit = Math.max(1, Math.min(1000, Number(query.limit ?? 500) || 500));
    const logs = await prisma.agentLog.findMany({ where: { runId, sequence: { gt: afterSequence } }, orderBy: { sequence: "asc" }, take: limit });
    return logs.map((log) => ({ ...log, title: log.title ? repairMojibake(log.title) : log.title, content: repairMojibake(log.content) }));
  });
  app.post("/api/v1/agent-runs/:runId/logs", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const input = agentLogSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const latest = await tx.agentLog.findFirst({ where: { runId }, orderBy: { sequence: "desc" }, select: { sequence: true } });
      const log = await tx.agentLog.create({ data: { runId, sequence: (latest?.sequence ?? 0) + 1, ...input } });
      await tx.agentRun.update({ where: { id: runId }, data: { lastHeartbeatAt: new Date() } });
      const event = await appendEvent(tx, "agent.log.created", "agent_run", runId, { runId, sequence: log.sequence, channel: log.channel, eventType: log.eventType });
      return { log, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send(result.log);
  });
  app.post("/api/v1/agent-runs/:runId/usage", async (request) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const usage = await prisma.usageRecord.create({ data: { runId, ...usageSchema.parse(request.body) } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.usage.updated", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(usage) } });
    broadcastEvent(event);
    return usage;
  });
}
