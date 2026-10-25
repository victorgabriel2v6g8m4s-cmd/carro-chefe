import { describe, expect, it } from "vitest";
import { answerIsPresent, normalizeDefinition, questionAnswerIsPresent, sanitizeSurveyHtml, surveyDefinitionSchema, validateSurveyAnswers } from "./contracts";

const definition = surveyDefinitionSchema.parse({
  title: "Pesquisa",
  questions: [
    { id: "choice", type: "single_choice", title: "Escolha", required: true, options: ["A", "B"] },
    { id: "swipe", type: "binary_swipe", title: "Gostou?", required: true },
    { id: "grid", type: "multiple_choice_grid", title: "Grade", rows: ["R1"], columns: ["C1", "C2"] },
    { id: "scale", type: "linear_scale", title: "Nota", scale: { min: 1, max: 5 } }
  ]
});

describe("CookLily survey contracts", () => {
  it("requires a title and unique question identifiers", () => {
    expect(() => surveyDefinitionSchema.parse({ title: "", questions: [{ id: "x", type: "short_answer", title: "Q" }] })).toThrow();
    expect(() => surveyDefinitionSchema.parse({ title: "ok", questions: [{ id: "x", type: "short_answer", title: "Q" }, { id: "x", type: "paragraph", title: "Q2" }] })).toThrow();
  });

  it("validates survey duration, distinct option rows, and secure media bounds", () => {
    expect(surveyDefinitionSchema.parse({ title: "T", questions: [{ id: "q", type: "short_answer", title: "Q" }] }).estimatedMinutes).toBe(5);
    expect(() => surveyDefinitionSchema.parse({ title: "T", estimatedMinutes: 181, questions: [{ id: "q", type: "short_answer", title: "Q" }] })).toThrow();
    expect(() => surveyDefinitionSchema.parse({ title: "T", questions: [{ id: "q", type: "multiple_choice", title: "Q", options: ["A", "A"] }] })).toThrow();
    expect(() => surveyDefinitionSchema.parse({ title: "T", questions: [{ id: "q", type: "checkbox_grid", title: "Q", rows: ["A", "A"], columns: ["X"] }] })).toThrow();
    expect(() => surveyDefinitionSchema.parse({ title: "T", questions: [{ id: "q", type: "binary_swipe", title: "Q", cardMedia: { url: "http://example.com/card.jpg", type: "image" } }] })).toThrow();
    expect(() => surveyDefinitionSchema.parse({ title: "T", questions: [{ id: "q", type: "media", title: "Q", media: { mimeTypes: ["image/png"], maxBytes: 10 * 1024 * 1024 + 1 } }] })).toThrow();
  });

  it("validates choices, swipe values, grids, and numeric scales", () => {
    expect(validateSurveyAnswers(definition, { choice: "A", swipe: "positive", grid: { R1: "C2" }, scale: 4 })).toBeNull();
    expect(validateSurveyAnswers(definition, { choice: "unknown", swipe: "positive" })).toBe("choice");
    expect(validateSurveyAnswers(definition, { choice: "A", swipe: "maybe" })).toBe("swipe");
    expect(validateSurveyAnswers(definition, { choice: "A", swipe: "negative", grid: { R2: "C1" } })).toBe("grid");
    expect(validateSurveyAnswers(definition, { choice: "A", swipe: "positive", scale: 8 })).toBe("scale");
  });

  it("removes unsafe HTML tags and attributes before returning definitions", () => {
    expect(sanitizeSurveyHtml('<p onclick="x">ok<script>alert(1)</script><img src=x></p>')).toBe("<p>okalert(1)</p>");
    const normalized = normalizeDefinition(surveyDefinitionSchema.parse({ title: "X", questions: [{ id: "x", type: "short_answer", title: "Q", style: { html: '<strong onclick="bad()">safe</strong><img src=x>' } }] }));
    expect(normalized.questions[0]?.style.html).toBe("<strong>safe</strong>");
  });

  it("recognizes non-empty answers without counting blanks", () => {
    expect(answerIsPresent(" ")).toBe(false);
    expect(answerIsPresent([])).toBe(false);
    expect(answerIsPresent({})).toBe(false);
    expect(answerIsPresent(["x"])).toBe(true);
    const freeText = surveyDefinitionSchema.parse({ title: "X", questions: [{ id: "free", type: "free_text", title: "Q", required: true, media: { mimeTypes: ["image/png"], maxBytes: 1024 } }], mediaMimeTypes: ["image/png"], mediaMaxBytes: 1024 }).questions[0]!;
    expect(questionAnswerIsPresent(freeText, { text: "", upload: undefined })).toBe(false);
    expect(questionAnswerIsPresent(freeText, { text: "opinião" })).toBe(true);
  });
});
