import { createWebhookInbox, findWebhookInbox } from "./repository";

type InboundWebhook = { provider: string; externalId: string; eventType: string; rawBody: string; payload: Record<string, unknown> };

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function acceptInboundWebhook(input: InboundWebhook) {
  const existing = await findWebhookInbox(input.provider, input.externalId);
  if (existing) return { duplicate: true as const, id: existing.id };
  try {
    const result = await createWebhookInbox(input);
    return { duplicate: false as const, id: result.inbox.id, event: result.event };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const concurrent = await findWebhookInbox(input.provider, input.externalId);
    if (!concurrent) throw error;
    return { duplicate: true as const, id: concurrent.id };
  }
}
