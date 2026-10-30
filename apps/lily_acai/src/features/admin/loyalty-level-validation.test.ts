import { describe, expect, it } from "vitest";
import { loyaltyLevelThresholdError } from "./loyalty-level-validation";
import type { LoyaltyLevel } from "./loyalty-types";

function level(name: string, sortOrder: number, requiredPoints: number): LoyaltyLevel {
  return { id: name, name, sortOrder, requiredPoints, lilyCoins: 0, benefits: [], iconMediaId: null, iconUrl: null, active: true };
}

describe("validação dos limiares de nível", () => {
  it("aceita o nível inicial com zero pontos", () => {
    expect(loyaltyLevelThresholdError([level("Sem Nível", 0, 0), level("Bronze", 1, 100)])).toBeNull();
  });

  it("identifica os dois níveis que repetem o limiar zero", () => {
    expect(loyaltyLevelThresholdError([level("Sem Nível", 0, 0), level("Bronze I", 1, 0)])).toContain("“Sem Nível” e “Bronze I”");
  });

  it("identifica o nível abaixo do limiar anterior", () => {
    expect(loyaltyLevelThresholdError([level("Sem Nível", 0, 0), level("Prata", 1, 200), level("Ouro", 2, 150)])).toContain("“Ouro” precisa exigir mais pontos que “Prata”");
  });
});
