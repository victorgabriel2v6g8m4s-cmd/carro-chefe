import { describe, expect, it } from "vitest";
import { loyaltyBenefitSchema, parseLoyaltyBenefits } from "./benefits";

describe("benefícios estruturados dos níveis CookLily", () => {
  it("migra benefícios legados em texto para notas e mantém os estruturados", () => {
    const benefit = { id: "product:p1", kind: "product", entityId: "p1", label: "Açaí", categoryId: "c1", maxRedemptionsPerUser: 1, selectionMode: "preset", configuration: { variantIds: ["v1"], flavorIds: [], addonIds: [] } };
    expect(parseLoyaltyBenefits(JSON.stringify(["Frete grátis", benefit, { invalid: true }]))).toEqual([
      expect.objectContaining({ kind: "note", label: "Frete grátis" }),
      benefit
    ]);
  });

  it("rejeita configurações malformadas e identifica escolha do cliente ou combinação fixa", () => {
    expect(loyaltyBenefitSchema.safeParse({ id: "product:p1", kind: "product", entityId: "p1", label: "Açaí", categoryId: "c1", selectionMode: "customer_choice", configuration: { variantIds: [], flavorIds: [], addonIds: [] } }).success).toBe(true);
    expect(loyaltyBenefitSchema.safeParse({ id: "product:p1", kind: "product", entityId: "p1", label: "Açaí", categoryId: "c1", selectionMode: "preset", configuration: { variantIds: ["v1", "v2"], flavorIds: [], addonIds: [] } }).success).toBe(true);
    expect(loyaltyBenefitSchema.safeParse({ id: "x", kind: "product", entityId: "p1", label: "Açaí", categoryId: null, selectionMode: "anything", configuration: {} }).success).toBe(false);
  });

  it("aceita configuração de tamanho, sabor e adicionais vinculada a cada item de um combo", () => {
    const result = loyaltyBenefitSchema.safeParse({ id: "combo:c1", kind: "combo", entityId: "c1", label: "Combo família", categoryId: null, selectionMode: "preset", configuration: {
      variantIds: [], flavorIds: [], addonIds: [], comboItems: [{ comboItemId: "ci1", variantIds: ["v1"], flavorIds: ["f1"], addonIds: ["a1", "a2"] }]
    } });
    expect(result.success).toBe(true);
  });
});
