import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  createSavedAddress,
  getCustomerOrder,
  getCustomerOrders,
  getSavedAddresses,
  optOutOrderWhatsApp,
  type LilyAddressInput,
  type LilyOrder
} from "../orders/api";
import { AllergenNotice } from "../allergens/AllergenNotice";
import { LilyLoadingSpinner } from "../../loading-spinner";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  not_ready: "Preparando para a entrega",
  received: "Pedido recebido",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  preparing: "Montando pedido",
  ready_for_dispatch: "Pronto para despacho",
  ready_for_pickup: "Pronto para retirada",
  waiting_courier: "Aguardando entregador",
  courier_accepted: "Entregador aceitou",
  courier_arrived_pickup: "Entregador chegou para coleta",
  picked_up: "Pedido coletado",
  left_pickup: "Saiu para entrega",
  courier_arrived_delivery: "Entregador chegou ao endereço",
  delivered: "Pedido entregue",
  left_delivery: "Entrega finalizada",
  refunded: "Pagamento estornado",
  cancelled: "Pedido cancelado"
};

function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function customerOrderStatus(order: LilyOrder) {
  if (["refunded", "cancelled"].includes(order.status)) return order.status;
  if (order.status === "awaiting_payment") return order.status;
  if (order.fulfillmentType === "delivery"
    && !["not_ready", "not_applicable"].includes(order.deliveryStatus)) {
    return order.deliveryStatus;
  }
  if (order.fulfillmentType === "pickup" && order.operationStatus === "ready_for_dispatch") {
    return "ready_for_pickup";
  }
  if (order.operationStatus && order.operationStatus !== "received") return order.operationStatus;
  return order.status === "paid" ? "paid" : order.operationStatus || order.status;
}

function OrderTimeline({ order }: { order: LilyOrder }) {
  const events = [
    { key: "created", label: "Pedido recebido", at: order.createdAt },
    ...order.statusEvents.map((event, index) => ({
      key: `financial-${event.toStatus}-${event.createdAt}-${index}`,
      label: orderStatusLabel(event.toStatus),
      at: event.createdAt
    })),
    ...order.operationEvents.map((event, index) => ({
      key: `operation-${event.toStatus}-${event.createdAt}-${index}`,
      label: orderStatusLabel(event.toStatus),
      at: event.createdAt
    })),
    ...order.deliveryEvents.map((event, index) => ({
      key: `delivery-${event.toStatus}-${event.createdAt}-${index}`,
      label: orderStatusLabel(event.toStatus),
      at: event.createdAt
    }))
  ].sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());

  const unique = events.filter((event, index) =>
    index === 0 || event.label !== events[index - 1]?.label
  );

  return <section className="order-timeline-card" aria-label="Acompanhamento do pedido">
    <div className="order-timeline-heading">
      <div>
        <span className="eyebrow">Acompanhamento</span>
        <h2>{orderStatusLabel(customerOrderStatus(order))}</h2>
      </div>
      <small>Atualização automática</small>
    </div>
    <ol className="order-timeline">
      {unique.map((event, index) => <li key={event.key} className={index === unique.length - 1 ? "current" : "done"}>
        <span className="order-timeline-dot" aria-hidden="true" />
        <div>
          <strong>{event.label}</strong>
          <time dateTime={event.at}>{new Date(event.at).toLocaleString("pt-BR")}</time>
        </div>
      </li>)}
    </ol>
  </section>;
}

function AccountRequired() {
  return <section className="checkout-page empty-state">
    <span className="eyebrow">Conta CookLily</span>
    <h1>Entre para acessar esta área.</h1>
    <p>Pedidos feitos como convidado não aparecem no histórico de uma conta criada depois.</p>
    <div className="account-cta-row">
      <Link className="button primary" to="/entrar">Entrar</Link>
      <Link className="button ghost" to="/cadastro">Criar conta</Link>
    </div>
  </section>;
}

