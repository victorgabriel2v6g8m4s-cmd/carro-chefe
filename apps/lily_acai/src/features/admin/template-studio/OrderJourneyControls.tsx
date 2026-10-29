import { useState } from "react";
import { journeyEvents, type JourneyEventId } from "./journey-events";

type Props = { enabled: boolean; onTrigger: (event: JourneyEventId, orderNumber: string) => void };

export function OrderJourneyControls({ enabled, onTrigger }: Props) {
  const [orderNumber, setOrderNumber] = useState("#2048");

  return <section className="template-sample-fields" aria-label="Simulação da jornada do pedido">
    <div><strong>Jornada do cliente</strong><p>Simule ações e atualizações. Cada etapa dispara o gatilho correspondente da árvore.</p></div>
    <label><span>Número do pedido</span><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} maxLength={24} /></label>
    <div className="template-save-row">{journeyEvents.map((event) => <button type="button" className="button ghost" key={event.id} onClick={() => onTrigger(event.id, orderNumber.trim() || "#2048")} disabled={!enabled}>{event.label}</button>)}</div>
    {!enabled && <small>Inicie o fluxo da conversa para habilitar as etapas.</small>}
  </section>;
}
