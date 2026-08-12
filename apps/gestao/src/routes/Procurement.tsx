import { useData } from "../app/data";
import { StatusBadge } from "../components/StatusBadge";

export function Procurement() {
  const { data, loading } = useData();
  if (loading || !data) return <section className="panel loading">Carregando compras…</section>;
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Pesquisa com critério</span><h2>Compras e contratações</h2><p>Preço baixo só vale quando atende os requisitos. O agente de compras deve comparar valor total, avaliação, prazo, garantia e risco.</p></section>
    <section className="procurement-grid">{data.procurement.map((item) => <article className="panel purchase-card" key={item.id}><div><small>{item.id} · {item.category}</small><StatusBadge status={item.status} /></div><h3>{item.item}</h3>{item.requirements?.length > 0 && <ul>{item.requirements.map((requirement: string) => <li key={requirement}>{requirement}</li>)}</ul>}{item.recommendation ? <div className="recommendation"><small>Recomendação atual</small><strong>{item.recommendation}</strong></div> : <p className="muted">Pesquisa ainda não registrada.</p>}<footer>Responsável: {item.ownerAgentId}</footer></article>)}</section>
  </div>;
}