export function AddressesPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [addresses, setAddresses] = useState<Array<LilyAddressInput & { id: string; isDefault: boolean }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const current = await getLilySession();
    setSession(current);
    const result = await getSavedAddresses();
    setAddresses(result.addresses);
  }

  useEffect(() => {
    refresh().catch(() => setSession(null)).finally(() => setLoaded(true));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      await createSavedAddress({
        label: String(data.get("label") || "") || null,
        postalCode: String(data.get("postalCode")),
        street: String(data.get("street")),
        number: String(data.get("number")),
        complement: String(data.get("complement") || "") || null,
        neighborhood: String(data.get("neighborhood")),
        city: String(data.get("city")),
        state: String(data.get("state")),
        reference: String(data.get("reference") || "") || null
      }, session.csrfToken, addresses.length === 0);
      event.currentTarget.reset();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o endereço.");
    }
  }

  if (!loaded) return <section className="checkout-page"><LilyLoadingSpinner size="lg" label="Carregando"/></section>;
  if (!session) return <AccountRequired />;

  return <section className="checkout-page">
    <div className="checkout-heading"><div><span className="eyebrow">Minha conta</span><h1>Endereços</h1></div><Link className="button ghost" to="/pedidos">Meus pedidos</Link></div>
    <div className="address-book">
      {addresses.map((address) => <article key={address.id}>
        <strong>{address.label || "Endereço"}</strong>{address.isDefault && <span className="offer-pill">Padrão</span>}
        <p>{address.street}, {address.number}{address.complement ? ` · ${address.complement}` : ""}</p>
        <small>{address.neighborhood} · {address.city}/{address.state} · CEP {address.postalCode}</small>
      </article>)}
    </div>
    <form className="checkout-section address-form" onSubmit={submit}>
      <h2>Novo endereço</h2>
      <div className="address-grid">
        <label>Nome opcional<input name="label" placeholder="Casa, trabalho..." /></label>
        <label>CEP<input name="postalCode" required /></label>
        <label className="wide">Rua<input name="street" required /></label>
        <label>Número<input name="number" required /></label>
        <label>Complemento<input name="complement" /></label>
        <label>Bairro<input name="neighborhood" required /></label>
        <label>Cidade<input name="city" required /></label>
        <label>UF<input name="state" defaultValue="MS" maxLength={2} required /></label>
        <label className="wide">Referência<input name="reference" /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="button primary" type="submit">Salvar endereço</button>
    </form>
  </section>;
}

