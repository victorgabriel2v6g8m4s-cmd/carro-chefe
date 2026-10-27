import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getLilySession, getLilyVip, postLilyVipAction, type AuthPayload, type LilyVipPayload } from "../../api";
import { resolveVipConsentNavigation, vipTermsVersion } from "./vip-consent-navigation";
import "./vip-program.css";

function VipInviteDialog({ onClose, onSubscribe, consented, busy }: { onClose: () => void; onSubscribe: () => void; consented: boolean; busy: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={dialogRef} className="vip-invite-dialog" aria-labelledby="vip-invite-title" aria-describedby="vip-invite-description" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="vip-confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, background: `hsl(${i * 47} 85% 45%)`, animationDelay: `${-((i % 8) * 45)}ms` } as React.CSSProperties} />)}</div>
    <span className="vip-crown" aria-hidden="true">♛</span>
    <span className="eyebrow">Convite especial</span>
    <h2 id="vip-invite-title">Você foi convidado para o VIP CookLily!</h2>
    <p id="vip-invite-description">Conheça lançamentos e benefícios antes dos demais clientes. Sua inscrição só será ativada depois de ler e consentir com os termos.</p>
    <Link className="button ghost" to="/vip/termos" onClick={onClose}>Ler e consentir com os termos VIP</Link>
    <button className="button primary" type="button" disabled={!consented || busy} onClick={onSubscribe}>{busy ? "Ativando…" : "Inscrever-me no VIP"}</button>
    <button className="vip-dialog-close" type="button" aria-label="Fechar convite VIP" onClick={onClose}>Fechar</button>
    <small>Você pode cancelar sua inscrição quando quiser.</small>
  </dialog>;
}

export function VipProfileSection() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [vip, setVip] = useState<LilyVipPayload | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemMessage, setRedeemMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [redemptionTarget, setRedemptionTarget] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const closeInvite = useCallback(() => setShowInvite(false), []);

  async function refresh() {
    setLoadError("");
    const [current, state] = await Promise.all([getLilySession(), getLilyVip()]);
    setSession(current); setVip(state);
  }
  useEffect(() => { void refresh().catch((cause) => setLoadError(cause instanceof Error ? cause.message : "Não foi possível carregar o programa VIP.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { setRedemptionTarget(document.getElementById("profile-code-redemption")); }, []);
  useEffect(() => {
    if (!vip) return;
    const redirect = resolveVipConsentNavigation(location.pathname, location.search, vip.membership);
    if (!redirect) return;
    if (redirect.shouldShowInvite) setShowInvite(true);
    navigate({ pathname: redirect.pathname, search: redirect.search }, { replace: true });
  }, [location.pathname, location.search, navigate, vip]);

  async function subscribe() {
    if (!session) return;
    setBusy(true); setError("");
    try { await postLilyVipAction("subscribe", session.csrfToken); await refresh(); setMessage("Inscrição VIP ativada. Seja bem-vindo!"); window.dispatchEvent(new Event("cooklily:profile-updated")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível ativar sua inscrição."); }
    finally { setBusy(false); setShowInvite(false); }
  }

  async function redeem(event: FormEvent) {
    event.preventDefault(); if (!session || !code.trim()) return;
    setBusy(true); setRedeemError(""); setRedeemMessage("");
    try {
      const result = await postLilyVipAction("redeem", session.csrfToken, { code: code.trim() });
      setCode(""); await refresh();
      if (result.kind === "vip") setShowInvite(true);
      else setRedeemMessage("Código resgatado. O benefício estará disponível na sua conta.");
    } catch (cause) { setRedeemError(cause instanceof Error ? cause.message : "Não foi possível resgatar o código."); }
    finally { setBusy(false); }
  }

  async function claim() {
    if (!session) return; setBusy(true); setError("");
    try { await postLilyVipAction("claim", session.csrfToken); await refresh(); setShowInvite(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível solicitar o VIP."); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!session || !window.confirm("Cancelar sua inscrição VIP? Seus benefícios antecipados serão encerrados.")) return;
    setBusy(true); setError("");
    try { await postLilyVipAction("cancel", session.csrfToken); await refresh(); setMessage("Sua inscrição VIP foi cancelada."); window.dispatchEvent(new Event("cooklily:profile-updated")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível cancelar a inscrição."); }
    finally { setBusy(false); }
  }

  const memberStatus = vip?.membership?.status;
  return <>
    <section className="checkout-section vip-profile-section" aria-busy={loading}>
      {loading && <span role="status">Carregando benefícios…</span>}
      {!loading && !vip && <><h2>Benefícios da conta</h2><p role="alert">{loadError || "Não foi possível carregar os benefícios."}</p><button className="button ghost" type="button" onClick={() => { setLoading(true); void refresh().catch((cause) => setLoadError(cause instanceof Error ? cause.message : "Não foi possível carregar os benefícios.")).finally(() => setLoading(false)); }}>Tentar novamente</button></>}
      {vip && <>
        <div><span className="eyebrow">CookLily · benefícios</span><h2>{memberStatus === "active" ? "Membro VIP" : "Acesso antecipado"}</h2>
          <p>{memberStatus === "active" ? "Veja lançamentos, cupons e ofertas especiais antes do público geral." : "Acompanhe seus benefícios e pontos disponíveis."}</p></div>
        {memberStatus === "invited" && !vip.membership?.consentedAt && <Link className="button ghost" to="/vip/termos">Ler os termos e continuar inscrição</Link>}
        {memberStatus === "invited" && vip.membership?.consentedAt && <button className="button primary" type="button" disabled={busy} onClick={() => void subscribe()}>Inscrever-me no VIP</button>}
        {memberStatus === "active" && <button className="button ghost" type="button" disabled={busy} onClick={() => void cancel()}>Cancelar inscrição VIP</button>}
        {vip.eligibleByPoints && memberStatus !== "active" && <button className="button gold" type="button" disabled={busy} onClick={() => void claim()}>Solicitar acesso com {vip.points.toLocaleString("pt-BR")} pontos</button>}
        {vip.pointsThreshold > 0 && memberStatus !== "active" && <small>{vip.points.toLocaleString("pt-BR")} de {vip.pointsThreshold.toLocaleString("pt-BR")} pontos para poder solicitar.</small>}
        {vip.coupons.length > 0 && <div className="vip-coupon-list"><strong>Cupons da sua conta</strong>{vip.coupons.map((coupon) => <article key={coupon.code} style={{ "--coupon-color": coupon.color } as React.CSSProperties}><span>{coupon.title}</span><code>{coupon.code}</code></article>)}</div>}
        {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
        {showInvite && <VipInviteDialog onClose={closeInvite} onSubscribe={() => void subscribe()} consented={Boolean(vip.membership?.consentedAt && vip.membership.consentVersion === vipTermsVersion)} busy={busy} />}
      </>}
    </section>
    {redemptionTarget && createPortal(<details className="vip-code-disclosure">
      <summary>Resgate seu código</summary>
      <form className="vip-redeem-form" onSubmit={redeem}>
        <label htmlFor="account-redeem-code">Código</label>
        <div><input id="account-redeem-code" value={code} maxLength={80} autoCapitalize="characters" autoComplete="off" placeholder="Digite seu código" onChange={(event) => setCode(event.target.value)} /><button className="button ghost" disabled={busy || !code.trim() || !session}>{busy ? "Validando…" : "Resgatar"}</button></div>
        {redeemError && <p className="error" role="alert">{redeemError}</p>}{redeemMessage && <p className="success" role="status">{redeemMessage}</p>}
      </form>
    </details>, redemptionTarget)}
  </>;
}
