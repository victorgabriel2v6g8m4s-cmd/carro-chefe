import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "../admin-security";
import { decryptWhatsAppPrivateValue, encryptWhatsAppPrivateValue } from "./crypto";
import { lilyWhatsAppAIConfiguration } from "./config";
import { validPublicKnowledgeArticle, saveWhatsAppKnowledgeArticle } from "./knowledge";
import { sendWhatsAppSessionText } from "./providers";

const listQuery = z.object({
  status: z.enum(["ai", "human", "resolved", "opted_out"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(5000).default(0)
}).strict();
const idParams = z.object({ id: z.string().min(8).max(128) }).strict();
const conversationMutation = z.object({
  status: z.enum(["ai", "human", "resolved"]).optional(),
  assignedToUserId: z.string().min(8).max(128).nullable().optional()
}).strict().refine((input) => input.status !== undefined || input.assignedToUserId !== undefined);
const replyBody = z.object({
  text: z.string().trim().min(1).max(1200),
  idempotencyKey: z.string().uuid()
}).strict();
const articleBody = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+){0,7}$/),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(8000),
  status: z.enum(["draft", "published", "archived"])
}).strict();

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `•••• ${digits.slice(-4)}`;
}

function safeCode(error: unknown) {
  const message = error instanceof Error ? error.message : "unknown";
  return /^[A-Z0-9_]{1,80}$/.test(message) ? message : "WHATSAPP_INBOX_ACTION_FAILED";
}

