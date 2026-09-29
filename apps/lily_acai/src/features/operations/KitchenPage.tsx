import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  advanceKitchenOrder,
  getKitchenOrders,
  type KitchenOperationStatus,
  type KitchenOrder
} from "./api";

const COLUMNS: Array<{
  status: KitchenOperationStatus;
  title: string;
  description: string;
}> = [
  {
    status: "received",
    title: "Recebidos",
    description: "Pedidos que acabaram de entrar."
  },
  {
    status: "waiting_payment",
    title: "Aguardando pagamento",
    description: "Ainda não devem ser montados."
  },
  {
    status: "preparing",
    title: "Montar pedido",
    description: "Pagamento liberado para produção."
  },
  {
    status: "ready_for_dispatch",
    title: "Despachar pedido",
    description: "Prontos para retirada ou logística."
  }
];

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

function paymentLabel(status: string) {
  if (status === "paid") return "Pago";
  if (status === "awaiting_payment") return "Aguardando pagamento";
  if (status === "refunded") return "Estornado";
  if (status === "cancelled") return "Cancelado";
  return status.replace(/_/g, " ");
}

function actionLabel(order: KitchenOrder) {
  if (order.operationStatus === "received") {
    return order.financialStatus === "paid" ? "Receber e liberar montagem" : "Receber pedido";
  }
  if (order.operationStatus === "waiting_payment") {
    return order.financialStatus === "paid" ? "Liberar montagem" : "Aguardando pagamento";
  }
  if (order.operationStatus === "preparing") return "Pedido pronto";
  return "Aguardando despacho";
}

