import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  acceptCourierDelivery,
  getCourierDeliveries,
  transitionCourierDelivery,
  type CourierDeliveriesPayload,
  type CourierDelivery,
  type CourierDeliveryAction
} from "./api";

const STATUS_LABELS: Record<string, string> = {
  waiting_courier: "Disponível",
  courier_accepted: "Entrega aceita",
  courier_arrived_pickup: "Na coleta",
  picked_up: "Pedido coletado",
  left_pickup: "Em rota",
  courier_arrived_delivery: "No endereço",
  delivered: "Entregue",
  left_delivery: "Finalizada",
  cancelled: "Cancelada"
};

function destinationText(delivery: CourierDelivery) {
  const address = delivery.destination;
  if (!address) return "Destino não informado";
  if (delivery.assignedToMe && address.street) {
    return [
      `${address.street}${address.number ? `, ${address.number}` : ""}`,
      address.complement || null,
      address.neighborhood || null,
      [address.city, address.state].filter(Boolean).join("/")
    ].filter(Boolean).join(" · ");
  }
  return [address.neighborhood, address.city, address.state].filter(Boolean).join(" · ") || "Região não informada";
}

function nextAction(status: string): {
  action: CourierDeliveryAction;
  label: string;
  codeLabel?: string;
} | null {
  if (status === "courier_accepted") return { action: "arrived_pickup", label: "Cheguei na coleta" };
  if (status === "courier_arrived_pickup") return {
    action: "confirm_pickup",
    label: "Pegar o pedido",
    codeLabel: "Código de coleta"
  };
  if (status === "picked_up") return { action: "left_pickup", label: "Saí do local de coleta" };
  if (status === "left_pickup") return { action: "arrived_delivery", label: "Cheguei no local de entrega" };
  if (status === "courier_arrived_delivery") return {
    action: "confirm_delivery",
    label: "Entreguei o pedido",
    codeLabel: "Código de entrega"
  };
  if (status === "delivered") return { action: "left_delivery", label: "Saí do local de entrega" };
  return null;
}

