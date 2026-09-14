import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { managementMessageSchema } from "@carro-chefe/contracts";
import { z } from "zod";
import { ApiError, parseJson } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { assessComplexity, selectRuntimeProfile } from "../agents/model-policy";
import { resolveReferenceContext } from "../references/service";
import { capturePromptKnowledge } from "../knowledge/service";
import { buildExecutionShortcuts } from "../agents/shortcuts";

const createConversationSchema = z.object({ userId: z.string().trim().min(2).max(80).default("owner"), title: z.string().trim().min(2).max(180).default("Conversa com Gestão") });
const runtimeResponseSchema = z.object({ runId: z.string().trim().min(1), content: z.string().trim().min(1).max(8000), sender: z.string().trim().min(2).max(80).default("AG-GESTAO") });

function presentMessage(message: any) {
  return { ...message, references: parseJson(message.referencesJson, []), referencesJson: undefined,
    run: message.run ? { ...message.run, shortcuts: buildExecutionShortcuts(message.run) } : message.run };
}

function conversationInclude() {
  return {
    messages: { include: { uploads: { orderBy: { createdAt: "asc" as const } }, run: { select: { id: true, agentId: true, taskId: true, purpose: true, status: true, currentStep: true, report: true } } }, orderBy: { createdAt: "asc" as const }, take: 100 },
    runs: { select: { id: true, status: true, currentStep: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" as const }, take: 20 }
  };
}

function presentConversation(conversation: any) {
  return { ...conversation, messages: conversation.messages.map(presentMessage) };
}

export async function managementRoutes(app: FastifyInstance) {
  app.get("/api/v1/management-conversations", async (request) => {
    const query = request.query as { userId?: string; status?: string; limit?: string };
    const items = await prisma.managementConversation.findMany({ where: { userId: query.userId || "owner", status: query.status || undefined },
      include: conversationInclude(), orderBy: { updatedAt: "desc" }, take: Math.max(1, Math.min(20, Number(query.limit ?? 10) || 10)) });
    return items.map(presentConversation);
  });

  app.post("/api/v1/management-conversations", async (request, reply) => {
    const input = createConversationSchema.parse(request.body ?? {});
    const conversation = await prisma.managementConversation.create({ data: input, include: conversationInclude() });
    return reply.code(201).send(presentConversation(conversation));
  });

  app.get("/api/v1/management-conversations/:conversationId", async (request) => {
    const conversation = await prisma.managementConversation.findUnique({ where: { id: (request.params as { conversationId: string }).conversationId }, include: conversationInclude() });
    if (!conversation) throw new ApiError(404, "Conversa não encontrada.");
    return presentConversation(conversation);
  });

  app.post("/api/v1/management-conversations/:conversationId/messages", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const input = managementMessageSchema.parse(request.body);
    const [conversation, agent] = await Promise.all([
      prisma.managementConversation.findUnique({ where: { id: conversationId } }),
      prisma.agentDefinition.findUnique({ where: { id: "AG-GESTAO" } })
    ]);
    if (!conversation || conversation.status !== "active") throw new ApiError(404, "Conversa ativa não encontrada.");
    if (!agent) throw new ApiError(503, "Agente de Gestão não configurado.");
    const uploads = input.attachmentIds.length ? await prisma.upload.findMany({ where: { id: { in: input.attachmentIds } } }) : [];
    if (uploads.length !== new Set(input.attachmentIds).size) throw new ApiError(400, "Um ou mais anexos não existem.");
    if (uploads.some((upload) => upload.runId || upload.intentId || upload.taskId || upload.decisionId || upload.questionId || upload.managementMessageId)) throw new ApiError(409, "Um dos anexos já pertence a outro contexto.");
    const references = await resolveReferenceContext(input.references.map((reference) => reference.id));
    if (references.length !== new Set(input.references.map((reference) => reference.id)).size) throw new ApiError(400, "Uma ou mais referências não pertencem ao projeto.");
    const previousRun = await prisma.agentRun.findFirst({ where: { managementConversationId: conversationId, externalThreadId: { not: null } }, orderBy: { createdAt: "desc" } });
    const complexity = assessComplexity(input.content);
    const profile = selectRuntimeProfile("AG-GESTAO", complexity, agent.model);
    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.agentRun.create({ data: { taskId: null, agentId: "AG-GESTAO", managementConversationId: conversationId,
        provider: "codex-local", externalThreadId: previousRun?.externalThreadId, title: input.content.slice(0, 120), objective: input.content,
        requestedBy: input.submittedBy, purpose: "management_chat", complexity, selectedModel: profile.model,
        selectedReasoningEffort: profile.effort, routingReason: profile.reason } });
      const message = await tx.managementMessage.create({ data: { conversationId, runId: run.id, sender: input.submittedBy, content: input.content, referencesJson: JSON.stringify(references) } });
      if (input.attachmentIds.length) await tx.upload.updateMany({ where: { id: { in: input.attachmentIds } }, data: { runId: run.id, managementMessageId: message.id } });
      await capturePromptKnowledge(tx, input.content, { actor: input.submittedBy, sourceType: "prompt", sourceId: message.id,
        sourceRunId: run.id, attachmentIds: input.attachmentIds });
      await tx.agentMessage.create({ data: { runId: run.id, sender: input.submittedBy, kind: "update", content: input.content } });
      await tx.agentCommunication.create({ data: { runId: run.id, sourceId: input.submittedBy, targetId: "AG-GESTAO", kind: "coordination", status: "delivered", summary: input.content,
        metadataJson: JSON.stringify({ conversationId, references, attachmentIds: input.attachmentIds }) } });
      await tx.managementConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date(), title: conversation.title === "Conversa com Gestão" ? input.content.slice(0, 90) : undefined } });
      await tx.auditEvent.create({ data: { actor: input.submittedBy, action: "management_message_sent", entityType: "management_conversation", entityId: conversationId, summary: input.content.slice(0, 500) } });
      const event = await appendEvent(tx, "management.message.created", "management_conversation", conversationId, { conversationId, runId: run.id, messageId: message.id, sender: message.sender });
      return { run, message, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send({ ...presentMessage({ ...result.message, uploads }), run: result.run });
  });

  app.post("/api/v1/management-conversations/:conversationId/runtime-responses", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const input = runtimeResponseSchema.parse(request.body);
    const run = await prisma.agentRun.findFirst({ where: { id: input.runId, managementConversationId: conversationId } });
    if (!run) throw new ApiError(404, "Execução da conversa não encontrada.");
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.managementMessage.findFirst({ where: { conversationId, runId: input.runId, sender: input.sender } });
      const message = existing
        ? await tx.managementMessage.update({ where: { id: existing.id }, data: { content: input.content } })
        : await tx.managementMessage.create({ data: { conversationId, runId: input.runId, sender: input.sender, content: input.content } });
      await capturePromptKnowledge(tx, input.content, { actor: input.sender, sourceType: "agent_output", sourceId: message.id, sourceRunId: input.runId });
      await tx.managementConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      const event = await appendEvent(tx, "management.response.created", "management_conversation", conversationId, { conversationId, runId: input.runId, messageId: message.id });
      return { message, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send(presentMessage({ ...result.message, uploads: [] }));
  });
}
