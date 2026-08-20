import { useSearchParams } from "react-router-dom";
import { useData } from "../app/data";
import { RichReferences } from "../components/RichReferences";
import { StatusBadge } from "../components/StatusBadge";

export function Procurement() {
  const { data, loading } = useData();
  const [params, setParams] = useSearchParams();
  if (loading || !data) return <section className="panel loading">Carregando compras…</section>;
  const q = (params.get("q") ?? "").toLocaleLowerCase("pt-BR");
  const items = data.procurement.filter((item) => !q || `${item.id} ${item.item} ${item.category} ${item.recommendation} ${item.requirements?.join(" ")}`.toLocaleLowerCase("pt-BR").includes(q));
  const updateSearch = (value: string) => { const next = new URLSearchParams(params); value ? next.set("q", value) : next.delete("q"); setParams(next, { replace: true }); };
  return <div className="page-stack"><section className="intro"><span className="eyebrow">Pesquisa com critério</span><h2>Compras e contratações</h2><p>Preço baixo só vale quando atende requisitos, custo total, avaliação, prazo, garantia e risco.</p></section>
    <section className="panel search-panel"><label><span>Buscar em compras</span><input type="search" value={params.get("q") ?? ""} onChange={(event) => updateSearch(event.target.value)} placeholder="Item, categoria, requisito ou recomendação" /></label><small>{items.length} resultado(s)</small></section>
    <section className="procurement-grid">{items.map((item) => <article className="panel purchase-card" key={item.id}><div><small>{item.id} · {item.category}</small><StatusBadge status={item.status} /></div><h3>{item.item}</h3>{(item.requirements ?? []).length > 0 && <ul>{(item.requirements ?? []).map((requirement) => <li key={requirement}><RichReferences text={requirement} /></li>)}</ul>}{item.recommendation ? <div className="recommendation"><small>Recomendação atual</small><strong><RichReferences text={item.recommendation} /></strong></div> : <p className="muted">Pesquisa ainda não registrada.</p>}<footer>Responsável: {item.ownerAgentId}</footer></article>)}{!items.length && <section className="panel empty"><p>Nenhuma compra corresponde à busca.</p></section>}</section>
  </div>;
}
