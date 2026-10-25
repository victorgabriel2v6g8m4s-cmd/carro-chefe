import { z } from "zod";

export const SURVEY_QUESTION_TYPES = [
  "single_choice", "multiple_choice", "free_text", "media", "choice_text",
  "binary_swipe", "short_answer", "paragraph", "checkboxes", "dropdown",
  "linear_scale", "multiple_choice_grid", "checkbox_grid", "date", "datetime"
] as const;

const questionSchema = z.object({
  id: z.string().trim().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  type: z.enum(SURVEY_QUESTION_TYPES),
  title: z.string().trim().min(1).max(240),
  description: z.string().max(4000).optional().default(""),
  required: z.boolean().default(false),
  visibility: z.object({ questionId: z.string().trim().min(1).max(80), operator: z.enum(["answered", "not_answered", "equals", "contains"]), value: z.string().max(180).optional() }).strict().optional(),
  options: z.array(z.string().trim().min(1).max(180)).max(100).default([]),
  rows: z.array(z.string().trim().min(1).max(180)).max(40).default([]),
  columns: z.array(z.string().trim().min(1).max(180)).max(40).default([]),
  scale: z.object({ min: z.number().int().min(0).max(100), max: z.number().int().min(1).max(100), minLabel: z.string().max(80).optional(), maxLabel: z.string().max(80).optional() }).optional(),
  media: z.object({ mimeTypes: z.array(z.string().regex(/^[\w.+-]+\/[\w.+*-]+$/)).max(20), maxBytes: z.number().int().min(1).max(10 * 1024 * 1024) }).optional(),
  cardMedia: z.object({ url: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "A mídia da pergunta precisa usar HTTPS."), type: z.enum(["image", "video"]), altText: z.string().trim().max(240).default("") }).optional(),
  textAfterChoice: z.boolean().optional(),
  positiveLabel: z.string().max(80).optional(),
  negativeLabel: z.string().max(80).optional(),
  style: z.object({ fontSize: z.enum(["sm", "md", "lg", "xl"]).default("md"), bold: z.boolean().default(false), italic: z.boolean().default(false), markdown: z.boolean().default(false), html: z.string().max(4000).optional() }).default({ fontSize: "md", bold: false, italic: false, markdown: false })
}).strict().superRefine((question, context) => {
  if (["single_choice", "multiple_choice", "checkboxes", "dropdown", "choice_text"].includes(question.type) && question.options.length === 0) {
    context.addIssue({ code: "custom", path: ["options"], message: "Este tipo de pergunta exige opções." });
  }
  if (["multiple_choice_grid", "checkbox_grid"].includes(question.type) && (!question.rows.length || !question.columns.length)) {
    context.addIssue({ code: "custom", path: ["rows"], message: "Grades exigem linhas e colunas." });
  }
  if (new Set(question.options).size !== question.options.length || new Set(question.rows).size !== question.rows.length || new Set(question.columns).size !== question.columns.length) {
    context.addIssue({ code: "custom", path: ["options"], message: "Opções, linhas e colunas não podem se repetir." });
  }
  if (question.cardMedia && question.type !== "binary_swipe") {
    context.addIssue({ code: "custom", path: ["cardMedia"], message: "A mídia do cartão está disponível apenas para respostas de arrastar." });
  }
  if (question.type === "media" && (!question.media || !question.media.mimeTypes.length)) {
    context.addIssue({ code: "custom", path: ["media"], message: "Configure tipos de arquivo e tamanho máximo." });
  }
  if (question.type === "linear_scale" && (!question.scale || question.scale.min >= question.scale.max)) {
    context.addIssue({ code: "custom", path: ["scale"], message: "Configure uma escala crescente válida." });
  }
});

export const surveyDefinitionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  subtitle: z.string().trim().max(240).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  questions: z.array(questionSchema).min(1).max(100),
  prerequisites: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  unlocksMissions: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  pointsPerForm: z.number().int().min(0).max(100000).default(0),
  pointsPerAnswer: z.number().int().min(0).max(100000).default(0),
  showPoints: z.boolean().default(false),
  allowNavigation: z.boolean().default(true),
  mediaMimeTypes: z.array(z.string().regex(/^[\w.+-]+\/[\w.+*-]+$/)).max(20).default([]),
  mediaMaxBytes: z.number().int().min(0).max(10 * 1024 * 1024).default(0),
  estimatedMinutes: z.number().int().min(1).max(180).default(5)
}).strict().superRefine((definition, context) => {
  const ids = definition.questions.map((question) => question.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["questions"], message: "Os identificadores das perguntas devem ser únicos." });
  const mediaQuestions = definition.questions.filter((question) => question.media);
  if (mediaQuestions.length && (!definition.mediaMimeTypes.length || definition.mediaMaxBytes < 1)) context.addIssue({ code: "custom", path: ["mediaMimeTypes"], message: "Pesquisas com anexos precisam configurar formatos e limite de mídia." });
  for (const question of mediaQuestions) {
    if (question.media!.maxBytes > definition.mediaMaxBytes || question.media!.mimeTypes.some((mime) => !definition.mediaMimeTypes.includes(mime))) context.addIssue({ code: "custom", path: ["questions"], message: "Os limites e formatos das perguntas devem estar dentro da configuração geral da pesquisa." });
  }
  const questionIndex = new Map(definition.questions.map((question, index) => [question.id, index]));
  for (const [index, question] of definition.questions.entries()) {
    const condition = question.visibility;
    if (!condition) continue;
    const parent = definition.questions[questionIndex.get(condition.questionId) ?? -1];
    if (!parent || (questionIndex.get(condition.questionId) ?? index) >= index) {
      context.addIssue({ code: "custom", path: ["questions", index, "visibility"], message: "A condição deve referenciar uma pergunta anterior." });
      continue;
    }
    if (["equals", "contains"].includes(condition.operator)) {
      const choices = parent.type === "binary_swipe" ? ["positive", "negative"] : parent.options;
      const multiple = ["multiple_choice", "checkboxes"].includes(parent.type);
      if (!condition.value || !choices.includes(condition.value) || (condition.operator === "contains" && !multiple) || (condition.operator === "equals" && multiple)) {
        context.addIssue({ code: "custom", path: ["questions", index, "visibility"], message: "A condição precisa usar uma resposta válida da pergunta anterior." });
      }
    } else if (condition.value !== undefined) {
      context.addIssue({ code: "custom", path: ["questions", index, "visibility", "value"], message: "Esta condição não usa um valor de resposta." });
    }
  }
});

