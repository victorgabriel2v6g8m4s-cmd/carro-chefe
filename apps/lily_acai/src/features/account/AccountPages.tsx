import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  createSavedAddress,
  getCustomerOrder,
  getCustomerOrders,
  getSavedAddresses,
  type LilyAddressInput,
  type LilyOrder
} from "../orders/api";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "Pedido recebido",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  preparing: "Montando pedido",
  ready_for_dispatch: "Pronto para despacho",
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

function OrderTimeline({ order }: { order: LilyOrder }) {
  const events = [
    { key: "created", label: "Pedido recebido", at: order.createdAt },
    ...order.statusEvents.map((event, index) => ({
      key: `${event.toStatus}-${event.createdAt}-${index}`,
      label: orderStatusLabel(event.toStatus),
      at: event.createdAt
    }))
  ];

  const unique = events.filter((event, index) =>
    index === 0 || event.label !== events[index - 1]?.label
  );

  return <section className="order-timeline-card" aria-label="Acompanhamento do pedido">
    <div className="order-timeline-heading">
      <div>
        <span className="eyebrow">Acompanhamento</span>
        <h2>{orderStatusLabel(order.status)}</h2>
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

  if (!loaded) return <section className="checkout-page"><h1>Carregando...</h1></section>;
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
  if (!orders) return <section className="checkout-page"><h1>Carregando pedidos...</h1></section>;

  return <section className="checkout-page">
    <div className="checkout-heading"><div><span className="eyebrow">Minha conta</span><h1>Meus pedidos</h1></div><Link className="button ghost" to="/enderecos">Endereços</Link></div>
    {orders.length === 0 ? <div className="empty-state"><p>Você ainda não tem pedidos vinculados a esta conta.</p><Link className="button primary" to="/cardapio">Ver cardápio</Link></div>
      : <div className="order-list">{orders.map((order) => <Link key={order.id} to={`/pedidos/${order.id}`}>
        <div><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleString("pt-BR")}</small></div>
        <div><span>{orderStatusLabel(order.status)}</span><strong>{money(order.grandTotalCents)}</strong></div>
      </Link>)}</div>}
  </section>;
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<LilyOrder | null>(null);
  const [error, setError] = useState("");
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
  if (error) return <section className="checkout-page empty-state"><h1>{error}</h1><Link className="button primary" to="/pedidos">Meus pedidos</Link></section>;
  if (!order) return <section className="checkout-page"><h1>Carregando pedido...</h1></section>;

  return <section className="checkout-page">
    <div className="checkout-heading"><div><span className="eyebrow">Pedido</span><h1>{order.orderNumber}</h1><p>{order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"} · {orderStatusLabel(order.status)}</p></div><Link className="button ghost" to="/pedidos">Voltar</Link></div>
    <OrderTimeline order={order} />

    <div className="order-detail">
      {order.items.map((item) => <article key={item.id}>
        <div><strong>{item.quantity}× {item.productName}</strong><span>{item.kind === "combo" ? "Combo" : `${item.sizeMl} ml · ${item.variantName}`}</span></div>
        <strong>{money(item.lineTotalCents)}</strong>
        {item.flavors.length > 0 && <small>{item.flavors.map((flavor) => flavor.name).join(" + ")}</small>}
        {item.kind === "combo" && Array.isArray(item.configuration.selections) && <small>Itens: {(item.configuration.selections as Array<{ product?: { name?: string } }>).map((selection) => selection.product?.name).filter(Boolean).join(" + ")}</small>}
        {item.addons.length > 0 && <small>{item.addons.map((addon) => `${addon.name} ×${addon.quantity}`).join(", ")}</small>}
      </article>)}
      <div className="checkout-total"><span>Total</span><strong>{money(order.grandTotalCents)}</strong></div>
    </div>
    {order.status === "awaiting_payment" && <div className="payment-pending-card">
      <strong>Aguardando pagamento</strong>
      <p>Finalize ou acompanhe o pagamento deste pedido.</p>
      <Link className="button primary" to={`/pagamento/${order.id}`}>Ir para pagamento</Link>
    </div>}
    {order.status === "paid" && <div className="payment-approved-card"><strong>Pagamento confirmado</strong><p>O pedido já pode seguir para produção.</p></div>}
    {order.status === "refunded" && <div className="payment-refunded-card"><strong>Pagamento estornado</strong><p>O pagamento deste pedido foi estornado.</p></div>}
  </section>;
}
