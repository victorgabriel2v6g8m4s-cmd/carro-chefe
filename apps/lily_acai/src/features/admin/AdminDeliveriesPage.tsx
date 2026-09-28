import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getLilySession, type AuthPayload } from "../../api";
import {
  getAdminDeliveries,
  getAdminDeliveryHistory,
  reassignAdminDelivery,
  type AdminDeliveriesPayload,
  type AdminDeliveryHistoryPayload,
  type CourierDelivery
} from "../logistics/api";

const STATUS_LABELS: Record<string, string> = {
  waiting_courier: "Aguardando entregador",
  courier_accepted: "Aceita",
  courier_arrived_pickup: "Entregador na coleta",
  picked_up: "Coletada",
  left_pickup: "Em rota",
  courier_arrived_delivery: "No endereço",
  delivered: "Entregue",
  left_delivery: "Finalizada",
  cancelled: "Cancelada"
};

function destinationText(delivery: CourierDelivery) {
  const address = delivery.destination;
  if (!address) return "Destino não informado";
  return [
    address.street ? `${address.street}${address.number ? `, ${address.number}` : ""}` : null,
    address.neighborhood || null,
    [address.city, address.state].filter(Boolean).join("/")
  ].filter(Boolean).join(" · ") || "Destino não informado";
}

function canReassign(status: string) {
  return ["waiting_courier", "courier_accepted", "courier_arrived_pickup"].includes(status);
}

