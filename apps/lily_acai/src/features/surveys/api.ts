import { getLilySession, parseResponse } from "../../api";

export type SurveyQuestion = {
  id: string; type: string; title: string; description: string; required: boolean;
  visibility?: { questionId: string; operator: "answered" | "not_answered" | "equals" | "contains"; value?: string };
  options: SurveyOption[]; rows: string[]; columns: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  media?: { mimeTypes: string[]; maxBytes: number };
  cardMedia?: { url: string; type: "image" | "video"; altText: string };
  textAfterChoice?: boolean; positiveLabel?: string; negativeLabel?: string;
  style: { fontSize: "sm" | "md" | "lg" | "xl"; bold: boolean; italic: boolean; markdown: boolean; html?: string };
};
export type SurveyOption = string | { value: string; text?: string; media?: { url: string; type: "image" | "video"; altText: string } };
export function surveyOptionValue(option: SurveyOption) { return typeof option === "string" ? option : option.value; }
export function surveyOptionLabel(option: SurveyOption, index: number) { return typeof option === "string" ? option : option.text?.trim() || option.media?.altText?.trim() || `Opção visual ${index + 1}`; }
export type SurveyVisibility = NonNullable<SurveyQuestion["visibility"]>;

export type SurveyDefinition = {
  title: string; subtitle?: string | null; description?: string | null; questions: SurveyQuestion[];
  prerequisites: string[]; unlocksMissions: string[]; pointsPerForm: number; pointsPerAnswer: number;
  showPoints: boolean; allowNavigation: boolean; mediaMimeTypes: string[]; mediaMaxBytes: number;
  estimatedMinutes: number;
};

export type CustomerNotification = {
  id: string; type: string; title: string; body: string;
  metadata: { surveyId?: string; estimatedMinutes?: number; questionCount?: number; points?: number | null };
  readAt: string | null; createdAt: string;
};

export type SurveyAnalytics = {
  surveyId: string;
  survey: { id: string; title: string; status: string; definition: SurveyDefinition };
  views: number;
  responses: number;
  questions: Array<{
    questionId: string;
    answered: number;
    averageTimeMs: number | null;
    options: Array<{ label: string; count: number }>;
  }>;
};

export async function surveyJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/lily/${path}`, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  return parseResponse<T>(response);
}

export async function uploadSurveyAnswer(surveyId: string, questionId: string, file: File) {
  const session = await getLilySession();
  const form = new FormData();
  form.set("questionId", questionId);
  form.set("file", file);
  const response = await fetch(`/api/v1/lily/surveys/${encodeURIComponent(surveyId)}/uploads`, { method: "POST", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken }, body: form });
  return parseResponse<{ uploadId: string; name: string; mime: string; size: number }>(response);
}

export async function uploadSurveyOptionMedia(file: File) {
  const session = await getLilySession();
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/v1/lily/admin/survey-option-media", { method: "POST", credentials: "same-origin", headers: { "X-Lily-CSRF": session.csrfToken }, body: form });
  return parseResponse<{ url: string; type: "image" | "video"; mime: string; size: number }>(response);
}
