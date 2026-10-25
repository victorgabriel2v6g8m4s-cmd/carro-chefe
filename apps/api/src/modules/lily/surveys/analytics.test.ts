import { describe, expect, it } from "vitest";
import { mergeQuestionTimes, questionAnswered, selectedSurveyOptions } from "./analytics";
import { surveyDefinitionSchema } from "./contracts";

const definition = surveyDefinitionSchema.parse({
  title: "Preferências",
  questions: [
    { id: "choice", type: "multiple_choice", title: "Sabores", options: ["Morango", "Uva"] },
    { id: "binary", type: "binary_swipe", title: "Produto", positiveLabel: "Gostei", negativeLabel: "Passo" },
    { id: "grid", type: "checkbox_grid", title: "Grade", rows: ["Manhã", "Noite"], columns: ["Açaí", "Shake"] },
    { id: "scale", type: "linear_scale", title: "Nota", scale: { min: 1, max: 5 } },
    { id: "text", type: "short_answer", title: "Comentário" }
  ]
});

describe("CookLily survey analytics", () => {
  it("counts only valid categorical selections without exposing open text", () => {
    const [choice, binary, grid, scale, text] = definition.questions;
    expect(selectedSurveyOptions(choice!, ["Morango", "desconhecido"])).toEqual(["Morango"]);
    expect(selectedSurveyOptions(binary!, "positive")).toEqual(["Gostei"]);
    expect(selectedSurveyOptions(grid!, { Manhã: ["Açaí"], Fake: ["Shake"], Noite: ["Outro"] })).toEqual(["Manhã · Açaí"]);
    expect(selectedSurveyOptions(scale!, 7)).toEqual([]);
    expect(selectedSurveyOptions(text!, "resposta privada")).toEqual([]);
  });

  it("merges monotonic per-question timings, ignores unknown questions, and caps duration", () => {
    expect(mergeQuestionTimes(definition, { choice: 500, removed: 99 }, { choice: 200, binary: 2 * 60 * 60 * 1000 + 1 })).toEqual({
      choice: 500,
      binary: 2 * 60 * 60 * 1000
    });
  });

  it("recognizes empty and non-empty responses consistently", () => {
    const [, , , , question] = definition.questions;
    expect(questionAnswered(question!, "   ")).toBe(false);
    expect(questionAnswered(question!, "texto")).toBe(true);
  });
});
