import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGuestOrderTracking, type LilyGuestTrackingOrder } from "./api";
import { readGuestOrderToken } from "./guest-token";

const LABELS: Record<string, string> = {
  received: "Pedido recebido",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pagamento confirmado",
  preparing: "Montando pedido",
  ready_for_dispatch: "Pronto para despacho",
  ready_for_pickup: "Pronto para retirada",
  not_ready: "Preparando para a entrega",
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

function label(status: string) {
  return LABELS[status] ?? status.replace(/_/g, " ");
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function currentStatus(order: LilyGuestTrackingOrder) {
  if (["refunded", "cancelled"].includes(order.status)) return order.status;
  if (order.status === "awaiting_payment") return order.status;
  if (order.fulfillmentType === "delivery" && !["not_ready", "not_applicable"].includes(order.deliveryStatus)) {
    return order.deliveryStatus;
  }
  if (order.fulfillmentType === "pickup" && order.operationStatus === "ready_for_dispatch") return "ready_for_pickup";
  if (order.operationStatus && order.operationStatus !== "received") return order.operationStatus;
  return order.status === "paid" ? "paid" : order.operationStatus || order.status;
}

function GuestTimeline({ order }: { order: LilyGuestTrackingOrder }) {
  const events = [
    { key: "created", label: "Pedido recebido", at: order.createdAt },
    ...order.statusEvents.map((event, index) => ({
      key: `financial-${event.toStatus}-${event.createdAt}-${index}`,
      label: label(event.toStatus),
      at: event.createdAt
    })),
    ...order.operationEvents.map((event, index) => ({
      key: `operation-${event.toStatus}-${event.createdAt}-${index}`,
      label: label(event.toStatus),
      at: event.createdAt
    })),
    ...order.deliveryEvents.map((event, index) => ({
      key: `delivery-${event.toStatus}-${event.createdAt}-${index}`,
      label: label(event.toStatus),
      at: event.createdAt
    }))
  ].sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());

  const unique = events.filter((event, index) => index === 0 || event.label !== events[index - 1]?.label);

  return <section className="order-timeline-card" aria-label="Acompanhamento do pedido">
    <div className="order-timeline-heading">
      <div><span className="eyebrow">Acompanhamento</span><h2>{label(currentStatus(order))}</h2></div>
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

export function GuestOrderTrackingPage() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<LilyGuestTrackingOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token = id ? readGuestOrderToken(id) : null;

    if (!id || !token) {
      setError("Este navegador não possui a chave de acompanhamento deste pedido.");
      setLoaded(true);
      return () => { cancelled = true; };
    }

    const load = () => getGuestOrderTracking(id, token)
      .then((value) => {
        if (!cancelled) {
          setOrder(value);
          setError("");
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Pedido não encontrado.");
      });

    void load().finally(() => { if (!cancelled) setLoaded(true); });
    const timer = window.setInterval(() => { void load(); }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id]);

  if (!loaded) return <section className="checkout-page"><h1>Carregando acompanhamento...</h1></section>;

  if (!order) return <section className="checkout-page empty-state">
    <span className="eyebrow">Acompanhamento seguro</span>
    <h1>Não foi possível abrir este pedido.</h1>
    <p>{error || "A chave de acompanhamento está ausente ou não é mais válida neste navegador."}</p>
    <p>Por segurança, a CookLily não procura pedidos guest apenas por telefone, nome ou número do pedido nesta tela.</p>
    <Link className="button primary" to="/cardapio">Voltar ao cardápio</Link>
  </section>;

  return <section className="checkout-page guest-tracking-page">
    <div className="checkout-heading">
      <div>
        <span className="eyebrow">Pedido guest</span>
        <h1>{order.orderNumber}</h1>
        <p>{order.fulfillmentType === "delivery" ? "Entrega" : "Retirada"} · {label(currentStatus(order))}</p>
      </div>
      <Link className="button ghost" to="/cardapio">Cardápio</Link>
    </div>

    {order.isHomologation && <div className="operation-warning">
      <strong>Pedido de homologação.</strong>
      <p>Este pedido foi criado em modo de teste.</p>
    </div>}

    <GuestTimeline order={order} />

    {order.fulfillmentType === "delivery" && order.routeEstimate && <section className="route-estimate-card">
      <span className="eyebrow">Previsão de rota</span>
      <strong>{(order.routeEstimate.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(order.routeEstimate.durationSeconds / 60))} min</strong>
      {order.routeEstimate.estimatedArrivalAt
        ? <p>Chegada estimada por volta de <b>{new Date(order.routeEstimate.estimatedArrivalAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>.</p>
        : <p>A previsão de chegada começa quando o entregador confirma a saída da coleta.</p>}
      <small>Estimativa calculada pela rota; não representa GPS ao vivo do entregador.</small>
    </section>}

    {order.fulfillmentType === "delivery" && order.deliveryCode && <section className="delivery-code-card">
      <span className="eyebrow">Código de entrega</span>
      <strong>{order.deliveryCode}</strong>
      <p>Informe este código ao entregador somente quando ele estiver no seu endereço com o pedido.</p>
    </section>}

    <section className="guest-tracking-summary">
      <div className="guest-tracking-items">
        {order.items.map((item) => <article key={item.id}>
          <div>
            <strong>{item.quantity}× {item.productName}</strong>
            <small>{item.kind === "combo" ? "Combo" : `${item.sizeMl} ml · ${item.variantName}`}</small>
            {item.flavors.length > 0 && <small>{item.flavors.map((flavor) => flavor.name).join(" + ")}</small>}
            {item.addons.length > 0 && <small>{item.addons.map((addon) => `${addon.name} ×${addon.quantity}`).join(", ")}</small>}
          </div>
          <strong>{money(item.lineTotalCents)}</strong>
        </article>)}
      </div>
      <div className="checkout-total"><span>Total</span><strong>{money(order.grandTotalCents)}</strong></div>
    </section>

    {order.status === "awaiting_payment" && <div className="payment-pending-card">
      <strong>Aguardando pagamento</strong>
      <p>Você pode voltar à cobrança sem colocar a chave do pedido na URL.</p>
      <Link className="button primary" to={`/pagamento/${order.id}`}>Ir para pagamento</Link>
    </div>}

    <div className="guest-tracking-security-note">
      <strong>Privacidade</strong>
      <p>Esta tela recebe apenas o status e o resumo mínimo do pedido. Endereço, telefone, observações internas e dados de atribuição não fazem parte da resposta pública.</p>
    </div>
  </section>;
}
