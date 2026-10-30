import { parseResponse } from "../../../api";

export type WhatsAppAISettings = {
  inboxEnabled: boolean;
  aiEnabled: boolean;
  setup: { encryptionKeyConfigured: boolean; retentionDaysConfigured: boolean; dailyRequestBudgetConfigured: boolean; metaReady: boolean; openAIReady: boolean; customerEmbeddingConsent: boolean };
  retentionDays: number | null;
  requestBudget: number | null;
  usage: { requests: number; inputTokens: number; outputTokens: number; embeddingTokens: number };
  queue: { openConversations: number; humanQueue: number; pendingJobs: number };
};

export type WhatsAppConversation = {
  id: string;
  contact: string;
  status: "ai" | "human" | "resolved" | "opted_out";
  assignedTo: string | null;
  lastInboundAt: string | null;
  windowExpiresAt: string | null;
  expiresAt: string;
  updatedAt: string;
  lastMessage: string;
};

export type WhatsAppConversationMessage = {
  id: string;
  direction: "inbound" | "outbound" | "internal";
  contentType: string;
  text: string;
  status: string;
  createdAt: string;
};

export type WhatsAppKnowledgeArticle = { id: string; slug: string; title: string; body: string; status: "draft" | "published" | "archived"; revision: number; updatedAt: string };

async function get<T>(path: string) {
  return parseResponse<T>(await fetch(path, { credentials: "same-origin", cache: "no-store" }));
}

async function mutate<T>(path: string, method: "POST" | "PUT" | "PATCH", csrf: string, body: unknown) {
  return parseResponse<T>(await fetch(path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": csrf }, body: JSON.stringify(body) }));
}

export const loadWhatsAppAISettings = () => get<WhatsAppAISettings>("/api/v1/lily/admin/whatsapp/ai/settings");
export const loadWhatsAppInbox = (status = "") => get<{ conversations: WhatsAppConversation[] }>(`/api/v1/lily/admin/whatsapp/inbox?limit=100${status ? `&status=${encodeURIComponent(status)}` : ""}`);
export const loadWhatsAppConversation = (id: string) => get<{ conversation: { id: string; contact: string; status: string; assignedTo: { id: string; displayName: string | null } | null; windowExpiresAt: string | null; expiresAt: string }; messages: WhatsAppConversationMessage[] }>(`/api/v1/lily/admin/whatsapp/inbox/${encodeURIComponent(id)}`);
export const setWhatsAppConversation = (id: string, csrf: string, body: { status?: string; assignedToUserId?: string | null }) => mutate<{ conversation: { id: string; status: string } }>(`/api/v1/lily/admin/whatsapp/inbox/${encodeURIComponent(id)}`, "PATCH", csrf, body);
export const replyWhatsAppConversation = (id: string, csrf: string, text: string, idempotencyKey: string) => mutate<{ message: { id: string; status: string } }>(`/api/v1/lily/admin/whatsapp/inbox/${encodeURIComponent(id)}/replies`, "POST", csrf, { text, idempotencyKey });
export const loadWhatsAppKnowledge = () => get<{ articles: WhatsAppKnowledgeArticle[] }>("/api/v1/lily/admin/whatsapp/ai/knowledge");
export const saveWhatsAppKnowledge = (csrf: string, article: Omit<WhatsAppKnowledgeArticle, "id" | "revision" | "updatedAt">, id?: string) => mutate<{ article: Pick<WhatsAppKnowledgeArticle, "id" | "slug" | "title" | "status" | "revision"> }>(id ? `/api/v1/lily/admin/whatsapp/ai/knowledge/${encodeURIComponent(id)}` : "/api/v1/lily/admin/whatsapp/ai/knowledge", id ? "PUT" : "POST", csrf, article);