function KitchenCard(props: {
  order: KitchenOrder;
  csrfToken: string;
  onUpdated: (order: KitchenOrder) => void;
  onError: (message: string) => void;
}) {
  const { order } = props;
  const [busy, setBusy] = useState(false);
  const blockedByPayment =
    order.operationStatus === "waiting_payment"
    && order.financialStatus !== "paid";
  const finalKitchenStage = order.operationStatus === "ready_for_dispatch";
  const printable = order.financialStatus === "paid" && ["preparing", "ready_for_dispatch"].includes(order.operationStatus);

  async function advance() {
    setBusy(true);
    props.onError("");
    try {
      const updated = await advanceKitchenOrder(order.id, props.csrfToken);
      props.onUpdated(updated);
    } catch (cause) {
      props.onError(cause instanceof Error ? cause.message : "Não foi possível avançar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  return <article className="kitchen-order-card">
    <header>
      <div>
        <strong>{order.orderNumber}</strong>
        <small>{new Date(order.createdAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })}</small>
      </div>
      <span className={order.financialStatus === "paid" ? "state-live" : "state-off"}>
        {paymentLabel(order.financialStatus)}
      </span>
    </header>

    <div className="kitchen-order-meta">
      <span>{order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"}</span>
      <strong>{money(order.grandTotalCents)}</strong>
      {order.isHomologation && <span className="kitchen-test-badge">Teste</span>}
    </div>
    {order.sla && <div className={"kitchen-sla " + (order.sla.status === "overdue" ? "is-overdue" : "is-on-track")}>
      <span>{order.sla.status === "overdue" ? "Atraso na montagem" : "SLA da montagem"}</span>
      <strong>{order.sla.status === "overdue"
        ? order.sla.overdueMinutes + " min acima do SLA"
        : order.sla.remainingMinutes + " min restantes"}</strong>
      <small>SLA configurado: {order.sla.thresholdMinutes} min · início {
        new Date(order.sla.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      }</small>
    </div>}

    <ul className="kitchen-items">
      {order.items.map((item) => <li key={item.id}>
        <strong>{item.quantity}× {item.productName}</strong>
        <span>{item.sizeMl > 0 ? `${item.sizeMl} ml` : item.variantName}</span>
        {item.flavors.length > 0 && <small>
          {item.flavors.map((flavor) => flavor.name).filter(Boolean).join(" · ")}
        </small>}
        {item.addons.length > 0 && <small>
          + {item.addons.map((addon) => `${addon.quantity}× ${addon.name}`).join(" · ")}
        </small>}
        {item.note && <em>Obs.: {item.note}</em>}
      </li>)}
    </ul>

    {order.customerNote && <p className="kitchen-customer-note">
      <strong>Observação do pedido:</strong> {order.customerNote}
    </p>}

    {finalKitchenStage && order.fulfillmentType === "delivery" && <div className="kitchen-pickup-code">
      <span>Código de coleta</span>
      {order.pickupCode
        ? <strong>{order.pickupCode}</strong>
        : <small>Configure a chave de códigos logísticos na VPS.</small>}
      <p>Informe este código ao entregador somente quando ele estiver no local de coleta.</p>
    </div>}

    <div className="kitchen-card-actions">
      {printable && <Link
        className="button ghost"
        to={"/painel/cozinha/imprimir/" + order.id}
        target="_blank"
        rel="noreferrer"
      >
        Imprimir comanda
      </Link>}
      <button
        className={finalKitchenStage ? "button ghost" : "button primary"}
        type="button"
        disabled={busy || blockedByPayment || finalKitchenStage}
        onClick={() => void advance()}
      >
        {busy ? "Atualizando..." : actionLabel(order)}
      </button>
    </div>
  </article>;
}

export function KitchenPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [slaSummary, setSlaSummary] = useState<{
    kitchenPreparationSlaMinutes: number | null;
    overdue: number;
  }>({ kitchenPreparationSlaMinutes: null, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const current = await getLilySession();
    if (!["staff", "admin"].includes(current.user.role)) {
      throw new Error("Acesso da equipe necessário.");
    }
    if (current.mfa?.required && !current.mfa.verified) {
      throw new Error("Valide o MFA desta sessão antes de abrir a cozinha.");
    }
    setSession(current);
    const result = await getKitchenOrders();
    setOrders(result.orders);
    setSlaSummary(result.sla);
  }

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        await load();
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar a cozinha.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const grouped = useMemo(() => Object.fromEntries(
    COLUMNS.map((column) => [
      column.status,
      orders.filter((order) => order.operationStatus === column.status)
    ])
  ) as Record<KitchenOperationStatus, KitchenOrder[]>, [orders]);

  function updateOrder(next: KitchenOrder) {
    setOrders((current) => current.map((order) => order.id === next.id ? next : order));
  }

  if (loading) return <section className="admin-state"><h1>Carregando cozinha...</h1></section>;

  if (!session) return <section className="admin-state">
    <span className="eyebrow">CookLily · cozinha</span>
    <h1>Acesso da equipe necessário.</h1>
    <p>{error}</p>
    <Link className="button primary" to="/perfil">Abrir minha conta</Link>
  </section>;

  return <section className="admin-page kitchen-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · produção</span>
        <h1>Fila da cozinha</h1>
        <p>Pagamento e produção são controlados separadamente. Pedidos não pagos não podem entrar em montagem.</p>
      </div>
      <div className="kitchen-heading-actions">
        {slaSummary.kitchenPreparationSlaMinutes
          ? <span className={"kitchen-sla-summary " + (slaSummary.overdue > 0 ? "is-overdue" : "")}>
              {slaSummary.overdue > 0
                ? slaSummary.overdue + " pedido" + (slaSummary.overdue === 1 ? "" : "s") + " atrasado" + (slaSummary.overdue === 1 ? "" : "s")
                : "SLA montagem: " + slaSummary.kitchenPreparationSlaMinutes + " min"}
            </span>
          : <span>SLA de montagem desativado</span>}
        <span>Atualiza a cada 5 s</span>
        <Link className="button ghost" to="/painel">Painel</Link>
      </div>
    </div>

    {error && <p className="error" role="alert">{error}</p>}

    <div className="kitchen-board">
      {COLUMNS.map((column) => <section className="kitchen-column" key={column.status}>
        <header>
          <div>
            <h2>{column.title}</h2>
            <p>{column.description}</p>
          </div>
          <strong>{grouped[column.status]?.length ?? 0}</strong>
        </header>

        <div className="kitchen-column-list">
          {(grouped[column.status] ?? []).map((order) => <KitchenCard
            key={order.id}
            order={order}
            csrfToken={session.csrfToken}
            onError={setError}
            onUpdated={updateOrder}
          />)}
          {(grouped[column.status] ?? []).length === 0 && <div className="kitchen-empty">
            Nenhum pedido nesta etapa.
          </div>}
        </div>
      </section>)}
    </div>
  </section>;
}