export function AdminDeliveriesPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<AdminDeliveriesPayload | null>(null);
  const [history, setHistory] = useState<AdminDeliveryHistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function refresh(includeHistory = false) {
    const current = await getLilySession();
    if (current.user.role !== "admin") {
      throw new Error("Esta área exige perfil admin CookLily.");
    }
    if (current.mfa?.required && !current.mfa.verified) {
      throw new Error("Confirme o MFA desta sessão antes de administrar entregas.");
    }
    const currentDeliveries = await getAdminDeliveries();
    setSession(current);
    setData(currentDeliveries);
    if (includeHistory) {
      setHistory(await getAdminDeliveryHistory({ page: 1, limit: 50 }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    refresh(true)
      .then(() => { if (!cancelled) setError(""); })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as entregas.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    const timer = window.setInterval(() => {
      refresh(false).catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível atualizar as entregas.");
      });
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function reassign(delivery: AdminDeliveriesPayload["deliveries"][number], event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || busyId) return;
    const form = new FormData(event.currentTarget);
    const rawCourier = String(form.get("courierUserId") || "");
    setBusyId(delivery.id);
    setError("");
    setSaved("");
    try {
      await reassignAdminDelivery(delivery.id, {
        courierUserId: rawCourier || null,
        reason: String(form.get("reason") || "operational") as "operational" | "courier_unavailable" | "support" | "other",
        note: String(form.get("note") || "").trim() || null
      }, session.csrfToken);
      setSaved(`Entrega ${delivery.orderNumber} atualizada com segurança.`);
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível reatribuir a entrega.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <section className="admin-state"><h1>Carregando logística...</h1></section>;
  if (!session || !data) return <section className="admin-state">
    <span className="eyebrow">CookLily · logística</span>
    <h1>Acesso admin necessário.</h1>
    <p>{error}</p>
    <Link className="button primary" to="/entrar?next=/painel/entregas">Entrar</Link>
  </section>;

  return <section className="admin-page wide admin-deliveries-page">
    <div className="admin-heading">
      <div>
        <span className="eyebrow">CookLily · administração</span>
        <h1>Entregas e reatribuições</h1>
        <p>Reatribuições são permitidas somente antes da coleta. Depois do código de coleta, a cadeia de custódia fica bloqueada.</p>
      </div>
      <div className="admin-actions">
        <Link className="button ghost" to="/painel">Resumo</Link>
        <Link className="button ghost" to="/entregas">Visão do entregador</Link>
      </div>
    </div>

    {error && <p className="error" role="alert">{error}</p>}
    {saved && <p className="success" role="status">{saved}</p>}

    <section className="courier-section">
      <div className="courier-section-heading">
        <div><span className="eyebrow">Operação atual</span><h2>Pedidos de entrega</h2></div>
        <span>{data.deliveries.length}</span>
      </div>

      {data.deliveries.length === 0
        ? <div className="empty-state"><p>Nenhuma entrega operacional encontrada.</p></div>
        : <div className="admin-delivery-list">
            {data.deliveries.map((delivery) => <article className="admin-delivery-card" key={delivery.id}>
              <header>
                <div>
                  <span className="eyebrow">{delivery.isHomologation ? "Teste · " : ""}{delivery.orderNumber}</span>
                  <strong>{STATUS_LABELS[delivery.deliveryStatus] || delivery.deliveryStatus}</strong>
                </div>
                <span>{delivery.itemCount} item(ns)</span>
              </header>
              <p>{destinationText(delivery)}</p>
              <small>Responsável: {delivery.courier?.displayName || delivery.courier?.id || "fila aberta"}</small>

              {canReassign(delivery.deliveryStatus)
                ? <form className="admin-reassign-form" onSubmit={(event) => void reassign(delivery, event)}>
                    <label>Novo responsável
                      <select name="courierUserId" defaultValue="">
                        <option value="">
                          {delivery.courier ? "Devolver para a fila" : "Selecione um entregador"}
                        </option>
                        {data.couriers
                          .filter((courier) => courier.id !== delivery.courier?.id)
                          .map((courier) => <option value={courier.id} key={courier.id}>
                            {courier.displayName || courier.id} · {courier.role}
                          </option>)}
                      </select>
                    </label>
                    <label>Motivo
                      <select name="reason" defaultValue="operational">
                        <option value="operational">Redistribuição operacional</option>
                        <option value="courier_unavailable">Entregador indisponível</option>
                        <option value="support">Ajuste pelo suporte</option>
                        <option value="other">Outro</option>
                      </select>
                    </label>
                    <label className="wide">Observação opcional
                      <input name="note" maxLength={300} />
                    </label>
                    <button className="button primary" type="submit" disabled={busyId === delivery.id}>
                      {busyId === delivery.id ? "Atualizando..." : delivery.courier ? "Reatribuir / devolver" : "Atribuir entregador"}
                    </button>
                  </form>
                : <div className="operation-warning compact">
                    <strong>Cadeia de custódia bloqueada.</strong>
                    <p>Depois da coleta, uma troca de responsável exige tratamento excepcional fora deste fluxo automático.</p>
                  </div>}
            </article>)}
          </div>}
    </section>

    <section className="courier-section">
      <div className="courier-section-heading">
        <div><span className="eyebrow">Auditoria operacional</span><h2>Histórico de atribuições</h2></div>
        <span>{history?.total ?? 0}</span>
      </div>
      {!history || history.items.length === 0
        ? <div className="empty-state"><p>Nenhum vínculo de entrega registrado ainda.</p></div>
        : <div className="admin-delivery-history">
            {history.items.map(({ assignment, courier, delivery }) => <article key={assignment.id}>
              <div>
                <strong>{delivery.orderNumber}</strong>
                <small>{new Date(assignment.assignedAt).toLocaleString("pt-BR")}</small>
              </div>
              <div>
                <strong>{courier.displayName || courier.id}</strong>
                <small>{assignment.status === "completed" ? "Concluída"
                  : assignment.status === "abandoned" ? "Desistência"
                  : assignment.status === "reassigned" ? "Reatribuída"
                  : assignment.status === "active" ? "Ativa"
                  : "Cancelada"}</small>
              </div>
              <div>
                <span>{destinationText(delivery)}</span>
                {assignment.endReason && <small>Motivo: {assignment.endReason}</small>}
              </div>
            </article>)}
          </div>}
    </section>
  </section>;
}
