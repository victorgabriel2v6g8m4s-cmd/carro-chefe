import { z } from "zod";

export const sessionParamsSchema = z.object({ sessionId: z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/) }).strict();
export const runParamsSchema = z.object({ runId: z.string().trim().min(1).max(200) }).strict();

export const browserInteractionSchema = z.object({
  action: z.enum(["click", "click_text", "type", "back", "reload", "scroll"]),
  x: z.number().min(0).max(1440).optional(),
  y: z.number().min(0).max(900).optional(),
  deltaY: z.number().min(-4000).max(4000).optional(),
  text: z.string().max(2_000).optional(),
  selector: z.string().max(500).optional()
}).strict();

export const browserTargetSchema = z.object({ url: z.string().trim().min(4).max(2_000) }).strict();
export const fileQuerySchema = z.object({ path: z.string().trim().min(1).max(2_000) }).strict();
