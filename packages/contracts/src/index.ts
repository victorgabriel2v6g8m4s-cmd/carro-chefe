import { z } from "zod";

export const taskStatuses = ["backlog", "ready", "in_progress", "blocked", "review", "done", "cancelled"] as const;
export const agentRunStatuses = ["queued", "running", "waiting_input", "waiting_dependency", "succeeded", "failed", "cancelled"] as const;

export const scopedReferenceSchema = z.object({
  id: z.string().trim().min(1).max(240),
  type: z.enum(["task", "decision", "risk", "procurement", "upload", "run", "knowledge", "file", "url"]),
  label: z.string().trim().min(1).max(300),
  route: z.string().trim().max(2000).nullable().optional()
});

export const taskTransitionSchema = z.object({
  toStatus: z.enum(taskStatuses),
  justification: z.string().trim().min(8, "Explique a mudança em pelo menos 8 caracteres.").max(1600),
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO"),
  expectedVersion: z.number().int().positive(),
  evidence: z.array(z.string().trim().min(1)).max(30).default([])
});

export const uiStateSchema = z.object({
  route: z.string().startsWith("/gestao").max(500),
  search: z.string().max(1000).default(""),
  hash: z.string().max(200).default(""),
  scrollY: z.number().int().min(0).max(10_000_000).default(0),
  sidebarOpen: z.boolean().default(true),
  selectedTaskId: z.string().max(80).nullable().optional(),
  filters: z.record(z.string(), z.unknown()).default({})
});

export const createRunSchema = z.object({
  taskId: z.string().min(1).nullable().optional(),
  agentId: z.string().min(1),
  title: z.string().trim().min(3).max(180),
  objective: z.string().trim().min(10).max(4000),
  provider: z.enum(["manual", "codex-local"]).default("manual"),
  purpose: z.enum(["execution", "management_review", "management_chat", "consultation"]).default("execution"),
  complexity: z.enum(["routine", "standard", "complex", "critical"]).optional(),
  requestedBy: z.string().trim().min(2).max(80).default("PROPRIETARIO")
}).superRefine((input, context) => {
  if (input.purpose !== "management_chat" && !input.taskId) context.addIssue({ code: "custom", path: ["taskId"], message: "A tarefa é obrigatória para esta finalidade." });
});

export const agentStepSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).default("pending"),
  procedure: z.string().trim().max(8000).nullable().optional(),
  result: z.string().trim().max(8000).nullable().optional()
});

export const agentQuestionSchema = z.object({
  question: z.string().trim().min(5).max(1600),
  context: z.string().trim().min(5).max(4000),
  recommendation: z.string().trim().max(2000).nullable().optional(),
  options: z.array(z.string().trim().min(1)).max(8).default([]),
  blocking: z.boolean().default(true),
  askedBy: z.string().trim().min(2).max(80).optional()
});

export const answerQuestionSchema = z.object({
  answer: z.string().trim().min(2).max(4000),
  answeredBy: z.string().trim().min(2).max(80).default("PROPRIETARIO"),
  attachmentIds: z.array(z.string().trim().min(1)).max(12).default([]),
  references: z.array(scopedReferenceSchema).max(30).default([])
});

export const managementMessageSchema = z.object({
  content: z.string().trim().min(2).max(8000),
  attachmentIds: z.array(z.string().trim().min(1)).max(12).default([]),
  references: z.array(scopedReferenceSchema).max(30).default([]),
  submittedBy: z.string().trim().min(2).max(80).default("PROPRIETARIO")
});

export const agentDispatchSchema = z.object({
  to: z.string().trim().min(2).max(80),
  msg: z.string().trim().min(3).max(4000),
  data: z.string().trim().max(2000).nullable().optional(),
  isRequiredToProceed: z.boolean().default(false),
  dependencies: z.array(z.string().trim().min(1).max(240)).max(50).optional(),
  dependences: z.array(z.string().trim().min(1).max(240)).max(50).optional(),
  onSuccess: z.object({ unlock: z.array(z.string().trim().min(1).max(80)).max(20).default([]) }).optional(),
  onSucess: z.object({ unlock: z.array(z.string().trim().min(1).max(80)).max(20).default([]) }).optional()
}).transform((input) => ({
  to: input.to,
  msg: input.msg,
  data: input.data ?? null,
  isRequiredToProceed: input.isRequiredToProceed,
  dependencies: input.dependencies ?? input.dependences ?? [],
  onSuccess: input.onSuccess ?? input.onSucess ?? { unlock: [] }
}));

const knowledgeValueTypes = ["text", "address", "decision", "contact", "url", "number", "list"] as const;
const knowledgeStatuses = ["informed", "pending_verification", "verified", "derived"] as const;

export const createKnowledgeNodeSchema = z.object({
  parentId: z.string().trim().min(1).nullable().default(null),
  name: z.string().trim().min(2).max(160),
  kind: z.enum(["branch", "fact"]).default("branch"),
  value: z.string().trim().max(12_000).nullable().default(null),
  valueType: z.enum(knowledgeValueTypes).default("text"),
  verificationStatus: z.enum(knowledgeStatuses).default("informed"),
  references: z.array(scopedReferenceSchema).max(30).default([]),
  attachmentIds: z.array(z.string().trim().min(1)).max(12).default([]),
  sourceRunId: z.string().trim().min(1).nullable().optional(),
  sourceIntentId: z.string().trim().min(1).nullable().optional(),
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO")
}).superRefine((input, context) => {
  if (input.kind === "fact" && !input.value) context.addIssue({ code: "custom", path: ["value"], message: "Informe o conteúdo deste fato." });
});

