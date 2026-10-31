import { useState, type FormEvent } from "react";
import { decideRestaurantOrder, saveDispatchChecklist, type KitchenOrder } from "./api";

type Props = { order: KitchenOrder; csrfToken: string; onDone: () => Promise<void>; onError: (message: string) => void };

export function RestaurantDecisionControls({ order, csrfToken, onDone, onError }: Props) {
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, action: "accept" | "reject") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    onError("");
    try {
      if (action === "accept") {
        await decideRestaurantOrder(order.id, csrfToken, {
          action,
          prepEstimateMinutes: Number(form.get("prepEstimateMinutes"))
        });
      } else {
        const reason = String(form.get("reason") || "").trim();
        await decideRestaurantOrder(order.id, csrfToken, { action, reason });
      }
      await onDone();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível registrar a decisão do restaurante.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="checkout-section kitchen-dispatch-controls">
    <strong>Decisão do restaurante</strong>
    <p>Aceite o pedido antes de liberar o preparo. A previsão é informativa e pode ser atualizada.</p>
    <form className="admin-form-grid" onSubmit={(event) => void submit(event, "accept")}>
      <label>Previsão inicial de preparo (minutos)
        <input name="prepEstimateMinutes" type="number" min="1" max="720" defaultValue={order.restaurantPrepEstimateMinutes ?? 30} required />
      </label>
      <button className="button primary" disabled={busy} type="submit">{busy ? "Salvando…" : "Aceitar pedido"}</button>
    </form>
    <form className="admin-form-grid" onSubmit={(event) => void submit(event, "reject")}>
      <label>Motivo para recusar
        <input name="reason" minLength={3} maxLength={300} required placeholder="Ex.: item indisponível" />
      </label>
      <button className="button ghost" disabled={busy} type="submit">Recusar pedido</button>
    </form>
  </section>;
}

export function DispatchChecklistControls({ order, csrfToken, onDone, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const checklist = order.dispatchChecklist ?? {};

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    onError("");
    try {
      await saveDispatchChecklist(order.id, csrfToken, {
        itemsVerified: form.get("itemsVerified") === "on",
        volumeCount: Number(form.get("volumeCount")),
        packageSealed: form.get("packageSealed") === "on",
        thermalBag: form.get("thermalBag") === "on"
      });
      await onDone();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Não foi possível concluir a conferência de expedição.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="checkout-section kitchen-dispatch-controls" onSubmit={(event) => void submit(event)}>
    <strong>Conferência antes de chamar entregador</strong>
    <label><input name="itemsVerified" type="checkbox" defaultChecked={Boolean(checklist.itemsVerified)} required /> Conferi itens e quantidades</label>
    <label>Quantidade de volumes
      <input name="volumeCount" type="number" min="1" max="30" defaultValue={checklist.volumeCount ?? 1} required />
    </label>
    <label><input name="packageSealed" type="checkbox" defaultChecked={Boolean(checklist.packageSealed)} required /> Embalagem lacrada quando aplicável</label>
    <label><input name="thermalBag" type="checkbox" defaultChecked={Boolean(checklist.thermalBag)} required /> Pedido acomodado na bag térmica</label>
    <button className="button primary" type="submit" disabled={busy || Boolean(order.dispatchCheckedAt)}>
      {order.dispatchCheckedAt ? "Conferência concluída" : busy ? "Conferindo…" : "Concluir conferência e chamar entregadores"}
    </button>
  </form>;
}
