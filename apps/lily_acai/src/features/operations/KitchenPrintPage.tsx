import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getKitchenPrintTicket, type KitchenPrintTicket } from "./api";
import { AllergenNotice } from "../allergens/AllergenNotice";

function fulfillmentLabel(value: KitchenPrintTicket["fulfillmentType"]) {
  return value === "delivery" ? "Entrega" : "Retirada";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function KitchenPrintPage() {
  const { id = "" } = useParams();
  const [ticket, setTicket] = useState<KitchenPrintTicket | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getKitchenPrintTicket(id)
      .then((payload) => {
        if (!cancelled) setTicket(payload.ticket);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar a comanda.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <main className="kitchen-print-page"><p>Carregando comanda...</p></main>;
  }

  if (!ticket) {
    return <main className="kitchen-print-page">
      <div className="kitchen-print-actions">
        <Link className="button ghost" to="/painel/cozinha">Voltar para a cozinha</Link>
      </div>
      <p className="error" role="alert">{error || "Comanda indisponível."}</p>
    </main>;
  }

  return <main className="kitchen-print-page">
    <div className="kitchen-print-actions" aria-label="Ações da comanda">
      <Link className="button ghost" to="/painel/cozinha">Voltar para a cozinha</Link>
      <button className="button primary" type="button" onClick={() => window.print()}>
        Imprimir
      </button>
    </div>

    <article className="kitchen-print-ticket">
      <header>
        <div>
          <span className="kitchen-print-brand">CookLily · cozinha</span>
          <h1>Pedido {ticket.orderNumber}</h1>
        </div>
        {ticket.isHomologation && <strong className="kitchen-print-test">TESTE</strong>}
      </header>

      <dl className="kitchen-print-meta">
        <div><dt>Entrada</dt><dd>{formatTime(ticket.createdAt)}</dd></div>
        <div><dt>Modalidade</dt><dd>{fulfillmentLabel(ticket.fulfillmentType)}</dd></div>
      </dl>

      <section className="kitchen-print-items">
        <h2>Itens</h2>
        {ticket.items.length === 0 && <p>Nenhum item encontrado.</p>}
        {ticket.items.map((item) => <article key={item.id}>
          <h3>{item.quantity}× {item.productName}</h3>
          <p>{item.sizeMl > 0 ? item.sizeMl + " ml" : item.variantName}</p>
          {item.flavors.length > 0 && <p>
            <strong>Sabores:</strong> {item.flavors.map((flavor) => flavor.name).filter(Boolean).join(" · ")}
          </p>}
          {item.addons.length > 0 && <p>
            <strong>Adicionais:</strong> {item.addons.map((addon) => addon.quantity + "× " + addon.name).join(" · ")}
          </p>}
          <AllergenNotice summary={item.allergens} compact heading="ALERGÊNICOS" />
          {item.note && <p className="kitchen-print-note"><strong>Obs. item:</strong> {item.note}</p>}
        </article>)}
      </section>

      {ticket.customerNote && <section className="kitchen-print-order-note">
        <h2>Observação do pedido</h2>
        <p>{ticket.customerNote}</p>
      </section>}

      <footer>
        <strong>Comanda de produção</strong>
        <small>Sem dados de endereço, telefone ou códigos logísticos.</small>
      </footer>
    </article>
  </main>;
}