export function OrdersPage() {
  const [orders, setOrders] = useState<LilyOrder[] | null>(null);
  const [authenticated, setAuthenticated] = useState(true);
  useEffect(() => {
    getCustomerOrders().then((value) => setOrders(value.orders)).catch(() => setAuthenticated(false));
  }, []);
  if (!authenticated) return <AccountRequired />;
  if (!orders) return <section className="checkout-page"><LilyLoadingSpinner size="lg" label="Carregando pedidos"/></section>;

  return <section className="checkout-page">
    <div className="checkout-heading"><div><span className="eyebrow">Minha conta</span><h1>Meus pedidos</h1></div><Link className="button ghost" to="/enderecos">Endereços</Link></div>
    {orders.length === 0 ? <div className="empty-state"><p>Você ainda não tem pedidos vinculados a esta conta.</p><Link className="button primary" to="/cardapio">Ver cardápio</Link></div>
      : <div className="order-list">{orders.map((order) => <Link key={order.id} to={`/pedidos/${order.id}`}>
        <div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("pt-BR")}</small></div>
        <div><span>{orderStatusLabel(customerOrderStatus(order))}</span><strong>{money(order.grandTotalCents)}</strong></div>
      </Link>)}</div>}
  </section>;
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<LilyOrder | null>(null);
  const [error, setError] = useState("");
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const load = () => getCustomerOrder(id)
      .then((value) => { if (!cancelled) setOrder(value); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Pedido não encontrado."); });

    void load();
    const timer = window.setInterval(() => { void load(); }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id]);
  async function stopWhatsAppUpdates() {
    if (!order || whatsappBusy) return;
    setWhatsappBusy(true);
    try {
      const current = await getLilySession();
      await optOutOrderWhatsApp(order.id, { csrfToken: current.csrfToken });
      setOrder((value) => value ? { ...value, whatsappUpdatesOptIn: false } : value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível desativar as mensagens.");
    } finally {
      setWhatsappBusy(false);
    }
  }

    if (error) return <section className="checkout-page empty-state"><h1>{error}</h1><Link className="button primary" to="/pedidos">Meus pedidos</Link></section>;
  if (!order) return <section className="checkout-page"><LilyLoadingSpinner size="lg" label="Carregando pedido"/></section>;

  return <section className="checkout-page">
    <div className="checkout-heading"><div><span className="eyebrow">Pedido</span><h1>{order.orderNumber}</h1><p>{order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"} · {orderStatusLabel(customerOrderStatus(order))}</p></div><Link className="button ghost" to="/pedidos">Voltar</Link></div>
    <OrderTimeline order={order} />

    {order.fulfillmentType === "delivery" && order.routeEstimate && <section className="route-estimate-card">
      <span className="eyebrow">Previsão de rota</span>
      <strong>{(order.routeEstimate.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(order.routeEstimate.durationSeconds / 60))} min</strong>
      {order.routeEstimate.estimatedArrivalAt
        ? <p>Chegada estimada por volta de <b>{new Date(order.routeEstimate.estimatedArrivalAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>.</p>
        : <p>A previsão de chegada começa quando o entregador confirma a saída da coleta.</p>}
      <small>Estimativa de rota, não rastreamento GPS ao vivo.</small>
    </section>}

    {order.fulfillmentType === "delivery"
      && order.deliveryCode
      && ["picked_up", "left_pickup", "courier_arrived_delivery"].includes(order.deliveryStatus)
      && <section className="delivery-code-card">
        <span className="eyebrow">Código de entrega</span>
        <strong>{order.deliveryCode}</strong>
        <p>Informe este código ao entregador somente quando ele estiver no seu endereço com o pedido.</p>
      </section>}

    <div className="order-detail">
      {order.items.map((item) => <article key={item.id}>
        <div><strong>{item.quantity}× {item.productName}</strong><span>{item.kind === "combo" ? "Combo" : `${item.sizeMl} ml · ${item.variantName}`}</span></div>
        <strong>{money(item.lineTotalCents)}</strong>
        {item.flavors.length > 0 && <small>{item.flavors.map((flavor) => flavor.name).join(" + ")}</small>}
        {item.kind === "combo" && Array.isArray(item.configuration.selections) && <small>Itens: {(item.configuration.selections as Array<{ product?: { name?: string } }>).map((selection) => selection.product?.name).filter(Boolean).join(" + ")}</small>}
        {item.addons.length > 0 && <small>{item.addons.map((addon) => `${addon.name} ×${addon.quantity}`).join(", ")}</small>}
        <AllergenNotice summary={item.allergens} compact />
      </article>)}
      <div className="checkout-total"><span>Total</span><strong>{money(order.grandTotalCents)}</strong></div>
    </div>
    {order.status === "awaiting_payment" && <div className="payment-pending-card">
      <strong>Aguardando pagamento</strong>
      <p>Finalize ou acompanhe o pagamento deste pedido.</p>
      <Link className="button primary" to={`/pagamento/${order.id}`}>Ir para pagamento</Link>
    </div>}
    {order.whatsappUpdatesOptIn && <div className="guest-tracking-security-note">
      <strong>Atualizações no WhatsApp</strong>
      <p>Mensagens operacionais deste pedido estão ativas e são separadas de promoções.</p>
      <button className="button ghost" type="button" disabled={whatsappBusy}
        onClick={() => void stopWhatsAppUpdates()}>
        {whatsappBusy ? "Desativando..." : "Parar atualizações no WhatsApp"}
      </button>
    </div>}
        {order.status === "paid" && <div className="payment-approved-card"><strong>Pagamento confirmado</strong><p>O pedido já pode seguir para produção.</p></div>}
    {order.status === "refunded" && <div className="payment-refunded-card"><strong>Pagamento estornado</strong><p>O pagamento deste pedido foi estornado.</p></div>}
  </section>;
}
