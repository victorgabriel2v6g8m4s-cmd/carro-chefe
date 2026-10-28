import { useEffect, useState, type FormEvent } from "react";
import { getLilySession, parseResponse, type AuthPayload } from "../../api";

type AdminVipPayload = {
  pointsThreshold: number;
  analyticsRetentionDays: number;
  codes: Array<{ id: string; displaySuffix: string; kind: string; status: string; startsAt: string | null; endsAt: string | null; maxRedemptions: number | null; redemptionCount: number; createdAt: string }>;
  coupons: Array<{ id: string; code: string; title: string; status: string }>;
  membershipCounts: Record<string, number>;
  eventStats: Array<{ event: string; count: number }>;
};

function localDateTimeMin() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function AdminVipPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [data, setData] = useState<AdminVipPayload | null>(null);
  const [kind, setKind] = useState("vip");
  const [couponIds, setCouponIds] = useState<string[]>([]);
  const [validUntil, setValidUntil] = useState("");
  const [limit, setLimit] = useState("");
  const [threshold, setThreshold] = useState("0");
  const [retentionDays, setRetentionDays] = useState("180");
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedKind, setGeneratedKind] = useState("vip");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(current = session) {
    const auth = current ?? await getLilySession(); setSession(auth);
    const response = await fetch("/api/v1/lily/admin/vip", { credentials: "same-origin" });
    const result = await parseResponse<AdminVipPayload>(response);
    setData(result); setThreshold(String(result.pointsThreshold)); setRetentionDays(String(result.analyticsRetentionDays));
  }
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar o programa VIP.")); }, []);

  async function saveThreshold(event: FormEvent) {
    event.preventDefault(); if (!session) return; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/lily/admin/vip/settings", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify({ pointsThreshold: Number(threshold), analyticsRetentionDays: Number(retentionDays) }) });
      await parseResponse(response); setMessage("Pontuação mínima atualizada."); await load(session);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao salvar a configuração."); }
    finally { setBusy(false); }
  }

  async function createCode(event: FormEvent) {
    event.preventDefault(); if (!session) return; setBusy(true); setError(""); setGeneratedCode("");
    try {
      const response = await fetch("/api/v1/lily/admin/vip/codes", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify({ kind, couponIds: kind === "coupons" ? couponIds : [], startsAt: null, endsAt: validUntil ? new Date(validUntil).toISOString() : null, maxRedemptions: limit ? Number(limit) : null }) });
      const result = await parseResponse<{ code: string }>(response); setGeneratedCode(result.code); setGeneratedKind(kind); setCouponIds([]); setValidUntil(""); setLimit(""); await load(session);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar o código."); }
    finally { setBusy(false); }
  }

  async function updateStatus(id: string, status: string, endsAt?: string | null) {
    if (!session) return; setBusy(true); setError("");
    try { await fetch(`/api/v1/lily/admin/vip/codes/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Lily-CSRF": session.csrfToken }, body: JSON.stringify({ status, ...(endsAt === undefined ? {} : { endsAt }) }) }).then(parseResponse); await load(session); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o código."); }
    finally { setBusy(false); }
  }

  return <section className="admin-page vip-admin-page">
    <span className="eyebrow">CookLily · clientes</span><h1>Programa VIP</h1>
    {data && <div className="vip-admin-kpis"><article><strong>{data.membershipCounts.active ?? 0}</strong><span>membros ativos</span></article><article><strong>{data.membershipCounts.invited ?? 0}</strong><span>convites pendentes</span></article></div>}
    {data?.eventStats.length ? <section className="vip-admin-events"><h2>Atividade agregada do piloto</h2>{data.eventStats.map((event) => <article key={event.event}><span>{event.event === "launch_view" ? "Aberturas de lançamentos" : event.event === "vip_enrolled" ? "Inscrições ativadas" : "Pedidos iniciados por membros"}</span><strong>{event.count}</strong></article>)}</section> : null}
    <form className="checkout-section" onSubmit={saveThreshold}><h2>Configurações do programa</h2><p>Use zero para ocultar a candidatura por pontos. O consentimento dos termos continua obrigatório.</p><label>Pontuação mínima<input type="number" min="0" max="1000000" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></label><label>Retenção de analytics próprios (dias)<input type="number" min="30" max="3650" value={retentionDays} onChange={(event) => setRetentionDays(event.target.value)} /></label><button className="button primary" disabled={busy}>Salvar configurações</button></form>
    <form className="checkout-section vip-code-form" onSubmit={createCode}><h2>Criar código de campanha</h2><label>O código concede<select value={kind} onChange={(event) => { setKind(event.target.value); setCouponIds([]); }}><option value="vip">convite VIP</option><option value="coupons">cupons individuais</option></select></label>
      {kind === "coupons" && <fieldset><legend>Cupons creditados na conta</legend>{data?.coupons.map((coupon) => <label className="toggle" key={coupon.id}><input type="checkbox" checked={couponIds.includes(coupon.id)} onChange={(event) => setCouponIds((current) => event.target.checked ? [...current, coupon.id] : current.filter((id) => id !== coupon.id))} />{coupon.title} · {coupon.code}</label>)}</fieldset>}
      <label>Válido até<input type="datetime-local" min={localDateTimeMin()} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /><small>Opcional. Em branco, o código não vence.</small></label><label>Limite de resgates<input type="number" min="1" max="100000" placeholder="Sem limite" value={limit} onChange={(event) => setLimit(event.target.value)} /></label><button className="button primary" disabled={busy || (kind === "coupons" && couponIds.length === 0) || Boolean(validUntil && new Date(validUntil).getTime() <= Date.now())}>Criar código</button>
    </form>
    {generatedCode && <div className="vip-generated-code" role="status"><strong>Código gerado. Copie agora; ele não será exibido novamente.</strong><code>{generatedCode}</code><button className="button ghost" type="button" onClick={() => void navigator.clipboard.writeText(generatedCode)}>Copiar código</button>{generatedKind === "vip" && <><label>Link de convite para compartilhar<input readOnly value={`${window.location.origin}/lilyacai/cadastro?vipInvite=${encodeURIComponent(generatedCode)}`} onFocus={(event) => event.currentTarget.select()} /></label><button className="button ghost" type="button" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/lilyacai/cadastro?vipInvite=${encodeURIComponent(generatedCode)}`)}>Copiar link do convite</button></>}</div>}
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
    <h2>Códigos emitidos</h2><div className="vip-admin-code-list">{data?.codes.map((item) => { const expired = item.status !== "disabled" && Boolean(item.endsAt && new Date(item.endsAt).getTime() < Date.now()); return <article key={item.id}><div><small>•••• {item.displaySuffix} · {item.kind === "vip" ? "Convite VIP" : "Cupons"}</small><strong>{item.redemptionCount}{item.maxRedemptions == null ? "" : ` / ${item.maxRedemptions}`} resgates</strong><span>{expired ? `Vencido em ${new Date(item.endsAt!).toLocaleString("pt-BR")}` : item.endsAt ? `Até ${new Date(item.endsAt).toLocaleString("pt-BR")}` : "Sem data final"}</span></div><span className={`state-${item.status === "active" && !expired ? "live" : "off"}`}>{expired ? "vencido" : item.status}</span>{expired ? <button className="button ghost" disabled={busy} onClick={() => void updateStatus(item.id, "active", null)}>Reativar sem vencimento</button> : <button className="button ghost" disabled={busy || item.status === "disabled"} onClick={() => void updateStatus(item.id, item.status === "active" ? "paused" : "active")}>{item.status === "active" ? "Pausar" : "Ativar"}</button>}</article>; })}</div>
  </section>;
}
