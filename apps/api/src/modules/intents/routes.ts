import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { operationalIntentSchema } from "@carro-chefe/contracts";
import { ApiError } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { classifyIntent } from "./classifier";
import { intentInclude, presentIntent } from "./service";
import { config } from "../../config";

export async function intentRoutes(app: FastifyInstance) {
  app.get("/api/v1/intents", async (request) => {
    const query = request.query as { status?: string };
    const intents = await prisma.operationalIntent.findMany({ where: { status: query.status || undefined }, include: intentInclude, orderBy: { createdAt: "desc" }, take: 100 });
    return intents.map(presentIntent);
  });
  app.get("/api/v1/intents/:intentId", async (request) => {
    const intent = await prisma.operationalIntent.findUnique({ where: { id: (request.params as { intentId: string }).intentId }, include: intentInclude });
    if (!intent) throw new ApiError(404, "Comando não encontrado.");
    return presentIntent(intent);
  });
  app.post("/api/v1/intents", async (request, reply) => {
    const input = operationalIntentSchema.parse(request.body);
    const attachments = input.attachmentIds.length
      ? await prisma.upload.findMany({ where: { id: { in: input.attachmentIds } } })
      : [];
    if (attachments.length !== new Set(input.attachmentIds).size || attachments.some((item) => item.taskId || item.runId || item.intentId)) {
      throw new ApiError(400, "Um ou mais anexos não existem ou já pertencem a outro contexto.");
    }
    const classification = classifyIntent(input.prompt);
    const candidates = await prisma.task.findMany({ where: { ownerAgentId: { in: classification.agentIds }, status: { notIn: ["done", "cancelled"] } }, orderBy: [{ impact: "desc" }, { urgency: "desc" }] });
    const taskByAgent = Object.fromEntries(classification.agentIds.map((agentId) => [agentId, candidates.find((task) => task.id === classification.preferredTasks[agentId]) ?? candidates.find((task) => task.ownerAgentId === agentId)]));
    const missing = classification.agentIds.filter((agentId) => !taskByAgent[agentId]);
    if (missing.length) throw new ApiError(409, `Não há tarefa ativa para: ${missing.join(", ")}.`);
    const result = await prisma.$transaction(async (tx) => {
      const intent = await tx.operationalIntent.create({ data: { projectId: "carro-chefe", prompt: input.prompt, submittedBy: input.submittedBy, subject: classification.subject, summary: classification.summary, classificationJson: JSON.stringify({ ...classification, taskByAgent: Object.fromEntries(Object.entries(taskByAgent).map(([agentId, task]: any) => [agentId, task.id])) }) } });
      if (input.attachmentIds.length) await tx.upload.updateMany({ where: { id: { in: input.attachmentIds }, taskId: null, runId: null, intentId: null }, data: { intentId: intent.id } });
      for (const fact of classification.facts) await tx.businessFact.upsert({ where: { projectId_key: { projectId: "carro-chefe", key: fact.key } }, update: { value: fact.value, verificationStatus: fact.verificationStatus, sourceIntentId: intent.id }, create: { projectId: "carro-chefe", sourceIntentId: intent.id, ...fact } });
      if (classification.facts.some((fact) => fact.key === "erp.selected")) {
        const erp = classification.facts.find((fact) => fact.key === "erp.selected")?.value;
        await tx.decision.updateMany({ where: { id: "DEC-002" }, data: { status: "validating", resolution: `ERP informado pelo proprietário: ${erp}. Verificação em andamento no comando ${intent.id}.` } });
      }
      for (const agentId of classification.agentIds) {
        const task = taskByAgent[agentId]!;
        const attachmentNote = attachments.length ? `\n\nAnexos fornecidos: ${attachments.map((item) => item.originalName).join(", ")}.` : "";
        const run = await tx.agentRun.create({ data: { intentId: intent.id, taskId: task.id, agentId, provider: "codex-local", title: `${classification.subject} · ${agentId}`, objective: `${classification.summary}\n\nSolicitação original do proprietário: ${input.prompt}${attachmentNote}\n\nVerifique os requisitos do projeto, produza evidências, registre o procedimento e conclua com uma resposta objetiva. Não trate o dado informado como verificado antes da análise.`, requestedBy: input.submittedBy } });
        await tx.agentMessage.create({ data: { runId: run.id, sender: input.submittedBy, kind: "update", content: input.prompt } });
        await tx.agentCommunication.create({ data: { runId: run.id, intentId: intent.id, sourceId: input.submittedBy, targetId: agentId, kind: "delegation", status: "delivered", summary: classification.summary } });
      }
      if (classification.agentIds.length > 1) {
        for (let index = 1; index < classification.agentIds.length; index++) await tx.agentCommunication.create({ data: {
          intentId: intent.id, sourceId: classification.agentIds[index - 1], targetId: classification.agentIds[index], kind: "coordination", status: "planned",
          summary: `Cruzar conclusões de ${classification.agentIds[index - 1]} com ${classification.agentIds[index]} antes do resultado consolidado.`
        } });
      }
      await tx.auditEvent.create({ data: { actor: input.submittedBy, action: "operational_intent_created", entityType: "operational_intent", entityId: intent.id, summary: classification.summary } });
      const event = await appendEvent(tx, "intent.created", "operational_intent", intent.id, { intentId: intent.id, agents: classification.agentIds });
      return { intent, event };
    });
    broadcastEvent(result.event);
    const created = await prisma.operationalIntent.findUnique({ where: { id: result.intent.id }, include: intentInclude });
    return reply.code(201).send(presentIntent(created));
  });

  app.get("/api/v1/notifications", async (request) => {
    const query = request.query as { unread?: string };
    return prisma.notification.findMany({ where: { userId: config.defaultUserId, readAt: query.unread === "true" ? null : undefined }, orderBy: { createdAt: "desc" }, take: 50 });
  });
  app.post("/api/v1/notifications/:notificationId/read", async (request) => prisma.notification.update({ where: { id: (request.params as { notificationId: string }).notificationId }, data: { readAt: new Date() } }));
  app.post("/api/v1/notifications/read-all", async () => ({ count: (await prisma.notification.updateMany({ where: { userId: config.defaultUserId, readAt: null }, data: { readAt: new Date() } })).count }));
}
