import { describe, expect, it } from "vitest";
import { guestHeaderLoyaltySummary } from "./header-loyalty-summary";

describe("resumo de fidelidade no header para visitantes", () => {
  it("mantém saldo e pontos em zero e usa a arte pública da moeda e do nível inicial", () => {
    const summary = guestHeaderLoyaltySummary({
      points: 999,
      coinName: "LilyCoins",
      coinIconUrl: "/coin.svg",
      levels: [
        { id: "starter", name: "Sem Nível", requiredPoints: 0, lilyCoins: 0, benefits: [], iconUrl: "/starter.svg" },
        { id: "bronze", name: "Bronze I", requiredPoints: 100, lilyCoins: 10, benefits: [], iconUrl: "/bronze.svg" }
      ]
    });

    expect(summary).toMatchObject({
      points: 0,
      lilyCoins: 0,
      coinIconUrl: "/coin.svg",
      currentLevel: { name: "Sem Nível", iconUrl: "/starter.svg" },
      nextLevel: { name: "Bronze I", iconUrl: "/bronze.svg" },
      levelProgressPercent: 0
    });
  });
});