export type SurveyDefinition = z.infer<typeof surveyDefinitionSchema>;
export type SurveyQuestion = SurveyDefinition["questions"][number];

export function sanitizeSurveyHtml(input: string) {
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "h2", "h3", "blockquote", "code", "pre"]);
  return input.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, rawName: string) => {
    const name = rawName.toLowerCase();
    if (!allowed.has(name)) return "";
    return tag.startsWith("</") ? `</${name}>` : `<${name}>`;
  });
}

export function normalizeDefinition(definition: SurveyDefinition): SurveyDefinition {
  return {
    ...definition,
    questions: definition.questions.map((question) => ({
      ...question,
      style: { ...question.style, html: question.style.html ? sanitizeSurveyHtml(question.style.html) : undefined }
    }))
  };
}

export function answerIsPresent(value: unknown) {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined;
}

export function questionAnswerIsPresent(question: SurveyQuestion, value: unknown) {
  if (question.type === "free_text" && question.media && value && typeof value === "object" && !Array.isArray(value)) {
    const response = value as Record<string, unknown>;
    const upload = response.upload as Record<string, unknown> | undefined;
    return (typeof response.text === "string" && response.text.trim().length > 0) || typeof upload?.uploadId === "string";
  }
  if (question.type === "media" && value && typeof value === "object" && !Array.isArray(value)) return typeof (value as Record<string, unknown>).uploadId === "string";
  return answerIsPresent(value);
}

export function visibleSurveyQuestions(definition: SurveyDefinition, answers: Record<string, unknown>) {
  const visible: SurveyQuestion[] = [];
  for (const question of definition.questions) {
    const condition = question.visibility;
    if (!condition) { visible.push(question); continue; }
    const parent = visible.find((item) => item.id === condition.questionId);
    if (!parent) continue;
    const answer = answers[parent.id];
    const answered = questionAnswerIsPresent(parent, answer);
    const choice = answer && typeof answer === "object" && !Array.isArray(answer) ? (answer as Record<string, unknown>).choice : answer;
    const matches = condition.operator === "answered" ? answered
      : condition.operator === "not_answered" ? !answered
        : condition.operator === "equals" ? choice === condition.value
          : Array.isArray(answer) && answer.includes(condition.value);
    if (matches) visible.push(question);
  }
  return visible;
}

export function validateSurveyAnswers(definition: SurveyDefinition, answers: unknown) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const values = answers as Record<string, unknown>;
  const visibleIds = new Set(visibleSurveyQuestions(definition, values).map(({ id }) => id));
  for (const question of definition.questions) {
    if (!visibleIds.has(question.id)) continue;
    const value = values[question.id];
    if (question.required && !questionAnswerIsPresent(question, value)) return question.id;
    if (!questionAnswerIsPresent(question, value)) continue;
    if (["single_choice", "dropdown", "binary_swipe"].includes(question.type) && (typeof value !== "string" || (question.type !== "binary_swipe" && !question.options.includes(value)))) return question.id;
    if (["multiple_choice", "checkboxes"].includes(question.type) && (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !question.options.includes(item)))) return question.id;
    if (question.type === "choice_text" && (!value || typeof value !== "object" || Array.isArray(value) || !question.options.includes(String((value as Record<string, unknown>).choice ?? "")) || (question.textAfterChoice !== true && answerIsPresent((value as Record<string, unknown>).text)))) return question.id;
    if (question.type === "binary_swipe" && value !== "positive" && value !== "negative") return question.id;
    if (["multiple_choice_grid", "checkbox_grid"].includes(question.type)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return question.id;
      const grid = value as Record<string, unknown>;
      if (Object.entries(grid).some(([row, selected]) => !question.rows.includes(row) || (question.type === "multiple_choice_grid" ? typeof selected !== "string" || !question.columns.includes(selected) : !Array.isArray(selected) || selected.some((column) => typeof column !== "string" || !question.columns.includes(column))))) return question.id;
    }
    if (question.type === "media" && (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as Record<string, unknown>).uploadId !== "string")) return question.id;
    if (question.type === "linear_scale" && (!Number.isInteger(value) || Number(value) < question.scale!.min || Number(value) > question.scale!.max)) return question.id;
    if (question.type === "free_text" && question.media && value && typeof value === "object" && !Array.isArray(value)) {
      const response = value as Record<string, unknown>;
      if ((response.text !== undefined && (typeof response.text !== "string" || response.text.length > 10000)) || (response.upload !== undefined && (!response.upload || typeof response.upload !== "object" || typeof (response.upload as Record<string, unknown>).uploadId !== "string"))) return question.id;
    } else if (["free_text", "short_answer", "paragraph"].includes(question.type) && (typeof value !== "string" || value.length > 10000)) return question.id;
    if (["date", "datetime"].includes(question.type) && (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || value.length > 40)) return question.id;
  }
  return null;
}
