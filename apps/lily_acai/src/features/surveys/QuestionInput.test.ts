import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "./api";
import { QuestionInput } from "./QuestionInput";

const question: SurveyQuestion = {
  id: "rating", type: "linear_scale", title: "Quanto gostou?", description: "", required: true,
  options: [], rows: [], columns: [], scale: { min: 1, max: 10, minLabel: "Pouco", maxLabel: "Muito" },
  style: { fontSize: "md", bold: false, italic: false, markdown: false }
};

describe("linear survey scale", () => {
  it("renders an accessible range slider with configured bounds and endpoint labels", () => {
    const markup = renderToStaticMarkup(createElement(QuestionInput, { question, value: undefined, onChange: () => undefined, surveyId: "survey" }));

    expect(markup).toContain('type="range"');
    expect(markup).toContain('min="1"');
    expect(markup).toContain('max="10"');
    expect(markup).toContain('aria-label="Quanto gostou?"');
    expect(markup).toContain("Pouco");
    expect(markup).toContain("Muito");
    expect(markup).not.toContain('type="radio"');
  });

  it("shows the selected score when an answer is present", () => {
    const markup = renderToStaticMarkup(createElement(QuestionInput, { question, value: 7, onChange: () => undefined, surveyId: "survey" }));

    expect(markup).toContain(">7</output>");
    expect(markup).toContain('aria-valuetext="7"');
  });
});
