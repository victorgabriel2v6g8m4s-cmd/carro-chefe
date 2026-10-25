import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "./api";
import { getVisibleSurveyQuestions } from "./conditional";

const questions: SurveyQuestion[] = [
  { id: "tried", type: "single_choice", title: "Já provou?", description: "", required: true, options: ["Sim", "Não"], rows: [], columns: [], style: { fontSize: "md", bold: false, italic: false, markdown: false } },
  { id: "liked", type: "short_answer", title: "O que gostou?", description: "", required: true, options: [], rows: [], columns: [], style: { fontSize: "md", bold: false, italic: false, markdown: false }, visibility: { questionId: "tried", operator: "equals", value: "Sim" } },
  { id: "want", type: "short_answer", title: "Qual doce gostaria?", description: "", required: true, options: [], rows: [], columns: [], style: { fontSize: "md", bold: false, italic: false, markdown: false }, visibility: { questionId: "tried", operator: "equals", value: "Não" } },
  { id: "details", type: "paragraph", title: "Detalhes", description: "", required: false, options: [], rows: [], columns: [], style: { fontSize: "md", bold: false, italic: false, markdown: false }, visibility: { questionId: "liked", operator: "answered" } }
];

describe("conditional survey questions", () => {
  it("reveals the yes path and downstream follow-up", () => {
    expect(getVisibleSurveyQuestions(questions, { tried: "Sim", liked: "Adorei" }).map(({ id }) => id)).toEqual(["tried", "liked", "details"]);
  });

  it("reveals the no path and hides answers from the other branch", () => {
    expect(getVisibleSurveyQuestions(questions, { tried: "Não", liked: "resposta antiga" }).map(({ id }) => id)).toEqual(["tried", "want"]);
  });
});
