import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "../../router";
import { getLilySession, type AuthPayload } from "../../api";
import { LilyLoadingSpinner } from "../../loading-spinner";
import { getOrderReview, submitOrderReview, type OrderReview } from "./review-api";

const DIMENSIONS = [
  { key: "store", label: "A loja" },
  { key: "delivery", label: "A entrega" },
  { key: "platform", label: "A plataforma CookLily" }
] as const;

type DimensionKey = typeof DIMENSIONS[number]["key"];

export function OrderReviewPage() {
  const { id = "" } = useParams();
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [review, setReview] = useState<OrderReview | null>(null);
  const [eligible, setEligible] = useState(false);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("delivery");
  const [selected, setSelected] = useState<Set<DimensionKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getLilySession(), getOrderReview(id)]).then(([auth, data]) => {
      if (!active) return;
      setSession(auth);
      setReview(data.review);
      setEligible(data.eligible);
      setFulfillment(data.fulfillmentType);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar a avaliação.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function toggle(key: DimensionKey, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || selected.size === 0) return;
    const data = new FormData(event.currentTarget);
    const input: Partial<Record<DimensionKey, { rating: number; comment: string }>> = {};
    for (const key of selected) {
      input[key] = {
        rating: Number(data.get(`${key}-rating`)),
        comment: String(data.get(`${key}-comment`) ?? "").trim()
      };
    }
    setBusy(true);
    setError("");
    try {
      const result = await submitOrderReview(id, session.csrfToken, input);
      setReview(result.review);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar sua avaliação.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="checkout-page"><LilyLoadingSpinner size="lg" label="Carregando avaliação" /></section>;
  if (error && !session) return <section className="checkout-page empty-state"><h1>Entre para avaliar seu pedido</h1><p>{error}</p><Link className="button primary" to={`/entrar?next=${encodeURIComponent(`/pedidos/${id}/avaliar`)}`}>Fazer login</Link></section>;

  return <section className="checkout-page order-review-page">
    <div className="checkout-heading"><div><span className="eyebrow">CookLily · pedido</span><h1>Avaliar experiência</h1><p>Escolha uma ou mais partes do pedido para avaliar.</p></div><Link className="button ghost" to={`/pedidos/${id}`}>Voltar ao pedido</Link></div>
    {error && <p className="error" role="alert">{error}</p>}
    {review ? <section className="success" role="status"><h2>Obrigado pela avaliação!</h2><p>Registrada em {new Date(review.submittedAt).toLocaleDateString("pt-BR")}.</p></section>
      : !eligible ? <section className="empty-state"><h2>A avaliação estará disponível após a conclusão do pedido.</h2></section>
        : <form className="checkout-section order-review-form" onSubmit={(event) => void submit(event)}>
          {DIMENSIONS.filter(({ key }) => key !== "delivery" || fulfillment === "delivery").map(({ key, label }) => <fieldset className="checkout-section" key={key}>
            <legend><label><input type="checkbox" checked={selected.has(key)} onChange={(event) => toggle(key, event.target.checked)} /> Avaliar {label}</label></legend>
            {selected.has(key) && <div className="admin-form-grid review-fields">
              <label>Nota
                <select name={`${key}-rating`} required defaultValue="5">
                  <option value="5">5 · Excelente</option><option value="4">4 · Muito bom</option><option value="3">3 · Bom</option><option value="2">2 · Pode melhorar</option><option value="1">1 · Ruim</option>
                </select>
              </label>
              <label>Comentário opcional<textarea name={`${key}-comment`} maxLength={500} rows={3} placeholder="Conte um pouco mais (opcional)" /></label>
            </div>}
          </fieldset>)}
          <button className="button primary" type="submit" disabled={busy || selected.size === 0}>{busy ? "Enviando…" : "Enviar avaliação"}</button>
        </form>}
  </section>;
}
