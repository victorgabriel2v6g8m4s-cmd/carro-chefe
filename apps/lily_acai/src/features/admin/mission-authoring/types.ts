import type { LoyaltyBenefitCatalog, LoyaltyLevel } from "../loyalty-types";

export type MissionInstructionDraft = { title: string; body: string; required: boolean; mediaId: string | null };
export type MissionRewardDraft = { kind: "product" | "combo" | "coupon" | "offer" | "vip"; id: string; quantity: number };
export type MissionAudienceRuleDraft = { operator: "and" | "or" | "except"; field: "class" | "level" | "user"; value: string };

export type MissionAuthoringCatalog = {
  levels: LoyaltyLevel[];
  benefits: LoyaltyBenefitCatalog;
};

export const emptyMissionInstruction = (): MissionInstructionDraft => ({ title: "", body: "", required: false, mediaId: null });
export const emptyMissionReward = (): MissionRewardDraft => ({ kind: "product", id: "", quantity: 1 });
export const emptyAudienceRule = (): MissionAudienceRuleDraft => ({ operator: "and", field: "class", value: "vip" });

export function parseMissionRows<T>(json: string | null | undefined, fallback: T[] = []): T[] {
  if (!json) return fallback;
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value as T[] : fallback;
  } catch {
    return fallback;
  }
}
