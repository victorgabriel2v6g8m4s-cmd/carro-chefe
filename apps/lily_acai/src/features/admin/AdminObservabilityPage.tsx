import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import { getLilyObservabilitySummary, type LilyObservabilitySummary } from "./observability-api";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "—";
}

export function AdminObservabilityPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<LilyObservabilitySummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(auth = session) {
    const current = auth ?? await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) {
      throw new Error("Esta área exige perfil staff CookLily.");
    }
    if (current.mfa?.required && !current.mfa.verified) {
      throw new Error("Confirme o MFA desta sessão para consultar a saúde operacional.");
    }
    const summary = await getLilyObservabilitySummary();
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
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar a saúde operacional.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const timer = window.setInterval(() => {
      load().catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a saúde operacional.");
      });
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (loading) return <section className="admin-state"><h1>Carregando saúde operacional...</h1></section>;
  if (!session || !data) return <section className="admin-state">
    <span className="eyebrow">CookLily · observabilidade</span>
    <h1>Acesso staff necessário.</h1>
    <p>{error}</p>
    <Link className="button primary" to="/entrar?next=/painel/saude">Entrar</Link>
  </section>;

  const hasAttention = data.whatsapp.failed > 0
    || data.whatsapp.dead > 0
    || data.pixReconciliation.reviewRequired > 0;

  return <section className="admin-page wide observability-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · saúde operacional</span>
        <h1>Observabilidade</h1>
        <p>Contadores agregados para triagem. Esta tela não exibe telefone, endereço, tokens ou payloads de providers.</p>
      </div>
      <div className="admin-actions">
        <Link className="button ghost" to="/painel">Resumo</Link>
        <Link className="button ghost" to="/painel/pedidos">Pedidos</Link>
        <Link className="button ghost" to="/painel/pagamentos">Pagamentos</Link>
      </div>
    </div>

    {error && <p className="error" role="alert">{error}</p>}

    <div className="observability-status-row">
      <article>
        <small>Banco CookLily</small>
        <strong>{data.database.status === "ok" ? "Operacional" : data.database.status}</strong>
      </article>
      <article className={hasAttention ? "warn" : ""}>
        <small>Triagem externa</small>
        <strong>{hasAttention ? "Requer atenção" : "Sem alerta agregado"}</strong>
      </article>
      <article>
        <small>Última leitura</small>
        <strong>{new Date(data.generatedAt).toLocaleTimeString("pt-BR")}</strong>
      </article>
    </div>

    <div className="observability-grid">
      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div><span className="eyebrow">Pedidos</span><h2>Fila atual</h2></div>
        </div>
        <div className="observability-metrics">
          <div><span>Aguardando pagamento</span><strong>{data.orders.awaitingPayment}</strong></div>
          <div><span>Pagos ativos</span><strong>{data.orders.paidActive}</strong></div>
          <div><span>Em preparo</span><strong>{data.orders.preparing}</strong></div>
          <div><span>Prontos</span><strong>{data.orders.readyForDispatch}</strong></div>
          <div><span>Aguardando courier</span><strong>{data.orders.waitingCourier}</strong></div>
          <div><span>Entrega em andamento</span><strong>{data.orders.deliveryInProgress}</strong></div>
        </div>
        <small>
          Último pedido observado: {data.orders.latest
            ? formatDate(data.orders.latest.createdAt) + " · " + data.orders.latest.fulfillmentType + " · " + (data.orders.latest.isHomologation ? "homologação" : "real")
            : "nenhum"}.
        </small>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div><span className="eyebrow">WhatsApp</span><h2>Outbox</h2></div>
          <Link className="button ghost" to="/painel/pagamentos">Ir para administração</Link>
        </div>
        <div className="observability-metrics">
          <div><span>Pendentes</span><strong>{data.whatsapp.pending}</strong></div>
          <div><span>Falhas com retry</span><strong>{data.whatsapp.failed}</strong></div>
          <div><span>Dead-letter lógico</span><strong>{data.whatsapp.dead}</strong></div>
        </div>
        <small>Mensagens e códigos de erro detalhados não são exibidos neste resumo.</small>
      </section>

      <section className="analytics-panel">
        <div className="analytics-panel-heading">
          <div><span className="eyebrow">Pix próprio</span><h2>Conciliação</h2></div>
          <Link className="button ghost" to="/painel/pagamentos">Revisar pagamentos</Link>
        </div>
        <div className="observability-metrics">
          <div><span>Revisão necessária</span><strong>{data.pixReconciliation.reviewRequired}</strong></div>
          <div><span>Último sucesso</span><strong>{formatDate(data.pixReconciliation.lastSuccessfulAt)}</strong></div>
          <div><span>Última tentativa</span><strong>{formatDate(data.pixReconciliation.lastAttemptAt)}</strong></div>
        </div>
        {data.pixReconciliation.lastErrorCode
          ? <p className="operation-warning">Último código de falha: <strong>{data.pixReconciliation.lastErrorCode}</strong></p>
          : <small>Nenhum código de falha registrado no estado atual.</small>}
      </section>
    </div>

    <p className="analytics-admin-footnote">
      Para correlacionar um erro reportado pelo navegador com o journal da API, use o cabeçalho HTTP <code>X-Request-Id</code>.
    </p>
  </section>;
}
