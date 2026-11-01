import type { LilyRankingRow } from "../../api";

export function LevelIdentity({ level, compact = false }: { level: LilyRankingRow["currentLevel"]; compact?: boolean }) {
  const name = level?.name ?? "Sem nível";
  return <span className={`ranking-level-identity${compact ? " landing-ranking-level" : ""}`}>
    {level?.iconUrl ? <img src={level.iconUrl} alt="" loading="lazy" /> : <span className="ranking-level-icon-fallback" aria-hidden="true">✦</span>}
    <span>{name}</span>
  </span>;
}
