import type { LoyaltyLevel } from "./loyalty-types";

export function loyaltyLevelThresholdError(levels: LoyaltyLevel[]): string | null {
  const ordered = [...levels].sort((a, b) => a.sortOrder - b.sortOrder);
  const duplicateIndex = ordered.findIndex((level, index) => index > 0 && level.requiredPoints === ordered[index - 1].requiredPoints);
  if (duplicateIndex >= 0) return `Pontos acumulados repetidos nos níveis “${ordered[duplicateIndex - 1].name}” e “${ordered[duplicateIndex].name}”. Ajuste um valor; somente o primeiro nível pode começar com 0 pontos.`;
  const outOfOrderIndex = ordered.findIndex((level, index) => index > 0 && level.requiredPoints < ordered[index - 1].requiredPoints);
  if (outOfOrderIndex >= 0) return `O nível “${ordered[outOfOrderIndex].name}” precisa exigir mais pontos que “${ordered[outOfOrderIndex - 1].name}”.`;
  return null;
}
