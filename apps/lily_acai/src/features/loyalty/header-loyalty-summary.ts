import type { LilyPublicLevelsPayload } from "../../api";

type HeaderLevel = { name: string; iconUrl: string | null };

export type HeaderLoyaltySummary = {
  points: number;
  lilyCoins: number;
  coinName: string;
  coinIconUrl: string | null;
  currentLevel: HeaderLevel | null;
  nextLevel: HeaderLevel | null;
  levelProgressPercent: number;
};

export function guestHeaderLoyaltySummary(data: LilyPublicLevelsPayload): HeaderLoyaltySummary {
  const levels = [...data.levels].sort((left, right) => left.requiredPoints - right.requiredPoints);
  const current = levels.filter((level) => level.requiredPoints <= 0).at(-1) ?? null;
  const next = levels.find((level) => level.requiredPoints > 0) ?? null;
  const progress = next
    ? Math.max(0, Math.min(100, (0 - (current?.requiredPoints ?? 0)) / Math.max(1, next.requiredPoints - (current?.requiredPoints ?? 0)) * 100))
    : current ? 100 : 0;

  return {
    points: 0,
    lilyCoins: 0,
    coinName: data.coinName,
    coinIconUrl: data.coinIconUrl,
    currentLevel: current ? { name: current.name, iconUrl: current.iconUrl } : null,
    nextLevel: next ? { name: next.name, iconUrl: next.iconUrl } : null,
    levelProgressPercent: progress
  };
}
