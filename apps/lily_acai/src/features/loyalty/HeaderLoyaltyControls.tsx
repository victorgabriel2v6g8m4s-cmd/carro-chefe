import { Sparkles } from "lucide-react";
import { Link } from "../../router";
import type { LilyLoyaltyPayload } from "../../api";

export function HeaderLilyCoins({ loyalty }: { loyalty: LilyLoyaltyPayload | null }) {
  const coinName = loyalty?.coinName ?? "LilyCoins";
  const coinBalance = loyalty?.lilyCoins ?? 0;

  return <Link className="header-coins" to="/dashboard#missions" aria-label={`${coinBalance.toLocaleString("pt-BR")} ${coinName}`} title={coinName}>
    {loyalty?.coinIconUrl ? <img src={loyalty.coinIconUrl} alt="" /> : <Sparkles aria-hidden="true" />}
    <strong>{coinBalance.toLocaleString("pt-BR")}</strong><span className="header-coin-name">{coinName}</span>
  </Link>;
}

export function HeaderLoyaltyProgress({ loyalty }: { loyalty: LilyLoyaltyPayload | null }) {
  const points = loyalty?.points ?? 0;
  const progress = loyalty?.levelProgressPercent ?? 0;
  const currentLevel = loyalty?.currentLevel;
  const nextLevel = loyalty?.nextLevel;
  const label = `${points.toLocaleString("pt-BR")} pontos acumulados. Nível atual: ${currentLevel?.name ?? "sem nível"}. Próximo nível: ${nextLevel?.name ?? "nível inicial"}.`;

  return <Link className="header-loyalty-progress" to="/dashboard" title={label} aria-label={label}>
    <span className="header-progress-points">{points.toLocaleString("pt-BR")} pts</span>
    <span className="header-progress-segments" aria-hidden="true">{[0, 1, 2, 3].map((segment) => {
      const fill = Math.min(100, Math.max(0, (progress - segment * 25) * 4));
      return <i key={segment}><b style={{ width: `${fill}%` }} /></i>;
    })}</span>
    {currentLevel?.iconUrl ? <img className="header-level-icon" src={currentLevel.iconUrl} alt="" /> : <span className="header-level-icon-fallback" aria-hidden="true"><Sparkles size={14} /></span>}
  </Link>;
}
