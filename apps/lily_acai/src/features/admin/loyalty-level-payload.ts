import type { LoyaltyLevel } from "./loyalty-types";

export type LoyaltyLevelInput = Pick<
  LoyaltyLevel,
  "id" | "name" | "sortOrder" | "requiredPoints" | "lilyCoins" | "benefits" | "iconMediaId" | "active"
>;

export function toLoyaltyLevelInput(level: LoyaltyLevel, sortOrder: number): LoyaltyLevelInput {
  return {
    id: level.id,
    name: level.name,
    sortOrder,
    requiredPoints: level.requiredPoints,
    lilyCoins: level.lilyCoins,
    benefits: level.benefits,
    iconMediaId: level.iconMediaId,
    active: level.active
  };
}
