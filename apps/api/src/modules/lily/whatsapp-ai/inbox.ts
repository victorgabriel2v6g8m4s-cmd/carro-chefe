import crypto from "node:crypto";
import { lilyPrisma } from "@lily-acai/database";
import { lilyWhatsAppAIConfiguration } from "./config";
import { encryptWhatsAppPrivateValue, hashWhatsAppContact } from "./crypto";
import { classifyInboundMessage } from "./guardrails";

const MAX_INBOUND_CHARS = 4096;
const MAX_CONTACT_MESSAGES_PER_HOUR = 20;
const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
export type InboundWhatsAppMessage = {
  providerMessageId: string;
  from: string;
  timestamp: string;
  type: string;
  text?: string;
};

function parseReceivedAt(timestamp: string) {
  if (!/^\d{1,12}$/.test(timestamp)) throw new Error("WHATSAPP_MESSAGE_TIMESTAMP_INVALID");
  const date = new Date(Number(timestamp) * 1000);
  if (!Number.isFinite(date.getTime()) || Math.abs(Date.now() - date.getTime()) > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("WHATSAPP_MESSAGE_TIMESTAMP_OUT_OF_RANGE");
  }
  return date;
}

function normalizePhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(normalized)) throw new Error("WHATSAPP_SENDER_INVALID");
  return `+${normalized}`;
}

export async function persistInboundWhatsAppMessage(input: InboundWhatsAppMessage) {
  const configuration = lilyWhatsAppAIConfiguration();
  if (!configuration.inboxRequested) return { stored: false, reason: "inbox_disabled" as const };
  if (!configuration.inboxReady || !configuration.retentionDays) throw new Error("WHATSAPP_INBOX_RETENTION_OR_ENCRYPTION_NOT_CONFIGURED");
  if (input.providerMessageId.length > 200) throw new Error("WHATSAPP_MESSAGE_ID_INVALID");

  const receivedAt = parseReceivedAt(input.timestamp);
  const phoneE164 = normalizePhone(input.from);
  const contactHash = hashWhatsAppContact(phoneE164);
  const contentType = input.type.slice(0, 32).toLowerCase();
  const isText = contentType === "text" && typeof input.text === "string";
  const isOversized = isText && input.text!.length > MAX_INBOUND_CHARS;
  const body = isText && !isOversized ? input.text!.normalize("NFKC").trim() : `[Mensagem ${contentType || "não textual"}; encaminhar ao atendimento]`;
  const decision = isOversized || !isText || !body ? "human" : classifyInboundMessage(body);
  const expiresAt = new Date(receivedAt.getTime() + configuration.retentionDays * 24 * 60 * 60 * 1000);
  if (expiresAt <= new Date()) return { stored: false, reason: "retention_expired" as const };
  const windowExpiresAt = new Date(receivedAt.getTime() + SESSION_IDLE_MS);

  return lilyPrisma.$transaction(async (tx) => {
    const existingMessage = await tx.lilyWhatsAppConversationMessage.findUnique({ where: { providerMessageId: input.providerMessageId } });
    if (existingMessage) return { stored: true, duplicate: true as const, conversationId: existingMessage.conversationId };

    const contactWindowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recentInboundCount = await tx.lilyWhatsAppConversationMessage.count({
      where: { direction: "inbound", createdAt: { gte: contactWindowStart }, conversation: { contactHash } }
    });
    if (recentInboundCount >= MAX_CONTACT_MESSAGES_PER_HOUR) {
      return { stored: false, duplicate: false as const, reason: "contact_rate_limited" as const };
    }

    const existingPreference = await tx.lilyWhatsAppAIContactPreference.findUnique({ where: { contactHash } });
    const optsOut = decision === "opt_out" || Boolean(existingPreference?.aiOptedOut);
    const nextPreference = decision === "opt_out"
      ? await tx.lilyWhatsAppAIContactPreference.upsert({
        where: { contactHash },
        update: { aiOptedOut: true, optedOutAt: receivedAt },
        create: { contactHash, aiOptedOut: true, optedOutAt: receivedAt }
      })
      : null;
    void nextPreference;

    const existingConversation = await tx.lilyWhatsAppConversation.findFirst({
      where: {
        contactHash,
        expiresAt: { gt: receivedAt },
        status: { in: ["ai", "human", "opted_out"] },
        ...(optsOut ? {} : { windowExpiresAt: { gt: receivedAt } })
      },
      orderBy: { lastInboundAt: "desc" }
    });
    const conversation = existingConversation ?? await tx.lilyWhatsAppConversation.create({
      data: {
        id: crypto.randomUUID(),
        contactHash,
        contactCiphertext: encryptWhatsAppPrivateValue(phoneE164),
        status: optsOut ? "opted_out" : "human",
        lastInboundAt: receivedAt,
        windowExpiresAt,
        expiresAt
      }
    });
    const canUseAI = configuration.enabled && !optsOut && decision === "answer";
    const status = optsOut ? "opted_out" : canUseAI ? "ai" : "human";
    const message = await tx.lilyWhatsAppConversationMessage.create({
      data: {
        conversationId: conversation.id,
        providerMessageId: input.providerMessageId.slice(0, 200),
        direction: "inbound",
        contentType: isOversized ? "oversized" : contentType || "unknown",
        bodyCiphertext: encryptWhatsAppPrivateValue(body),
        status: canUseAI ? "queued" : status,
        expiresAt
      }
    });
    await tx.lilyWhatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        status,
        contactCiphertext: conversation.contactCiphertext,
        lastInboundAt: receivedAt,
        windowExpiresAt,
        expiresAt
      }
    });
    if (canUseAI) {
      await tx.lilyWhatsAppAIJob.create({
        data: { messageId: message.id, conversationId: conversation.id, status: "pending", nextAttemptAt: receivedAt }
      });
    }
    return { stored: true, duplicate: false as const, conversationId: conversation.id, messageId: message.id, queued: canUseAI, status };
  });
}

