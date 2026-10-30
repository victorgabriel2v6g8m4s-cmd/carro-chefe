import { useEffect, useState } from "react";
import { Link } from "../../router";
import { getLilyPublicLevels, type LilyPublicLevel } from "../../api";

function progressionPercent(levels: LilyPublicLevel[], points: number) {
  if (levels.length < 2) return points >= (levels[0]?.requiredPoints ?? Infinity) ? 100 : 0;
  let index = -1;
  for (let position = 0; position < levels.length; position += 1) if (points >= levels[position]!.requiredPoints) index = position;
  if (index >= levels.length - 1) return 100;
  const next = levels[index + 1]!;
  const previousPoints = index < 0 ? 0 : levels[index]!.requiredPoints;
  const fraction = Math.min(1, Math.max(0, (points - previousPoints) / Math.max(1, next.requiredPoints - previousPoints)));
  return Math.max(0, Math.min(100, ((index + 1 + fraction) / (levels.length - 1)) * 100));
}

export function LoyaltyLevelsPage() {
  const [data, setData] = useState<{ points: number; levels: LilyPublicLevel[] } | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { getLilyPublicLevels().then((value) => { setData(value); setSelected(value.levels.find((level) => value.points >= level.requiredPoints)?.id ?? value.levels[0]?.id ?? ""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os níveis.")); }, []);
  const active = data?.levels.find((level) => level.id === selected);
  return <section className="loyalty-levels-page"><header className="checkout-heading"><div><span className="eyebrow">Sua jornada</span><h1>Níveis CookLily</h1><p>Explore os níveis e os benefícios disponíveis em cada etapa.</p></div><Link className="button ghost" to="/dashboard">Voltar ao dashboard</Link></header>
    {error && <p className="error" role="alert">{error}</p>}
    {!data ? <p aria-live="polite">Carregando níveis…</p> : data.levels.length === 0 ? <p>Nenhum nível está disponível no momento.</p> : <>
      <div className="loyalty-levels-scroll" role="group" aria-label="Progresso pelos níveis">
        <div className="loyalty-levels-track" style={{ minWidth: `max(${Math.max(620, data.levels.length * 132)}px, 100%)` }}><span className="loyalty-levels-fill" style={{ width: `${progressionPercent(data.levels, data.points)}%` }} />
          {data.levels.map((level) => <button type="button" className={`loyalty-level-node${selected === level.id ? " is-selected" : ""}${data.points >= level.requiredPoints ? " is-reached" : ""}`} style={{ left: `${data.levels.length === 1 ? 50 : (data.levels.indexOf(level) / (data.levels.length - 1)) * 100}%` }} key={level.id} onClick={() => setSelected(level.id)} aria-pressed={selected === level.id}>
            <span className="loyalty-level-node-icon">{level.iconUrl ? <img src={level.iconUrl} alt="" /> : <i>{data.levels.indexOf(level) + 1}</i>}</span><strong>{level.name}</strong><small>{level.requiredPoints.toLocaleString("pt-BR")} pts</small>
          </button>)}
        </div>
      </div>
      {active && <article className="loyalty-selected-level"><div className="loyalty-selected-level-title">{active.iconUrl && <img src={active.iconUrl} alt="" />}<div><span className="eyebrow">Nível {data.points >= active.requiredPoints ? "alcançado" : "a alcançar"}</span><h2>{active.name}</h2></div><strong>{active.lilyCoins.toLocaleString("pt-BR")} LilyCoins</strong></div><h3>Recompensas e benefícios</h3>{active.benefits.length ? <ul>{active.benefits.map((benefit) => <li key={benefit.id}>{benefit.label}</li>)}</ul> : <p>Este nível não tem benefícios configurados.</p>}</article>}
    </>}
  </section>;
}
