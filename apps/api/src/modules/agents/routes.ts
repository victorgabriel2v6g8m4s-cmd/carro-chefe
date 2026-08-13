import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { agentCommunicationSchema, agentLogSchema, agentQuestionSchema, agentReportSchema, agentStepSchema, answerQuestionSchema, createRunSchema, usageSchema } from "@carro-chefe/contracts";
import { z } from "zod";
import { ApiError, parseJson } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { markIntentRunning, reconcileIntent } from "../intents/service";
import { deriveJourney, deriveRunReport, presentReport } from "./diagnostics";

const messageSchema = z.object({ sender: z.string().min(2).max(80), kind: z.enum(["update", "question", "answer", "decision", "error"]), content: z.string().min(1).max(8000) });
const statusSchema = z.object({ status: z.enum(["queued", "running", "waiting_input", "succeeded", "failed", "cancelled"]), currentStep: z.string().max(500).nullable().optional(), externalThreadId: z.string().max(200).optional() });

const runInclude = {
  task: { select: { id: true, title: true, status: true } },
  agent: true,
  intent: { select: { id: true, subject: true, summary: true, status: true, uploads: { orderBy: { createdAt: "asc" as const } } } },
  steps: { orderBy: { order: "asc" as const } },
  messages: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: { createdAt: "desc" as const } },
  usage: { orderBy: { createdAt: "asc" as const } }
};
const runDetailInclude = {
  ...runInclude,
  report: true,
  communications: { orderBy: { createdAt: "asc" as const } },
  logs: { orderBy: { sequence: "desc" as const }, take: 500 }
};

function presentRun(run: any) {
  return {
    ...run,
    logs: run.logs ? [...run.logs].reverse() : undefined,
    questions: run.questions?.map((question: any) => ({ ...question, options: parseJson(question.optionsJson, []), optionsJson: undefined })),
    communications: run.communications?.map((item: any) => ({ ...item, metadata: parseJson(item.metadataJson, {}), metadataJson: undefined })),
    report: run.report ? presentReport(run.report) : run.logs ? deriveRunReport(run) : undefined,
    journey: run.logs ? deriveJourney(run) : undefined
  };
}

async function requireRun(runId: string) {
  const run = await prisma.agentRun.findUnique({ where: { id: runId }, include: runDetailInclude });
  if (!run) throw new ApiError(404, "Execução de agente não encontrada.");
  return run;
}

