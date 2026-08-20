import { z } from "zod";

export const webhookEventListSchema = z.array(z.string().trim().min(1).max(160)).min(1).max(100);

export const webhookEndpointSchema = z.object({
  name: z.string().trim().min(2).max(100),
  url: z.string().trim().url().max(2_000),
  events: webhookEventListSchema,
  secretRef: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,199}$/)
}).strict();

export const webhookProviderSchema = z.object({ provider: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/) }).strict();
export const webhookExternalIdSchema = z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f]+$/);
export const webhookEventTypeSchema = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);

export function webhookPayload(input: unknown) {
  return z.record(z.string(), z.unknown()).parse(input);
}
