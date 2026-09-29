import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { getLilyAnalyticsSummary, type LilyAnalyticsSummary } from "./api";

const FUNNEL_LABELS: Record<string, string> = {
  catalog_view: "Cardápio",
  product_view: "Produto",
  add_to_cart: "Carrinho",
  checkout_start: "Checkout",
  order_created: "Pedido criado",
  payment_confirmed: "Pagamento confirmado"
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) return "—";
  return String(((numerator / denominator) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })) + "%";
}

export function AdminAnalyticsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<LilyAnalyticsSummary | null>(null);
  const [days, setDays] = useState(7);
  const [campaign, setCampaign] = useState("");
  const [appliedCampaign, setAppliedCampaign] = useState("");
  const [includeHomologation, setIncludeHomologation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(auth = session) {
    const current = auth ?? await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) {
      throw new Error("Esta área exige perfil staff CookLily.");
    }
    if (current.mfa?.required && !current.mfa.verified) {
      throw new Error("Confirme o MFA desta sessão para consultar analytics.");
    }
    const summary = await getLilyAnalyticsSummary({
      days,
      campaign: appliedCampaign || undefined,
      includeHomologation
    });
    setSession(current);
    setData(summary);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLilySession()
      .then(async (auth) => {
        if (cancelled) return;
        await load(auth);
      })
      .then(() => {
        if (!cancelled) setError("");
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [days, appliedCampaign, includeHomologation]);

  const funnel = useMemo(() => {
    if (!data) return [];
    const first = data.funnel.find((row) => row.event === "catalog_view")?.sessions ?? 0;
    return data.funnel.map((row) => ({
      ...row,
      label: FUNNEL_LABELS[row.event] ?? row.event,
      fromCatalog: percentage(row.sessions, first)
    }));
  }, [data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedCampaign(campaign.trim());
  }

  if (loading) return <section className="admin-state"><h1>Carregando analytics...</h1></section>;
  if (!session || !data) return <section className="admin-state">
    <span className="eyebrow">CookLily · analytics</span>
    <h1>Acesso staff necessário.</h1>
    <p>{error}</p>
    <Link className="button primary" to="/entrar?next=/painel/analytics">Entrar</Link>
  </section>;

  return <section className="admin-page wide analytics-admin-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · first-party</span>
        <h1>Analytics e atribuição</h1>
        <p>Eventos são pseudônimos e opcionais. Pedidos e valor pago abaixo vêm do banco operacional, não do navegador.</p>
      </div>
      <div className="admin-actions">
        <Link className="button ghost" to="/painel">Resumo</Link>
        <Link className="button ghost" to="/painel/pedidos">Pedidos</Link>
      </div>
    </div>

    {error && <p className="error" role="alert">{error}</p>}

    <form className="analytics-admin-filters" onSubmit={submit}>
      <label>Janela
        <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
          <option value={1}>24 horas</option>
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </label>
      <label>Campanha
        <input
          value={campaign}
          onChange={(event) => setCampaign(event.target.value)}
          placeholder="ex.: adesivos"
          maxLength={120}
        />
      </label>
      <label className="analytics-checkbox">
        <input
          type="checkbox"
          checked={includeHomologation}
          onChange={(event) => setIncludeHomologation(event.target.checked)}
        />
        Incluir pedidos de homologação
      </label>
      <button className="button ghost" type="submit">Aplicar</button>
      {appliedCampaign && <button className="text-button" type="button" onClick={() => {
        setCampaign("");
        setAppliedCampaign("");
      }}>Limpar campanha</button>}
    </form>

    <div className="analytics-kpis">
      <article><small>Pedidos</small><strong>{data.orders.created}</strong></article>
      <article><small>Pedidos pagos</small><strong>{data.orders.paid}</strong></article>
      <article><small>Conversão pedido → pago</small><strong>{percentage(data.orders.paid, data.orders.created)}</strong></article>
      <article><small>Valor bruto criado</small><strong>{money(data.orders.grossOrderValueCents)}</strong></article>
      <article><small>Valor bruto pago</small><strong>{money(data.orders.paidGrossCents)}</strong></article>
      <article><small>Sessões no cardápio</small><strong>{funnel[0]?.sessions ?? 0}</strong></article>
    </div>

    <div className="analytics-admin-grid">
      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div><span className="eyebrow">Funil consentido</span><h2>Sessões por etapa</h2></div>
          <small>Uma sessão é contada no máximo uma vez por etapa.</small>
        </div>
        <div className="analytics-funnel">
          {funnel.map((row) => <div key={row.event}>
            <span>{row.label}</span>
            <strong>{row.sessions}</strong>
            <small>{row.fromCatalog} do cardápio</small>
          </div>)}
        </div>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div><span className="eyebrow">Produtos</span><h2>Interesse e carrinho</h2></div>
        </div>
        {data.products.length === 0
          ? <p>Nenhum evento de produto nesta janela.</p>
          : <div className="analytics-table-wrap"><table>
              <thead><tr><th>Produto</th><th>Views</th><th>Carrinho</th><th>View → carrinho</th></tr></thead>
              <tbody>{data.products.map((row) => <tr key={row.productSlug}>
                <td>{row.productSlug}</td>
                <td>{row.views}</td>
                <td>{row.addToCart}</td>
                <td>{percentage(row.addToCart, row.views)}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </div>

    <section className="analytics-panel">
      <div className="analytics-panel-heading">
        <div><span className="eyebrow">Atribuição</span><h2>Campanha, QR e variante</h2></div>
        <small>Somente eventos que o visitante consentiu entram nesta tabela.</small>
      </div>
      {data.attribution.length === 0
        ? <p>Nenhum evento atribuído nesta janela.</p>
        : <div className="analytics-table-wrap"><table>
            <thead><tr><th>Campanha</th><th>QR</th><th>Variante</th><th>Eventos</th></tr></thead>
            <tbody>{data.attribution.map((row, index) => <tr key={[row.campaign, row.qr, row.variant, index].join("|")}>
              <td>{row.campaign ?? "Direto/sem campanha"}</td>
              <td>{row.qr ?? "—"}</td>
              <td>{row.variant ?? "—"}</td>
              <td>{row.events}</td>
            </tr>)}</tbody>
          </table></div>}
    </section>

    <p className="analytics-admin-footnote">
      Janela: {new Date(data.window.from).toLocaleString("pt-BR")} até {new Date(data.window.to).toLocaleString("pt-BR")}.
      Eventos do navegador não substituem conciliação financeira nem o banco de pedidos.
    </p>
  </section>;
}