export async function agentRoutes(app: FastifyInstance) {
  app.get("/api/v1/agents", async () => prisma.agentDefinition.findMany({ orderBy: { order: "asc" } }));
  app.get("/api/v1/agent-runs", async (request) => {
    const query = request.query as { taskId?: string; status?: string };
    const runs = await prisma.agentRun.findMany({ where: { taskId: query.taskId || undefined, status: query.status || undefined }, include: runInclude, orderBy: { createdAt: "desc" } });
    return runs.map(presentRun);
  });
  app.post("/api/v1/agent-runs", async (request, reply) => {
    const input = createRunSchema.parse(request.body);
    const [task, agent] = await Promise.all([prisma.task.findUnique({ where: { id: input.taskId } }), prisma.agentDefinition.findUnique({ where: { id: input.agentId } })]);
    if (!task || !agent) throw new ApiError(400, "Tarefa ou agente inexistente.");
    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.agentRun.create({ data: input });
      await tx.agentMessage.create({ data: { runId: run.id, sender: input.requestedBy, kind: "update", content: `Execução criada: ${input.objective}` } });
      await tx.agentCommunication.create({ data: { runId: run.id, sourceId: input.requestedBy, targetId: input.agentId, kind: "delegation", summary: input.title } });
      await tx.auditEvent.create({ data: { taskId: task.id, actor: input.requestedBy, action: "agent_run_created", entityType: "agent_run", entityId: run.id, summary: input.title } });
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
    return prisma.agentLog.findMany({ where: { runId, sequence: { gt: afterSequence } }, orderBy: { sequence: "asc" }, take: limit });
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
  app.post("/api/v1/agent-runs/:runId/questions", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = await requireRun(runId);
    const input = agentQuestionSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.agentQuestion.create({ data: { runId, taskId: run.taskId, askedBy: input.askedBy,
        question: input.question, context: input.context, recommendation: input.recommendation,
        optionsJson: JSON.stringify(input.options), blocking: input.blocking } });
      if (input.blocking) await tx.agentRun.update({ where: { id: runId }, data: { status: "waiting_input", lastHeartbeatAt: new Date() } });
      await tx.agentMessage.create({ data: { runId, sender: input.askedBy, kind: "question", content: input.question } });
      await tx.agentCommunication.create({ data: { runId, intentId: run.intentId, sourceId: input.askedBy, targetId: "PROPRIETARIO", kind: "question", status: "delivered", summary: input.question } });
      await tx.notification.create({ data: { userId: "owner", type: "question", title: "Um agente precisa de você", message: input.question, route: `/gestao/agentes/execucoes/${runId}` } });
      const event = await appendEvent(tx, "agent.question.asked", "agent_run", runId, question);
      return { question, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send({ ...result.question, options: input.options });
  });
  app.get("/api/v1/agent-questions", async (request) => {
    const query = request.query as { status?: string; taskId?: string };
    const questions = await prisma.agentQuestion.findMany({ where: { status: query.status || undefined, taskId: query.taskId || undefined },
      include: { task: { select: { id: true, title: true } }, run: { select: { id: true, title: true, agent: true } } }, orderBy: { createdAt: "desc" } });
    return questions.map((question) => ({ ...question, options: parseJson(question.optionsJson, []), optionsJson: undefined }));
  });
  app.post("/api/v1/agent-questions/:questionId/answer", async (request) => {
    const { questionId } = request.params as { questionId: string };
    const input = answerQuestionSchema.parse(request.body);
    const current = await prisma.agentQuestion.findUnique({ where: { id: questionId } });
    if (!current) throw new ApiError(404, "Pergunta não encontrada.");
    if (current.status !== "pending") throw new ApiError(409, "Esta pergunta já foi respondida.");
    const result = await prisma.$transaction(async (tx) => {
      const question = await tx.agentQuestion.update({ where: { id: questionId }, data: { status: "answered", answer: input.answer, answeredBy: input.answeredBy, answeredAt: new Date() } });
      await tx.agentMessage.create({ data: { runId: current.runId, sender: input.answeredBy, kind: "answer", content: input.answer } });
      const run = await tx.agentRun.findUniqueOrThrow({ where: { id: current.runId }, select: { intentId: true } });
      await tx.agentCommunication.create({ data: { runId: current.runId, intentId: run.intentId, sourceId: input.answeredBy, targetId: current.askedBy, kind: "answer", status: "delivered", summary: input.answer } });
      await tx.agentRun.update({ where: { id: current.runId }, data: { status: "queued", lastHeartbeatAt: new Date() } });
      await tx.notification.updateMany({ where: { userId: "owner", type: "question", route: `/gestao/agentes/execucoes/${current.runId}`, readAt: null }, data: { readAt: new Date() } });
      await tx.auditEvent.create({ data: { taskId: current.taskId, actor: input.answeredBy, action: "agent_question_answered", entityType: "agent_question", entityId: questionId, summary: input.answer } });
      const event = await appendEvent(tx, "agent.answer.submitted", "agent_run", current.runId, question);
      return { question, event };
    });
    broadcastEvent(result.event);
    return result.question;
  });
  app.post("/api/v1/agent-questions/:questionId/acknowledge", async (request) => {
    const { questionId } = request.params as { questionId: string };
    const current = await prisma.agentQuestion.findUnique({ where: { id: questionId } });
    if (!current) throw new ApiError(404, "Pergunta não encontrada.");
    if (current.status !== "answered") throw new ApiError(409, "A pergunta não está pronta para confirmação.");
    const question = await prisma.agentQuestion.update({ where: { id: questionId }, data: { status: "acknowledged", acknowledgedAt: new Date() } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.answer.acknowledged", aggregateType: "agent_run", aggregateId: current.runId, payloadJson: JSON.stringify(question) } });
    broadcastEvent(event);
    return question;
  });
  app.post("/api/v1/agent-runs/:runId/usage", async (request) => {
    const { runId } = request.params as { runId: string };
    await requireRun(runId);
    const usage = await prisma.usageRecord.create({ data: { runId, ...usageSchema.parse(request.body) } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.usage.updated", aggregateType: "agent_run", aggregateId: runId, payloadJson: JSON.stringify(usage) } });
    broadcastEvent(event);
    return usage;
  });
  app.get("/api/v1/usage/summary", async () => {
    const usage = await prisma.usageRecord.findMany();
    const measured = usage.filter((entry) => entry.source === "runtime");
    return {
      source: measured.length ? "runtime" : "unavailable",
      totalTokens: measured.reduce((sum, entry) => sum + (entry.totalTokens ?? 0), 0),
      inputTokens: measured.reduce((sum, entry) => sum + (entry.inputTokens ?? 0), 0),
      outputTokens: measured.reduce((sum, entry) => sum + (entry.outputTokens ?? 0), 0),
      records: usage.length,
      planQuota: null,
      note: measured.length ? "Consumo reportado pelas execuções conectadas." : "Conecte o bridge local do Codex para receber consumo real."
    };
  });
}
