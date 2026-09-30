import { describe, expect, it } from "vitest";
import {
  aggregateLilyAllergens,
  allergenStorageData,
  describeLilyAllergenCodes,
  lilyAllergenInputSchema,
  parseLilyAllergenJson
} from "./allergens";

describe("CookLily allergen domain", () => {
  it("deduplica e mantém ordem canônica", () => {
    expect(describeLilyAllergenCodes(["milk", "soy", "milk"])).toEqual([
      { code: "soy", label: "soja" },
      { code: "milk", label: "leite de todos os mamíferos" }
    ]);
  });

  it("faz CONTÉM prevalecer sobre PODE CONTER", () => {
    const result = aggregateLilyAllergens([
      {
        label: "Produto",
        reviewStatus: "reviewed",
        contains: ["milk"],
        mayContain: ["soy"]
      },
      {
        label: "Adicional",
        reviewStatus: "reviewed",
        contains: ["soy"],
        mayContain: ["milk", "peanuts"]
      }
    ]);

    expect(result.complete).toBe(true);
    expect(result.contains.map((item) => item.code)).toEqual(["soy", "milk"]);
    expect(result.mayContain.map((item) => item.code)).toEqual(["peanuts"]);
  });

  it("mantém informação incompleta explícita", () => {
    const result = aggregateLilyAllergens([
      {
        label: "Base",
        reviewStatus: "reviewed",
        contains: ["milk"],
        mayContain: []
      },
      {
        label: "Sabor Morango",
        reviewStatus: "unreviewed",
        contains: [],
        mayContain: []
      }
    ]);

    expect(result.complete).toBe(false);
    expect(result.unreviewed).toEqual(["Sabor Morango"]);
    expect(result.contains.map((item) => item.code)).toEqual(["milk"]);
  });

  it("rejeita o mesmo código em contém e pode conter", () => {
    const parsed = lilyAllergenInputSchema.safeParse({
      allergenReviewStatus: "reviewed",
      allergenContains: ["milk"],
      allergenMayContain: ["milk"]
    });
    expect(parsed.success).toBe(false);
  });

  it("serializa somente códigos controlados e tolera JSON legado inválido", () => {
    const parsed = lilyAllergenInputSchema.parse({
      allergenReviewStatus: "reviewed",
      allergenContains: ["milk", "soy"],
      allergenMayContain: ["peanuts"]
    });
    const storage = allergenStorageData(parsed);

    expect(parseLilyAllergenJson(storage.allergenContainsJson)).toEqual(["soy", "milk"]);
    expect(parseLilyAllergenJson("not-json")).toEqual([]);
  });
});
