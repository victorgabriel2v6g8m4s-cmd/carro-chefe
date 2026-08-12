import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function Governance() {
  const { data, loading } = useData();
  if (loading || !data) return <section className="panel loading">Carregando governança…</section>;
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Decidir antes de executar</span><h2>Decisões e riscos</h2><p>As incertezas mais importantes ficam explícitas para que nenhum agente as transforme em premissa silenciosa.</p></section>
    <div className="content-grid"><section className="panel"><div className="section-title"><div><span className="eyebrow">Questões abertas</span><h3>Registro de decisões</h3></div></div><div className="governance-list">{data.decisions.map((decision) => <article key={decision.id}><div><small>{decision.id}</small><StatusBadge status={decision.status} /></div><h4>{decision.question}</h4>{decision.recommendation && <p><b>Recomendação:</b> {decision.recommendation}</p>}{decision.resolution && <p><b>Decisão:</b> {decision.resolution}</p>}</article>)}</div></section>
      <section className="panel"><div className="section-title"><div><span className="eyebrow">Probabilidade × impacto</span><h3>Mapa de riscos</h3></div></div><div className="risk-list">{[...data.risks].sort((a, b) => b.probability * b.impact - a.probability * a.impact).map((risk) => <article key={risk.id}><span className="score">{risk.probability * risk.impact}</span><div><h4>{risk.title}</h4><p>{risk.mitigation}</p><small>Probabilidade {risk.probability} · Impacto {risk.impact}</small></div></article>)}</div></section>
    </div>
  </div>;
}