function DeliveryCard(props: {
  delivery: CourierDelivery;
  csrfToken: string;
  codesReady: boolean;
  pickupAddressText: string | null;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const { delivery } = props;
  const [busy, setBusy] = useState(false);
  const action = nextAction(delivery.deliveryStatus);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") || "").trim();

    setBusy(true);
    props.onError("");
    try {
      await transitionCourierDelivery(delivery.id, {
        action: action.action,
        ...(action.codeLabel ? { code } : {})
      }, props.csrfToken);
      event.currentTarget.reset();
      await props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof Error ? cause.message : "Não foi possível atualizar a entrega.");
    } finally {
      setBusy(false);
    }
  }

  return <article className="courier-delivery-card">
    <header>
      <div>
        <span className="eyebrow">{delivery.isHomologation ? "Teste · " : ""}{delivery.orderNumber}</span>
        <strong>{STATUS_LABELS[delivery.deliveryStatus] || delivery.deliveryStatus}</strong>
      </div>
      <span>{delivery.itemCount} item(ns)</span>
    </header>

    <div className="courier-route-box">
      <small>Coleta</small>
      <strong>{props.pickupAddressText || "Endereço de retirada ainda não configurado"}</strong>
      <span aria-hidden="true">↓</span>
      <small>Destino</small>
      <strong>{destinationText(delivery)}</strong>
      {delivery.assignedToMe && delivery.destination?.reference && <em>
        Referência: {delivery.destination.reference}
      </em>}
    </div>

    <ol className="courier-mini-timeline">
      {delivery.deliveryEvents.slice(-4).map((event, index) => <li key={`${event.toStatus}-${event.createdAt}-${index}`}>
        <strong>{STATUS_LABELS[event.toStatus] || event.toStatus}</strong>
        <time>{new Date(event.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
      </li>)}
    </ol>

    {action && <form className="courier-action-form" onSubmit={submit}>
      {action.codeLabel && <>
        <label>{action.codeLabel}
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            minLength={6}
            placeholder="000000"
            required
            disabled={!props.codesReady || busy}
          />
        </label>
        {!props.codesReady && <p className="error">Códigos logísticos ainda não foram configurados na VPS.</p>}
      </>}
      <button className="button primary" type="submit" disabled={busy || Boolean(action.codeLabel && !props.codesReady)}>
        {busy ? "Atualizando..." : action.label}
      </button>
    </form>}

    {!action && delivery.deliveryStatus === "left_delivery" && <div className="success">
      Entrega concluída e rota finalizada.
    </div>}
  </article>;
}

export function CourierPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [payload, setPayload] = useState<CourierDeliveriesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const current = await getLilySession();
    if (!["courier", "admin"].includes(current.user.role)) {
      throw new Error("Esta área é exclusiva para entregadores CookLily.");
    }
    if (current.mfa?.required && !current.mfa.verified) {
      throw new Error("Confirme o MFA desta sessão antes de acessar as entregas.");
    }
    const deliveries = await getCourierDeliveries();
    setSession(current);
    setPayload(deliveries);
  }

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await refresh();
        if (!cancelled) setError("");
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar as entregas.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => { void load(); }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const activeMine = useMemo(() => payload?.mine.filter((delivery) =>
    !["left_delivery", "cancelled"].includes(delivery.deliveryStatus)
  ) ?? [], [payload]);

  async function accept(delivery: CourierDelivery) {
    if (!session || busyId) return;
    setBusyId(delivery.id);
    setError("");
    try {
      await acceptCourierDelivery(delivery.id, session.csrfToken);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível aceitar a entrega.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <section className="admin-state"><h1>Carregando entregas...</h1></section>;

  if (!session || !payload) return <section className="admin-state">
    <span className="eyebrow">CookLily · entregas</span>
    <h1>Acesso de entregador necessário.</h1>
    <p>{error}</p>
    <Link className="button primary" to="/entrar?next=/entregas">Entrar</Link>
  </section>;

  return <section className="courier-page">
    <div className="courier-heading">
      <div>
        <span className="eyebrow">CookLily · logística</span>
        <h1>Entregas</h1>
        <p>Uma entrega só aparece aqui depois de paga e liberada pela cozinha.</p>
      </div>
      <Link className="button ghost" to="/perfil">Minha conta</Link>
    </div>

    {error && <p className="error" role="alert">{error}</p>}

    <section className="courier-section">
      <div className="courier-section-heading">
        <div><span className="eyebrow">Minha rota</span><h2>Entrega em andamento</h2></div>
        <span>{activeMine.length}</span>
      </div>
      {activeMine.length === 0
        ? <div className="empty-state"><p>Você não possui entrega em andamento.</p></div>
        : <div className="courier-delivery-list">
            {activeMine.map((delivery) => <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              csrfToken={session.csrfToken}
              codesReady={payload.logisticsCodesReady}
              pickupAddressText={payload.pickupAddressText}
              onChanged={refresh}
              onError={setError}
            />)}
          </div>}
    </section>

    <section className="courier-section">
      <div className="courier-section-heading">
        <div><span className="eyebrow">Fila</span><h2>Entregas disponíveis</h2></div>
        <span>{payload.available.length}</span>
      </div>
      {payload.available.length === 0
        ? <div className="empty-state"><p>Nenhuma entrega disponível agora.</p></div>
        : <div className="courier-available-grid">
            {payload.available.map((delivery) => <article className="courier-available-card" key={delivery.id}>
              <div>
                <span className="eyebrow">{delivery.orderNumber}</span>
                <strong>{delivery.itemCount} item(ns)</strong>
                <p>{destinationText(delivery)}</p>
              </div>
              <button className="button primary" type="button" disabled={busyId === delivery.id}
                onClick={() => void accept(delivery)}>
                {busyId === delivery.id ? "Aceitando..." : "Aceitar entrega"}
              </button>
            </article>)}
          </div>}
    </section>
  </section>;
}
