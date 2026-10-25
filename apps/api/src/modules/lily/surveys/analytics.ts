import type { SurveyDefinition } from "./contracts";

type SurveyQuestion = SurveyDefinition["questions"][number];

export const MAX_QUESTION_TIME_MS = 2 * 60 * 60 * 1000;

export function mergeQuestionTimes(
  definition: SurveyDefinition,
  current: Record<string, number>,
  incoming: Record<string, number>
) {
  return Object.fromEntries(definition.questions.flatMap(({ id }) => {
    const currentValue = current[id] ?? 0;
    const incomingValue = incoming[id] ?? 0;
    const value = Math.min(MAX_QUESTION_TIME_MS, Math.max(currentValue, incomingValue));
    return value > 0 ? [[id, value]] : [];
  }));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function selectedSurveyOptions(question: SurveyQuestion, answer: unknown): string[] {
  const record = objectValue(answer);
  switch (question.type) {
    case "single_choice":
    case "dropdown":
    case "multiple_choice":
    case "checkboxes":
      return stringValues(answer).filter((value) => question.options.includes(value));
    case "choice_text":
      return typeof record.choice === "string" && question.options.includes(record.choice) ? [record.choice] : [];
    case "binary_swipe":
      return answer === "positive" ? [question.positiveLabel || "Positivo"] : answer === "negative" ? [question.negativeLabel || "Negativo"] : [];
    case "linear_scale":
      return typeof answer === "number" && Number.isInteger(answer) && answer >= (question.scale?.min ?? 1) && answer <= (question.scale?.max ?? 5) ? [String(answer)] : [];
    case "multiple_choice_grid":
    case "checkbox_grid":
      return Object.entries(record).flatMap(([row, value]) => {
        if (!question.rows.includes(row)) return [];
        return stringValues(value).filter((column) => question.columns.includes(column)).map((column) => `${row} · ${column}`);
      });
    default:
      return [];
  }
}

export function questionAnswered(question: SurveyQuestion, answer: unknown): boolean {
  if (question.type === "free_text" && question.media && answer && typeof answer === "object") {
    const value = answer as { text?: unknown; upload?: { uploadId?: unknown } };
    return typeof value.text === "string" && value.text.trim().length > 0 || typeof value.upload?.uploadId === "string";
  }
  if (question.type === "media" && answer && typeof answer === "object") return typeof (answer as { uploadId?: unknown }).uploadId === "string";
  if (typeof answer === "string") return answer.trim().length > 0;
  if (Array.isArray(answer)) return answer.length > 0;
  return answer !== null && answer !== undefined && (typeof answer === "object" ? Object.keys(answer).length > 0 : true);
}

export function questionMetricKey(option: string) {
  return `option:${option}`;
}
