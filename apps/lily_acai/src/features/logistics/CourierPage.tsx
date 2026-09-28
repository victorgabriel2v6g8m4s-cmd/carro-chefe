import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  abandonCourierDelivery,
  acceptCourierDelivery,
  getCourierDeliveries,
  getCourierDeliveryHistory,
  getCourierDeliveryRoute,
  rejectCourierDelivery,
  transitionCourierDelivery,
  type CourierDeliveriesPayload,
  type CourierDeliveryHistoryPayload,
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
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeMessage, setRouteMessage] = useState("");
  const action = nextAction(delivery.deliveryStatus);
  const canAbandon = ["courier_accepted", "courier_arrived_pickup"].includes(delivery.deliveryStatus);

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

  async function abandon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    props.onError("");
    try {
      await abandonCourierDelivery(delivery.id, {
        reason: String(form.get("reason") || "other") as "vehicle" | "incident" | "personal" | "other",
        note: String(form.get("note") || "").trim() || null
      }, props.csrfToken);
      await props.onChanged();
    } catch (cause) {
      props.onError(cause instanceof Error ? cause.message : "Não foi possível devolver a entrega à fila.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!delivery.assignedToMe
      || delivery.routeEstimate
      || ["left_delivery", "cancelled"].includes(delivery.deliveryStatus)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void calculateRoute(true);
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [delivery.id, delivery.assignedToMe, delivery.routeEstimate, delivery.deliveryStatus]);

  async function calculateRoute(silent = false) {
    setRouteBusy(true);
    setRouteMessage("");
    props.onError("");
    try {
      const result = await getCourierDeliveryRoute(delivery.id);
      if (!result.available) {
        const message = result.reason === "not_configured"
          ? "ETA/mapa ainda não foi configurado na VPS."
          : result.reason === "address_incomplete"
            ? "Endereço insuficiente para calcular a rota."
            : "O provedor de mapas está indisponível. A entrega continua normalmente.";
        if (!silent) setRouteMessage(message);
        return;
      }
      if (!silent) setRouteMessage(result.cached ? "Rota carregada do cache." : "Rota calculada e salva.");
      await props.onChanged();
    } catch (cause) {
      if (!silent) setRouteMessage(cause instanceof Error ? cause.message : "Não foi possível calcular a rota.");
    } finally {
      setRouteBusy(false);
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
      {delivery.assignedToMe && delivery.routeEstimate && <div className="courier-eta">
        <strong>{(delivery.routeEstimate.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(delivery.routeEstimate.durationSeconds / 60))} min de rota</strong>
        {delivery.routeEstimate.estimatedArrivalAt && <span>
          Chegada estimada: {new Date(delivery.routeEstimate.estimatedArrivalAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>}
        <small>Estimativa de rota; não é GPS ao vivo.</small>
        {delivery.routeEstimate.mapUrl && <a className="button ghost" href={delivery.routeEstimate.mapUrl}
          target="_blank" rel="noreferrer">Abrir rota no mapa</a>}
      </div>}
      {delivery.assignedToMe && !delivery.routeEstimate
        && !["left_delivery", "cancelled"].includes(delivery.deliveryStatus)
        && <button className="button ghost courier-route-button" type="button"
          onClick={() => void calculateRoute(false)} disabled={routeBusy}>
          {routeBusy ? "Calculando rota..." : "Calcular rota e ETA"}
        </button>}
      {routeMessage && <small className="courier-route-message">{routeMessage}</small>}
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

    {canAbandon && <details className="courier-secondary-action">
      <summary>Não consigo continuar esta entrega</summary>
      <form onSubmit={abandon}>
        <p>Disponível somente antes de confirmar a coleta. O pedido volta à fila e a ocorrência fica auditada.</p>
        <label>Motivo
          <select name="reason" defaultValue="vehicle" disabled={busy}>
            <option value="vehicle">Problema com veículo</option>
            <option value="incident">Imprevisto/incidente</option>
            <option value="personal">Motivo pessoal</option>
            <option value="other">Outro</option>
          </select>
        </label>
        <label>Observação opcional
          <textarea name="note" maxLength={300} rows={2} disabled={busy} />
        </label>
        <button className="button ghost" type="submit" disabled={busy}>
          {busy ? "Devolvendo..." : "Desistir e devolver à fila"}
        </button>
      </form>
    </details>}

    {!action && delivery.deliveryStatus === "left_delivery" && <div className="success">
      Entrega concluída e rota finalizada.
    </div>}
  </article>;
}

export function CourierPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [payload, setPayload] = useState<CourierDeliveriesPayload | null>(null);
  const [history, setHistory] = useState<CourierDeliveryHistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function refresh(includeHistory = false) {
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
    if (includeHistory) {
      setHistory(await getCourierDeliveryHistory({ page: 1, limit: 20 }));
    }
  }

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await refresh(true);
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
    const timer = window.setInterval(() => {
      refresh(false).catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível atualizar as entregas.");
      });
    }, 5000);
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
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível aceitar a entrega.");
    } finally {
      setBusyId("");
    }
  }

  async function reject(delivery: CourierDelivery, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busyId) return;
    const form = new FormData(event.currentTarget);
    setBusyId(delivery.id);
    setError("");
    try {
      await rejectCourierDelivery(delivery.id, {
        reason: String(form.get("reason") || "other") as "route_not_viable" | "capacity" | "vehicle" | "personal" | "other",
        note: String(form.get("note") || "").trim() || null
      }, session.csrfToken);
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível recusar esta oferta.");
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
              onChanged={() => refresh(true)}
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
                {busyId === delivery.id ? "Atualizando..." : "Aceitar entrega"}
              </button>
              <details className="courier-secondary-action">
                <summary>Recusar esta oferta</summary>
                <form onSubmit={(event) => void reject(delivery, event)}>
                  <label>Motivo
                    <select name="reason" defaultValue="route_not_viable" disabled={busyId === delivery.id}>
                      <option value="route_not_viable">Fora da minha rota</option>
                      <option value="capacity">Sem capacidade agora</option>
                      <option value="vehicle">Problema com veículo</option>
                      <option value="personal">Motivo pessoal</option>
                      <option value="other">Outro</option>
                    </select>
                  </label>
                  <label>Observação opcional
                    <textarea name="note" rows={2} maxLength={300} disabled={busyId === delivery.id} />
                  </label>
                  <button className="button ghost" type="submit" disabled={busyId === delivery.id}>
                    Não mostrar esta entrega novamente
                  </button>
                </form>
              </details>
            </article>)}
          </div>}
    </section>

    <section className="courier-section">
      <div className="courier-section-heading">
        <div><span className="eyebrow">Histórico</span><h2>Minhas atribuições recentes</h2></div>
        <span>{history?.total ?? 0}</span>
      </div>
      {!history || history.items.length === 0
        ? <div className="empty-state"><p>Nenhuma atribuição registrada ainda.</p></div>
        : <div className="courier-history-list">
            {history.items.map(({ assignment, delivery }) => <article key={assignment.id}>
              <div>
                <strong>{delivery.orderNumber}</strong>
                <small>{new Date(assignment.assignedAt).toLocaleString("pt-BR")}</small>
              </div>
              <div>
                <span className={`assignment-status assignment-${assignment.status}`}>
                  {assignment.status === "active" ? "Em andamento"
                    : assignment.status === "completed" ? "Concluída"
                    : assignment.status === "abandoned" ? "Desistência"
                    : assignment.status === "reassigned" ? "Reatribuída"
                    : "Cancelada"}
                </span>
                <small>{destinationText(delivery)}</small>
              </div>
            </article>)}
          </div>}
    </section>
  </section>;
}
