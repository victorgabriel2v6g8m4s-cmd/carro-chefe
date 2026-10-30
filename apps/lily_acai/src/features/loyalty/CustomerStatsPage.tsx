import { Link, useParams } from "../../router";
import { CustomerStatsPanel } from "./CustomerStatsPanel";

export function CustomerStatsPage() {
  const { userId = "" } = useParams();
  return <section className="customer-statistics-page"><header className="checkout-heading"><div><span className="eyebrow">Comunidade CookLily</span><h1>Estatísticas do cliente</h1><p>Indicadores agregados de participação na comunidade.</p></div><Link className="button ghost" to="/ranking">Voltar ao ranking</Link></header><CustomerStatsPanel userId={userId} /></section>;
}
