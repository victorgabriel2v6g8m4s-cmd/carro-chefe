import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  completePickupOrder,
  getOrderControlOverview,
  type OrderAttentionFlag,
  type OrderControlPayload,
  type OrderControlRow
} from "./order-control-api";

const FINANCIAL_LABELS: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  cancelled: "Cancelado",
  refunded: "Estornado"
};

const OPERATION_LABELS: Record<string, string> = {
  received: "Recebido",
  waiting_payment: "Aguardando pagamento",
  preparing: "Em preparo",
  ready_for_dispatch: "Pronto",
  completed: "Concluído",
  cancelled: "Cancelado"
};

const DELIVERY_LABELS: Record<string, string> = {
  not_applicable: "Não se aplica",
  not_ready: "Ainda não liberado",
  waiting_courier: "Aguardando entregador",
  courier_accepted: "Entregador aceitou",
  courier_arrived_pickup: "Entregador na coleta",
  picked_up: "Coletado",
  left_pickup: "Saiu para entrega",
  courier_arrived_delivery: "Chegou ao destino",
  delivered: "Entregue",
  left_delivery: "Entrega encerrada",
  cancelled: "Cancelada"
};

const ATTENTION_LABELS: Record<OrderAttentionFlag, string> = {
  paid_waiting_kitchen: "Pago e ainda não entrou em produção",
  preparation_overdue: "SLA de preparo estourado",
  operation_ahead_of_payment: "Operação avançou sem pagamento confirmado",
  delivery_queue_not_opened: "Pronto, mas fila logística não foi aberta"
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function age(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

function OrderCard({
  order,
  session,
  busyId,
  onCompletePickup
}: {
  order: OrderControlRow;
  session: AuthPayload;
  busyId: string;
  onCompletePickup: (order: OrderControlRow) => Promise<void>;
}) {
  const canCompletePickup = order.nextAction?.kind === "pickup"
    && order.fulfillmentType === "pickup"
    && order.financialStatus === "paid"
    && order.operationStatus === "ready_for_dispatch";

  return <article className={`order-control-card ${order.attention.length ? "needs-attention" : ""}`}>
    <header>
      <div>
        <span className="eyebrow">{order.isHomologation ? "Homologação · " : ""}{order.orderNumber}</span>
        <strong>{order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"} · {order.itemCount} item(ns)</strong>
      </div>
      <div className="order-control-total">
        <strong>{money(order.grandTotalCents)}</strong>
        <small>há {age(order.createdAt)}</small>
      </div>
    </header>

    <div className="order-control-status-grid">
      <div>
        <small>Financeiro</small>
        <strong>{FINANCIAL_LABELS[order.financialStatus] || order.financialStatus}</strong>
      </div>
      <div>
        <small>Cozinha</small>
        <strong>{OPERATION_LABELS[order.operationStatus] || order.operationStatus}</strong>
      </div>
      <div>
        <small>Logística</small>
        <strong>{DELIVERY_LABELS[order.deliveryStatus] || order.deliveryStatus}</strong>
      </div>
    </div>

    {order.sla && <div className={`order-control-sla ${order.sla.status}`}>
      <strong>{order.sla.status === "overdue"
        ? `Preparo atrasado ${order.sla.overdueMinutes} min`
        : `SLA: ${order.sla.remainingMinutes} min restantes`}</strong>
      <small>Prazo configurado: {order.sla.thresholdMinutes} min.</small>
    </div>}

    {order.attention.length > 0 && <div className="order-control-alerts" role="status">
      {order.attention.map((flag) => <span key={flag}>{ATTENTION_LABELS[flag]}</span>)}
    </div>}

    <footer>
      <small>Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}</small>
      <div className="order-control-actions">
        {canCompletePickup
          ? <button
              className="button primary"
              type="button"
              disabled={busyId === order.id}
              onClick={() => void onCompletePickup(order)}
            >
              {busyId === order.id ? "Confirmando..." : "Confirmar retirada"}
            </button>
          : order.nextAction
            ? <Link className="button ghost" to={order.nextAction.path}>{order.nextAction.label}</Link>
            : null}
        {order.operationStatus === "preparing" && <Link className="button ghost" to="/painel/cozinha">Abrir cozinha</Link>}
        {order.fulfillmentType === "delivery" && order.operationStatus === "ready_for_dispatch"
          && <Link className="button ghost" to="/painel/entregas">Abrir logística</Link>}
      </div>
    </footer>
  </article>;
}

export function OrderControlPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<OrderControlPayload | null>(null);
  const [state, setState] = useState<"active" | "attention" | "completed" | "cancelled" | "all">("active");
  const [fulfillment, setFulfillment] = useState<"" | "pickup" | "delivery">("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function refresh(currentSession = session) {
    const auth = currentSession ?? await getLilySession();
    if (!["staff", "admin"].includes(auth.user.role)) {
      throw new Error("Esta área exige perfil staff CookLily.");
    }
    if (auth.mfa?.required && !auth.mfa.verified) {
      throw new Error("Confirme o MFA desta sessão antes de operar pedidos.");
    }
    const overview = await getOrderControlOverview({
      state,
      fulfillment: fulfillment || undefined,
      q: appliedQuery || undefined,
      limit: 150
    });
    setSession(auth);
    setData(overview);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLilySession()
      .then(async (auth) => {
        if (cancelled) return;
        await refresh(auth);
      })
      .then(() => {
        if (!cancelled) setError("");
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar os pedidos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const timer = window.setInterval(() => {
      refresh().catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível atualizar os pedidos.");
      });
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [state, fulfillment, appliedQuery]);

  const generatedAt = useMemo(
    () => data ? new Date(data.generatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "",
    [data]
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedQuery(query.trim());
  }

  async function completePickup(order: OrderControlRow) {
    if (!session || busyId) return;
    const confirmed = window.confirm(`Confirmar que o pedido ${order.orderNumber} foi retirado pelo cliente?`);
    if (!confirmed) return;

    setBusyId(order.id);
    setError("");
    setSaved("");
    try {
      await completePickupOrder(order.id, session.csrfToken);
      setSaved(`Retirada do pedido ${order.orderNumber} confirmada e auditada.`);
      await refresh(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível confirmar a retirada.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <section className="admin-state"><h1>Carregando pedidos...</h1></section>;
  if (!session || !data) return <section className="admin-state">
    <span className="eyebrow">CookLily · pedidos</span>
    <h1>Acesso staff necessário.</h1>
    <p>{error}</p>
    <Link className="button primary" to="/entrar?next=/painel/pedidos">Entrar</Link>
  </section>;

  return <section className="admin-page wide order-control-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · torre de controle</span>
        <h1>Pedidos em operação</h1>
        <p>Financeiro, cozinha e logística em uma visão única. As mudanças continuam sendo feitas pelo domínio responsável.</p>
      </div>
      <div className="admin-actions">
        <Link className="button ghost" to="/painel">Resumo</Link>
        <Link className="button ghost" to="/painel/cozinha">Cozinha</Link>
        {session.user.role === "admin" && <Link className="button ghost" to="/painel/entregas">Entregas</Link>}
      </div>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {saved && <p className="success" role="status">{saved}</p>}

    <div className="order-control-kpis">
      <article><strong>{data.summary.visible}</strong><span>visíveis</span></article>
      <article className={data.summary.attention ? "warn" : ""}><strong>{data.summary.attention}</strong><span>atenção</span></article>
      <article><strong>{data.summary.awaitingPayment}</strong><span>aguardando pagamento</span></article>
      <article><strong>{data.summary.preparing}</strong><span>em preparo</span></article>
      <article><strong>{data.summary.ready}</strong><span>prontos</span></article>
      <article><strong>{data.summary.deliveryInProgress}</strong><span>em logística</span></article>
    </div>

    <div className="order-control-toolbar">
      <div className="order-control-tabs" role="group" aria-label="Filtrar pedidos por situação">
        {([
          ["active", "Ativos"],
          ["attention", "Atenção"],
          ["completed", "Concluídos"],
          ["cancelled", "Cancelados"],
          ["all", "Todos"]
        ] as const).map(([value, label]) =>
          <button className={state === value ? "active" : ""} type="button" key={value} onClick={() => setState(value)}>{label}</button>
        )}
      </div>

      <form className="order-control-filters" onSubmit={submitSearch}>
        <label>Modalidade
          <select value={fulfillment} onChange={(event) => setFulfillment(event.target.value as typeof fulfillment)}>
            <option value="">Todas</option>
            <option value="pickup">Retirada</option>
            <option value="delivery">Entrega</option>
          </select>
        </label>
        <label>Pedido
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="CL-..." maxLength={80} />
        </label>
        <button className="button ghost" type="submit">Buscar</button>
      </form>
    </div>

    <div className="order-control-meta">
      <small>Atualização automática a cada 10 s · última leitura {generatedAt}</small>
      {appliedQuery && <button type="button" onClick={() => { setQuery(""); setAppliedQuery(""); }}>Limpar busca</button>}
    </div>

    {data.orders.length === 0
      ? <div className="empty-state"><p>Nenhum pedido encontrado neste filtro.</p></div>
      : <div className="order-control-list">
          {data.orders.map((order) =>
            <OrderCard
              key={order.id}
              order={order}
              session={session}
              busyId={busyId}
              onCompletePickup={completePickup}
            />
          )}
        </div>}
  </section>;
}