export async function lilyWhatsAppAIRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/whatsapp/ai/settings", async (request) => {
    await requireLilyStaff(request);
    const configuration = lilyWhatsAppAIConfiguration();
    const [openConversations, humanQueue, pendingJobs, todayUsage] = await Promise.all([
      lilyPrisma.lilyWhatsAppConversation.count({ where: { status: { in: ["ai", "human"] } } }),
      lilyPrisma.lilyWhatsAppConversation.count({ where: { status: "human" } }),
      lilyPrisma.lilyWhatsAppAIJob.count({ where: { status: { in: ["pending", "failed", "processing"] } } }),
      lilyPrisma.lilyWhatsAppAIUsage.findUnique({ where: { dateKey: new Date().toISOString().slice(0, 10) } })
    ]);
    return {
      inboxEnabled: configuration.inboxReady,
      aiEnabled: configuration.enabled,
      requested: { inbox: configuration.inboxRequested, ai: configuration.aiRequested },
      setup: {
        encryptionKeyConfigured: configuration.encryptionKeyConfigured,
        retentionDaysConfigured: configuration.retentionDaysConfigured,
        dailyRequestBudgetConfigured: configuration.dailyRequestBudgetConfigured,
        metaReady: configuration.metaReady,
        openAIReady: configuration.openAIReady,
        customerEmbeddingConsent: configuration.customerEmbeddingConsent
      },
      retentionDays: configuration.inboxReady ? configuration.retentionDays : null,
      requestBudget: configuration.maxDailyRequests,
      usage: { requests: todayUsage?.requests ?? 0, inputTokens: todayUsage?.responseInputTokens ?? 0, outputTokens: todayUsage?.responseOutputTokens ?? 0, embeddingTokens: todayUsage?.embeddingInputTokens ?? 0 },
      queue: { openConversations, humanQueue, pendingJobs }
    };
  });

  app.get("/api/v1/lily/admin/whatsapp/inbox", async (request) => {
    await requireLilyStaff(request);
    const query = listQuery.parse(request.query);
    const rows = await lilyPrisma.lilyWhatsAppConversation.findMany({
      where: { expiresAt: { gt: new Date() }, ...(query.status ? { status: query.status } : { status: { in: ["ai", "human", "opted_out"] } }) },
      orderBy: [{ updatedAt: "desc" }],
      take: query.limit,
      skip: query.offset,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, assignedTo: { select: { displayName: true, role: true } } }
    });
    return {
      conversations: rows.map((row) => ({
        id: row.id,
        contact: maskPhone(decryptWhatsAppPrivateValue(row.contactCiphertext)),
        status: row.status,
        assignedTo: row.assignedTo?.displayName ?? null,
        lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
        windowExpiresAt: row.windowExpiresAt?.toISOString() ?? null,
        expiresAt: row.expiresAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        lastMessage: row.messages[0] ? decryptWhatsAppPrivateValue(row.messages[0].bodyCiphertext) : ""
      }))
    };
  });

  app.get("/api/v1/lily/admin/whatsapp/inbox/:id", async (request) => {
    await requireLilyStaff(request);
    const { id } = idParams.parse(request.params);
    const conversation = await lilyPrisma.lilyWhatsAppConversation.findFirst({
      where: { id, expiresAt: { gt: new Date() } },
      include: { messages: { where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: "asc" }, take: 200 }, assignedTo: { select: { id: true, displayName: true } } }
    });
    if (!conversation) throw new ApiError(404, "Conversa não encontrada.", { code: "WHATSAPP_CONVERSATION_NOT_FOUND" });
    return {
      conversation: {
        id: conversation.id,
        contact: maskPhone(decryptWhatsAppPrivateValue(conversation.contactCiphertext)),
        status: conversation.status,
        assignedTo: conversation.assignedTo,
        windowExpiresAt: conversation.windowExpiresAt?.toISOString() ?? null,
        expiresAt: conversation.expiresAt.toISOString()
      },
      messages: conversation.messages.map((message) => ({
        id: message.id,
        direction: message.direction,
        contentType: message.contentType,
        text: decryptWhatsAppPrivateValue(message.bodyCiphertext),
        status: message.status,
        createdAt: message.createdAt.toISOString()
      }))
    };
  });

  app.patch("/api/v1/lily/admin/whatsapp/inbox/:id", async (request) => {
    const actor = await requireLilyAdmin(request, true);
    const { id } = idParams.parse(request.params);
    const input = conversationMutation.parse(request.body);
    const current = await lilyPrisma.lilyWhatsAppConversation.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "Conversa não encontrada.", { code: "WHATSAPP_CONVERSATION_NOT_FOUND" });
    if (input.status === "ai") {
      const preference = await lilyPrisma.lilyWhatsAppAIContactPreference.findUnique({ where: { contactHash: current.contactHash } });
      const configuration = lilyWhatsAppAIConfiguration();
      if (!configuration.enabled || !current.windowExpiresAt || current.windowExpiresAt <= new Date() || preference?.aiOptedOut) {
        throw new ApiError(409, "A IA não pode assumir: verifique configuração, janela e preferência de atendimento.", { code: "WHATSAPP_AI_REACTIVATION_BLOCKED" });
      }
    }
    if (input.assignedToUserId) {
      const assigned = await lilyPrisma.lilyUser.findUnique({ where: { id: input.assignedToUserId }, select: { role: true, status: true } });
      if (!assigned || !["staff", "admin"].includes(assigned.role) || assigned.status !== "active") {
        throw new ApiError(400, "Responsável inválido ou sem acesso staff ativo.", { code: "WHATSAPP_ASSIGNEE_INVALID" });
      }
    }
    const updated = await lilyPrisma.lilyWhatsAppConversation.update({ where: { id }, data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.assignedToUserId !== undefined ? { assignedToUserId: input.assignedToUserId } : {})
    } });
    await auditLilyAdmin(actor.user.id, "whatsapp.inbox.update", "whatsapp-conversation", id, { status: updated.status, assigned: Boolean(input.assignedToUserId) });
    return { conversation: { id: updated.id, status: updated.status, assignedToUserId: updated.assignedToUserId } };
  });

  app.post("/api/v1/lily/admin/whatsapp/inbox/:id/replies", async (request, reply) => {
    const actor = await requireLilyAdmin(request, true);
    const { id } = idParams.parse(request.params);
    const input = replyBody.parse(request.body);
    const existing = await lilyPrisma.lilyWhatsAppConversationMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.conversationId !== id) throw new ApiError(409, "Chave de idempotência já usada em outra conversa.", { code: "WHATSAPP_REPLY_IDEMPOTENCY_CONFLICT" });
      return reply.code(existing.status === "sent" ? 200 : 202).send({ message: { id: existing.id, status: existing.status } });
    }
    const conversation = await lilyPrisma.lilyWhatsAppConversation.findUnique({ where: { id } });
    if (!conversation) throw new ApiError(404, "Conversa não encontrada.", { code: "WHATSAPP_CONVERSATION_NOT_FOUND" });
    if (conversation.status !== "human" || !conversation.windowExpiresAt || conversation.windowExpiresAt <= new Date() || conversation.expiresAt <= new Date()) {
      throw new ApiError(409, "A conversa está encerrada ou fora da janela de resposta livre do WhatsApp.", { code: "WHATSAPP_REPLY_WINDOW_CLOSED" });
    }
    const message = await lilyPrisma.lilyWhatsAppConversationMessage.create({
      data: {
        conversationId: conversation.id,
        idempotencyKey: input.idempotencyKey,
        direction: "outbound",
        contentType: "text",
        bodyCiphertext: encryptWhatsAppPrivateValue(input.text),
        status: "sending",
        expiresAt: conversation.expiresAt
      }
    });
    try {
      const providerMessageId = await sendWhatsAppSessionText({ phoneE164: decryptWhatsAppPrivateValue(conversation.contactCiphertext), text: input.text });
      await lilyPrisma.lilyWhatsAppConversationMessage.update({ where: { id: message.id }, data: { providerMessageId, status: "sent" } });
      await auditLilyAdmin(actor.user.id, "whatsapp.inbox.reply", "whatsapp-conversation", id, { messageId: message.id });
      return reply.code(201).send({ message: { id: message.id, status: "sent" } });
    } catch (error) {
      await lilyPrisma.lilyWhatsAppConversationMessage.update({ where: { id: message.id }, data: { status: "unknown" } });
      await lilyPrisma.lilyWhatsAppConversation.update({ where: { id }, data: { status: "human" } });
      await auditLilyAdmin(actor.user.id, "whatsapp.inbox.reply_unknown", "whatsapp-conversation", id, { messageId: message.id, errorCode: safeCode(error) });
      throw new ApiError(502, "O envio não foi confirmado. A mensagem não será reenviada automaticamente; confira a conversa antes de tentar novamente.", { code: "WHATSAPP_REPLY_RESULT_UNKNOWN" });
    }
  });

  app.get("/api/v1/lily/admin/whatsapp/ai/knowledge", async (request) => {
    await requireLilyStaff(request);
    const articles = await lilyPrisma.lilyWhatsAppKnowledgeArticle.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
    return { articles: articles.map(({ body, ...article }) => ({ ...article, body, updatedAt: article.updatedAt.toISOString() })) };
  });

  app.post("/api/v1/lily/admin/whatsapp/ai/knowledge", async (request, reply) => {
    const actor = await requireLilyStaff(request, true);
    const input = articleBody.parse(request.body);
    if (!validPublicKnowledgeArticle(input)) throw new ApiError(400, "A base pública não aceita telefone, e-mail, credencial ou dado sensível.", { code: "WHATSAPP_KNOWLEDGE_PRIVATE_DATA" });
    const article = await saveWhatsAppKnowledgeArticle({ ...input, actorUserId: actor.user.id });
    await auditLilyAdmin(actor.user.id, "whatsapp.ai.knowledge.create", "whatsapp-knowledge-article", article.id, { status: article.status, revision: article.revision });
    return reply.code(201).send({ article: { id: article.id, slug: article.slug, title: article.title, status: article.status, revision: article.revision } });
  });

  app.put("/api/v1/lily/admin/whatsapp/ai/knowledge/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const { id } = idParams.parse(request.params);
    const input = articleBody.parse(request.body);
    if (!validPublicKnowledgeArticle(input)) throw new ApiError(400, "A base pública não aceita telefone, e-mail, credencial ou dado sensível.", { code: "WHATSAPP_KNOWLEDGE_PRIVATE_DATA" });
    const article = await saveWhatsAppKnowledgeArticle({ ...input, id, actorUserId: actor.user.id });
    await auditLilyAdmin(actor.user.id, "whatsapp.ai.knowledge.update", "whatsapp-knowledge-article", article.id, { status: article.status, revision: article.revision });
    return { article: { id: article.id, slug: article.slug, title: article.title, status: article.status, revision: article.revision } };
  });
}

