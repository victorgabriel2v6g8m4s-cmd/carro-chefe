import { useEffect, useState, type FormEvent } from "react";
import { getLilySession, parseResponse, uploadLilyMedia, type AuthPayload } from "../../api";

type Coupon = Record<string, any>;
type Option = { id: string; name?: string; displayName?: string; originalName?: string };

const empty = {
  code: "", title: "", description: "", type: "percentage", value: "10", minimumOrder: "0", maxDiscount: "",
  color: "#820023", status: "draft", startsAt: "", endsAt: "", recurrence: "none", maxUsesTotal: "",
  maxUsesPerCustomer: "1", allowCombination: false, isAdditive: false, appliesToShipping: false,
  vipOnly: false,
  categoryIds: [] as string[], productIds: [] as string[], imageMediaId: ""
};

function localDate(value: string | null) { return value ? new Date(value).toLocaleString("pt-BR") : "Sem limite"; }

export function AdminCouponsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [media, setMedia] = useState<Option[]>([]);
  const [draft, setDraft] = useState({ ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const current = session ?? await getLilySession();
    setSession(current);
    const response = await fetch("/api/v1/lily/admin/coupons", { credentials: "same-origin" });
    const result = await parseResponse<{ coupons: Coupon[]; categories: Option[]; products: Option[]; media: Option[] }>(response);
    setCoupons(result.coupons);
    setCategories(result.categories);
    setProducts(result.products);
    setMedia(result.media);
  }

  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os cupons.")); }, []);

  function startEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setDraft({
      ...empty, code: coupon.code, title: coupon.title, description: coupon.description ?? "", type: coupon.type,
      value: String(coupon.value), minimumOrder: String(coupon.minimumOrderCents / 100),
      maxDiscount: coupon.maxDiscountCents == null ? "" : String(coupon.maxDiscountCents / 100), color: coupon.color,
      status: coupon.status, startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : "",
      endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString().slice(0, 16) : "", recurrence: coupon.recurrence,
      maxUsesTotal: coupon.maxUsesTotal == null ? "" : String(coupon.maxUsesTotal),
      maxUsesPerCustomer: String(coupon.maxUsesPerCustomer), allowCombination: coupon.allowCombination,
      isAdditive: coupon.isAdditive, appliesToShipping: coupon.appliesToShipping,
      vipOnly: coupon.vipOnly ?? false,
      categoryIds: coupon.categoryIds, productIds: coupon.productIds, imageMediaId: coupon.imageMediaId ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadArt(file: File) {
    if (!session) return;
    setBusy(true); setError("");
    try {
      const uploaded = await uploadLilyMedia(file, session.csrfToken);
      setMedia((current) => [uploaded, ...current]);
      setDraft((current) => ({ ...current, imageMediaId: uploaded.id }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao enviar a arte."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!session) return;
    setBusy(true); setError(""); setMessage("");
    const cents = (value: string) => Math.round(Number(value.replace(",", ".") || 0) * 100);
    const payload = {
      code: draft.code, title: draft.title, description: draft.description || null, type: draft.type,
      value: draft.type === "percentage" ? Math.round(Number(draft.value) * 100) : draft.type === "fixed" ? cents(draft.value) : 0,
      minimumOrderCents: cents(draft.minimumOrder), maxDiscountCents: draft.maxDiscount ? cents(draft.maxDiscount) : null,
      color: draft.color, imageMediaId: draft.imageMediaId || null, status: draft.status,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null, recurrence: draft.recurrence,
      maxUsesTotal: draft.maxUsesTotal ? Number(draft.maxUsesTotal) : null,
      maxUsesPerCustomer: Number(draft.maxUsesPerCustomer), allowCombination: draft.allowCombination,
      isAdditive: draft.isAdditive, appliesToShipping: draft.appliesToShipping,
      vipOnly: draft.vipOnly,
      categoryIds: draft.categoryIds, productIds: draft.productIds
    };
    try {
      const response = await fetch(editingId ? `/api/v1/lily/admin/coupons/${encodeURIComponent(editingId)}` : "/api/v1/lily/admin/coupons", {
        method: editingId ? "PATCH" : "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify(payload)
      });
      await parseResponse(response);
      await load(); setEditingId(null); setDraft({ ...empty }); setMessage("Cupom salvo.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o cupom."); }
    finally { setBusy(false); }
  }

  async function quickStatus(coupon: Coupon, status: string) {
    if (!session) return; setError("");
    try {
      const response = await fetch(`/api/v1/lily/admin/coupons/${encodeURIComponent(coupon.id)}`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify({ status })
      });
      await parseResponse(response); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível alterar o status."); }
  }

  const toggle = (key: "categoryIds" | "productIds", id: string) => setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id] }));
  return <section className="admin-page coupon-admin-page">
    <div className="admin-heading"><div><span className="eyebrow">CookLily · ofertas</span><h1>Cupons</h1><p>Crie descontos por produto, categoria ou entrega e acompanhe seus resgates.</p></div><a className="button ghost" href={`${import.meta.env.BASE_URL}painel`}>Voltar ao painel</a></div>
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="state-live" role="status">{message}</p>}
    <form className="admin-form-grid coupon-form" onSubmit={submit}>
      <h2>{editingId ? "Editar cupom" : "Novo cupom"}</h2>
      <label>Código<input required minLength={2} maxLength={32} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="BEMVINDO10" /></label>
      <label>Título<input required minLength={2} maxLength={100} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="admin-span">Descrição<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={500} /></label>
      <label>Tipo<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option><option value="free_shipping">Frete grátis</option></select></label>
      {draft.type !== "free_shipping" && <label>{draft.type === "percentage" ? "Desconto (%)" : "Desconto (R$)"}<input type="number" min="0" step={draft.type === "percentage" ? "1" : "0.01"} max={draft.type === "percentage" ? "100" : undefined} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} required /></label>}
      <label>Pedido mínimo (R$)<input type="number" min="0" step="0.01" value={draft.minimumOrder} onChange={(e) => setDraft({ ...draft, minimumOrder: e.target.value })} /></label>
      <label>Desconto máximo (R$)<input type="number" min="0" step="0.01" value={draft.maxDiscount} onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })} /></label>
      <label>Início da validade<input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></label>
      <label>Fim da validade<input type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} /></label>
      <label>Recorrência do limite<select value={draft.recurrence} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}><option value="none">Limite por cliente sem reinício</option><option value="daily">Reinicia diariamente</option><option value="weekly">Reinicia semanalmente</option><option value="monthly">Reinicia mensalmente</option></select></label>
      <label>Usos totais (vazio = ilimitado)<input type="number" min="1" value={draft.maxUsesTotal} onChange={(e) => setDraft({ ...draft, maxUsesTotal: e.target.value })} /></label>
      <label>Usos por cliente/período<input type="number" min="1" value={draft.maxUsesPerCustomer} onChange={(e) => setDraft({ ...draft, maxUsesPerCustomer: e.target.value })} required /></label>
      <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="draft">Rascunho</option><option value="active">Ativo</option><option value="paused">Pausado</option><option value="disabled">Desativado</option></select></label>
      <label className="toggle"><input type="checkbox" checked={draft.vipOnly} onChange={(e) => setDraft({ ...draft, vipOnly: e.target.checked })} />Exclusivo para clientes VIP</label>
      <label>Cor do cupom<input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></label>
      <label>Arte quadrada<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadArt(file); }} /></label>
      <label>Arte enviada<select value={draft.imageMediaId} onChange={(e) => setDraft({ ...draft, imageMediaId: e.target.value })}><option value="">Sem arte</option>{media.map((item) => <option key={item.id} value={item.id}>{item.originalName}</option>)}</select></label>
      <fieldset className="coupon-scope"><legend>Aplicável a produtos</legend>{categories.map((item) => <label key={item.id} className="toggle"><input type="checkbox" checked={draft.categoryIds.includes(item.id)} onChange={() => toggle("categoryIds", item.id)} />{item.name}</label>)}{products.map((item) => <label key={item.id} className="toggle"><input type="checkbox" checked={draft.productIds.includes(item.id)} onChange={() => toggle("productIds", item.id)} />{item.displayName}</label>)}</fieldset>
      <label className="toggle"><input type="checkbox" checked={draft.appliesToShipping} onChange={(e) => setDraft({ ...draft, appliesToShipping: e.target.checked })} />Aplicável ao frete</label>
      <label className="toggle"><input type="checkbox" checked={draft.allowCombination} onChange={(e) => setDraft({ ...draft, allowCombination: e.target.checked, isAdditive: e.target.checked ? draft.isAdditive : false })} />Pode combinar com outros cupons</label>
      <label className="toggle"><input type="checkbox" checked={draft.isAdditive} disabled={!draft.allowCombination} onChange={(e) => setDraft({ ...draft, isAdditive: e.target.checked })} />Somar descontos quando combinado</label>
      <div className="admin-span coupon-preview" style={{ "--coupon-color": draft.color } as React.CSSProperties}><strong>{draft.title || "Seu cupom"}</strong><span>{draft.code || "CÓDIGO"}</span>{draft.imageMediaId && <small>Arte selecionada</small>}</div>
      <div className="admin-span"><button className="button primary" type="submit" disabled={busy}>{busy ? "Salvando…" : editingId ? "Salvar alterações" : "Criar cupom"}</button> {editingId && <button className="button ghost" type="button" onClick={() => { setEditingId(null); setDraft({ ...empty }); }}>Cancelar edição</button>}</div>
    </form>
    <h2>Cupons cadastrados</h2>
    <div className="coupon-card-grid">{coupons.map((coupon) => <article className="coupon-admin-card" key={coupon.id} style={{ "--coupon-color": coupon.color } as React.CSSProperties}>
      <div className="coupon-art">{coupon.image?.url ? <img src={coupon.image.url} alt="" /> : <span>{coupon.code.slice(0, 2)}</span>}</div>
      <div><small>{coupon.code} · {coupon.status}</small><h3>{coupon.title}</h3><p>{coupon.type === "percentage" ? `${coupon.value / 100}%` : coupon.type === "fixed" ? `R$ ${(coupon.value / 100).toFixed(2)}` : "Frete grátis"} · {coupon.redemptionCount} resgates</p><small>Validade: {localDate(coupon.startsAt)} – {localDate(coupon.endsAt)}</small></div>
      <div className="coupon-card-actions"><button className="button ghost" onClick={() => startEdit(coupon)}>Editar</button>{coupon.status === "active" ? <button className="button ghost" onClick={() => void quickStatus(coupon, "paused")}>Pausar</button> : <button className="button ghost" onClick={() => void quickStatus(coupon, "active")}>Ativar</button>}<button className="button ghost" onClick={() => void quickStatus(coupon, "disabled")}>Desativar</button></div>
    </article>)}</div>
  </section>;
}