export const updateKnowledgeNodeSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  kind: z.enum(["branch", "fact"]).optional(),
  value: z.string().trim().max(12_000).nullable().optional(),
  valueType: z.enum(knowledgeValueTypes).optional(),
  verificationStatus: z.enum(knowledgeStatuses).optional(),
  references: z.array(scopedReferenceSchema).max(30).optional(),
  attachmentIds: z.array(z.string().trim().min(1)).max(12).optional(),
  expectedVersion: z.number().int().positive(),
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO")
});

export const captureKnowledgeSchema = z.object({
  path: z.string().trim().min(2).max(500),
  value: z.string().trim().min(1).max(12_000),
  name: z.string().trim().min(2).max(160).optional(),
  valueType: z.enum(knowledgeValueTypes).default("text"),
  verificationStatus: z.enum(knowledgeStatuses).default("derived"),
  actor: z.string().trim().min(2).max(80).optional()
});

export const usageSchema = z.object({
  source: z.enum(["runtime", "estimated", "manual", "unavailable"]),
  model: z.string().max(100).nullable().optional(),
  inputTokens: z.number().int().min(0).nullable().optional(),
  cachedInputTokens: z.number().int().min(0).nullable().optional(),
  outputTokens: z.number().int().min(0).nullable().optional(),
  reasoningTokens: z.number().int().min(0).nullable().optional(),
  totalTokens: z.number().int().min(0).nullable().optional(),
  durationMs: z.number().int().min(0).nullable().optional(),
  costMicros: z.number().int().min(0).nullable().optional()
});

export const operationalIntentSchema = z.object({
  prompt: z.string().trim().min(8, "Descreva o que deve ser feito em pelo menos 8 caracteres.").max(8000),
  submittedBy: z.string().trim().min(2).max(80).default("proprietario"),
  attachmentIds: z.array(z.string().min(1)).max(12).default([])
});

export const agentLogSchema = z.object({
  channel: z.enum(["activity", "terminal", "system", "error"]),
  eventType: z.string().trim().min(2).max(80),
  // Comandos produzidos pelo SDK podem ser extensos. O título é apenas uma
  // prévia visual; o conteúdo completo continua disponível no corpo do log.
  title: z.string().trim().max(50_000).transform((value) => value.slice(0, 500)).nullable().optional(),
  content: z.string().max(50_000).default("")
});

export const agentReportSchema = z.object({
  outcome: z.enum(["succeeded", "partial", "failed", "waiting_input", "cancelled"]),
  summary: z.string().trim().min(5).max(8000),
  diagnosis: z.string().trim().max(8000).nullable().optional(),
  successes: z.array(z.string().trim().min(1).max(2000)).max(50).default([]),
  failures: z.array(z.string().trim().min(1).max(2000)).max(50).default([]),
  recommendations: z.array(z.string().trim().min(1).max(2000)).max(30).default([]),
  evidence: z.array(z.string().trim().min(1).max(2000)).max(50).default([]),
  generatedBy: z.string().trim().min(2).max(80)
});

export const agentCommunicationSchema = z.object({
  sourceId: z.string().trim().min(2).max(80),
  targetId: z.string().trim().min(2).max(80),
  kind: z.enum(["delegation", "coordination", "handoff", "question", "answer", "result", "decision", "update"]),
  status: z.enum(["planned", "delivered", "acknowledged", "failed"]).default("delivered"),
  summary: z.string().trim().min(2).max(4000),
  intentId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const decisionContextSchema = z.object({
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO"),
  content: z.string().trim().min(3).max(12_000),
  sourceUrl: z.string().trim().url().max(2_000).nullable().optional()
});

export const decisionStatusSchema = z.object({
  status: z.enum(["pending", "in_review", "resolved", "cancelled"]),
  resolution: z.string().trim().min(8).max(8_000),
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO")
});

export const browserNavigationSchema = z.object({
  actor: z.string().trim().min(2).max(80),
  targetType: z.enum(["url", "file", "upload"]),
  target: z.string().trim().min(1).max(2_000),
  title: z.string().trim().max(180).nullable().optional(),
  reason: z.string().trim().max(1_600).nullable().optional()
});

export const createTaskSchema = z.object({
  id: z.string().trim().regex(/^TASK-[A-Z0-9-]+$/).max(80),
  pillarId: z.string().trim().min(1).max(80),
  milestoneId: z.string().trim().min(1).max(80),
  ownerAgentId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(5).max(240),
  impact: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  status: z.enum(taskStatuses).default("backlog"),
  acceptance: z.string().trim().min(8).max(4000),
  dependencyIds: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO")
});

export const createDecisionSchema = z.object({
  id: z.string().trim().regex(/^DEC-[A-Z0-9-]+$/).max(80),
  question: z.string().trim().min(8).max(2000),
  ownerAgentId: z.string().trim().min(1).max(80),
  due: z.string().trim().max(80).nullable().optional(),
  recommendation: z.string().trim().max(8000).nullable().optional(),
  actor: z.string().trim().min(2).max(80).default("PROPRIETARIO")
});

export type TaskTransitionInput = z.infer<typeof taskTransitionSchema>;
export type UiStateInput = z.infer<typeof uiStateSchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;
