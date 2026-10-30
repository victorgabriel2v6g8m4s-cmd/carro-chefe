import { describe, expect, it } from "vitest";
import { toLoyaltyLevelInput } from "./loyalty-level-payload";
import type { LoyaltyLevel } from "./loyalty-types";

describe("toLoyaltyLevelInput", () => {
  it("sends editable level fields only, excluding API metadata and display URLs", () => {
    const level = {
      id: "level-1",
      name: "Bronze I",
      sortOrder: 17,
      requiredPoints: 100,
      lilyCoins: 50,
      benefits: [],
      iconMediaId: null,
      iconUrl: "/media/level.svg",
      active: true,
      createdAt: "2026-10-30T00:00:00.000Z",
      updatedAt: "2026-10-30T00:00:00.000Z"
    } as LoyaltyLevel;

    expect(toLoyaltyLevelInput(level, 0)).toEqual({
      id: "level-1",
      name: "Bronze I",
      sortOrder: 0,
      requiredPoints: 100,
      lilyCoins: 50,
      benefits: [],
      iconMediaId: null,
      active: true
    });
  });
});
