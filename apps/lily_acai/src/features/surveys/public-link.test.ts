import { describe, expect, it } from "vitest";
import { surveyPublicLink, surveyPublicToken } from "./public-link";

describe("survey public links", () => {
  it("keeps the opaque public token when a survey is first saved", () => {
    const identity = { id: "internal-id", publicToken: "public/token" };

    expect(surveyPublicToken(identity)).toBe("public/token");
    expect(surveyPublicLink("https://carrochefe.com", "/lilyacai/", identity))
      .toBe("https://carrochefe.com/lilyacai/pesquisas/public%2Ftoken");
  });

  it("preserves the previous public token when an update omits it", () => {
    expect(surveyPublicToken({ id: "internal-id" }, { id: "internal-id", publicToken: "stable-token" }))
      .toBe("stable-token");
  });

  it("falls back to the internal id only when no public token exists", () => {
    expect(surveyPublicLink("https://carrochefe.com", "/lilyacai/", { id: "internal-id" }))
      .toBe("https://carrochefe.com/lilyacai/pesquisas/internal-id");
  });
});
