import type { SurveyQuestion } from "./api";

function hasAnswer(question: SurveyQuestion, value: unknown) {
  if (question.type === "free_text" && question.media && value && typeof value === "object") {
    const answer = value as { text?: string; upload?: { uploadId?: string } };
    return Boolean(answer.text?.trim() || answer.upload?.uploadId);
  }
  if (question.type === "media" && value && typeof value === "object") return typeof (value as { uploadId?: unknown }).uploadId === "string";
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined;
}

export function getVisibleSurveyQuestions(questions: SurveyQuestion[], answers: Record<string, unknown>) {
  const visible: SurveyQuestion[] = [];
  for (const question of questions) {
    const condition = question.visibility;
    if (!condition) { visible.push(question); continue; }
    const parent = visible.find((item) => item.id === condition.questionId);
    if (!parent) continue;
    const answer = answers[parent.id];
    const answered = hasAnswer(parent, answer);
    const selected = answer && typeof answer === "object" && !Array.isArray(answer) ? (answer as Record<string, unknown>).choice : answer;
    const matches = condition.operator === "answered" ? answered
      : condition.operator === "not_answered" ? !answered
        : condition.operator === "equals" ? selected === condition.value
          : Array.isArray(answer) && answer.includes(condition.value);
    if (matches) visible.push(question);
  }
  return visible;
}
