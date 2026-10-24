import { getLilySession, parseResponse } from "../../api";

export type SurveyQuestion = {
  id: string; type: string; title: string; description: string; required: boolean;
  options: string[]; rows: string[]; columns: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  media?: { mimeTypes: string[]; maxBytes: number };
  textAfterChoice?: boolean; positiveLabel?: string; negativeLabel?: string;
  style: { fontSize: "sm" | "md" | "lg" | "xl"; bold: boolean; italic: boolean; markdown: boolean; html?: string };
};

export type SurveyDefinition = {
  title: string; subtitle?: string | null; description?: string | null; questions: SurveyQuestion[];
  prerequisites: string[]; unlocksMissions: string[]; pointsPerForm: number; pointsPerAnswer: number;
  showPoints: boolean; allowNavigation: boolean; mediaMimeTypes: string[]; mediaMaxBytes: number;
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
