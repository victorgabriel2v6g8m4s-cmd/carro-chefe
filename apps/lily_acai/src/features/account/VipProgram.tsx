import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getLilySession, getLilyVip, postLilyVipAction, type AuthPayload, type LilyVipPayload } from "../../api";
import "./vip-program.css";

const termsVersion = "cooklily-vip-2026-10-v1";

function VipInviteDialog({ onClose, onSubscribe, consented, busy }: { onClose: () => void; onSubscribe: () => void; consented: boolean; busy: boolean }) {
  return <div className="vip-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="vip-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="vip-invite-title">
      <div className="vip-confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ "--confetti-index": i, left: `${(i * 37 + 11) % 100}%`, background: `hsl(${i * 47} 85% 45%)` } as React.CSSProperties} />)}</div>
      <span className="vip-crown" aria-hidden="true">♛</span>
      <span className="eyebrow">Convite especial</span>
      <h2 id="vip-invite-title">Você foi convidado para o VIP CookLily!</h2>
      <p>Conheça lançamentos e benefícios antes dos demais clientes. Sua inscrição só será ativada depois de ler e consentir com os termos.</p>
      <Link className="button ghost" to="/vip/termos" onClick={onClose}>Ler e consentir com os termos VIP</Link>
      <button className="button primary" type="button" disabled={!consented || busy} onClick={onSubscribe}>{busy ? "Ativando…" : "Inscrever-me no VIP"}</button>
      <small>Você pode cancelar sua inscrição quando quiser.</small>
    </section>
  </div>;
}

export function VipProfileSection() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [vip, setVip] = useState<LilyVipPayload | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const navigate = useNavigate();

  async function refresh() {
    const [current, state] = await Promise.all([getLilySession(), getLilyVip()]);
    setSession(current); setVip(state);
    if (state.membership?.consentedAt && state.membership.consentVersion === termsVersion) sessionStorage.setItem("cooklily-vip-consented", "yes");
  }
  useEffect(() => { void refresh().catch(() => undefined); }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("vip-consented") === "1" && vip?.membership?.consentedAt) setShowInvite(true);
  }, [vip]);
  async function subscribe() {
    if (!session) return;
    setBusy(true); setError("");
    try { await postLilyVipAction("subscribe", session.csrfToken); sessionStorage.removeItem("cooklily-vip-consented"); await refresh(); setMessage("Inscrição VIP ativada. Seja bem-vindo!"); window.dispatchEvent(new Event("cooklily:profile-updated")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível ativar sua inscrição."); }
    finally { setBusy(false); setShowInvite(false); }
  }

  async function redeem(event: FormEvent) {
    event.preventDefault(); if (!session || !code.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await postLilyVipAction("redeem", session.csrfToken, { code: code.trim() });
      setCode(""); await refresh();
      if (result.kind === "vip") setShowInvite(true);
      else setMessage("Os cupons foram creditados à sua conta e aparecerão no checkout.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Código não resgatado."); }
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

  if (!vip) return null;
  const memberStatus = vip.membership?.status;
  return <section className="checkout-section vip-profile-section">
    <div><span className="eyebrow">Programa CookLily</span><h2>{memberStatus === "active" ? "Membro VIP" : "Acesso antecipado VIP"}</h2>
      <p>{memberStatus === "active" ? "Veja lançamentos, cupons e ofertas especiais antes do público geral." : "Resgate um convite ou alcance a pontuação configurada para se candidatar."}</p></div>
    {memberStatus !== "active" && <form className="vip-redeem-form" onSubmit={redeem}>
      <label htmlFor="vip-code">Resgatar código ou cupom</label>
      <div><input id="vip-code" value={code} maxLength={40} autoCapitalize="characters" placeholder="Digite seu código" onChange={(event) => setCode(event.target.value.toUpperCase())} /><button className="button primary" disabled={busy || !code.trim()}>{busy ? "Validando…" : "Resgatar"}</button></div>
    </form>}
    {memberStatus === "invited" && !vip.membership?.consentedAt && <Link className="button ghost" to="/vip/termos">Ler os termos e continuar inscrição</Link>}
    {memberStatus === "invited" && vip.membership?.consentedAt && <button className="button primary" type="button" disabled={busy} onClick={() => void subscribe()}>Inscrever-me no VIP</button>}
    {memberStatus === "active" && <button className="button ghost" type="button" disabled={busy} onClick={() => void cancel()}>Cancelar inscrição VIP</button>}
    {vip.eligibleByPoints && memberStatus !== "active" && <button className="button gold" type="button" disabled={busy} onClick={() => void claim()}>Solicitar VIP com {vip.points.toLocaleString("pt-BR")} pontos</button>}
    {vip.pointsThreshold > 0 && memberStatus !== "active" && <small>{vip.points.toLocaleString("pt-BR")} de {vip.pointsThreshold.toLocaleString("pt-BR")} pontos para poder solicitar.</small>}
    {vip.coupons.length > 0 && <div className="vip-coupon-list"><strong>Cupons da sua conta</strong>{vip.coupons.map((coupon) => <article key={coupon.code} style={{ "--coupon-color": coupon.color } as React.CSSProperties}><span>{coupon.title}</span><code>{coupon.code}</code></article>)}</div>}
    {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
    {showInvite && <VipInviteDialog onClose={() => setShowInvite(false)} onSubscribe={() => void subscribe()} consented={Boolean(vip.membership?.consentedAt && vip.membership.consentVersion === termsVersion)} busy={busy} />}
  </section>;
}

export function VipTermsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [vip, setVip] = useState<LilyVipPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { Promise.all([getLilySession(), getLilyVip()]).then(([current, state]) => { setSession(current); setVip(state); }).catch(() => undefined); }, []);
  async function consent() {
    if (!session) { navigate("/entrar?next=%2Fvip%2Ftermos"); return; }
    setBusy(true); setError("");
    try { await postLilyVipAction("consent", session.csrfToken, { version: termsVersion }); sessionStorage.setItem("cooklily-vip-consented", "yes"); navigate("/perfil?vip-consented=1"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar o consentimento."); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!session || !window.confirm("Cancelar a inscrição VIP e revogar seu consentimento para analytics do programa?")) return;
    setBusy(true); setError("");
    try { await postLilyVipAction("cancel", session.csrfToken); navigate("/perfil"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível cancelar."); }
    finally { setBusy(false); }
  }
  return <article className="vip-terms-page checkout-section">
    <span className="eyebrow">CookLily · Programa VIP</span><h1>Termos e dados do programa</h1>
    <p>Versão {termsVersion}. A inscrição é voluntária e separada dos consentimentos de marketing e WhatsApp.</p>
    <h2>O que você recebe</h2><p>Acesso antecipado a lançamentos, cupons, promoções e ofertas identificadas como VIP. Condições, validade e disponibilidade são exibidas em cada campanha.</p>
    <h2>Analytics próprios necessários</h2><p>Para avaliar os experimentos, registramos sua adesão, abertura de lançamentos VIP e criação de pedidos durante sua participação. Os dados ficam na base CookLily, acessíveis a staff autorizado; o painel mostra apenas totais agregados. Eventos são excluídos após o prazo de retenção configurado (padrão: 180 dias, ajustável entre 30 e 3.650) e ao cancelar o VIP. Não enviamos telefone, respostas abertas ou eventos individualizados para plataformas de anúncios nem compartilhamos dados com a operação Carro Chefe ou terceiros.</p>
    <p>Respostas de pesquisas só são vinculadas à conta se a pesquisa apresentar seu próprio aviso de consentimento para esse vínculo. O consentimento VIP não substitui esse aviso.</p>
    <h2>Retenção e cancelamento</h2><p>Você pode cancelar a qualquer momento, sem justificativa. O acesso VIP termina imediatamente. Registros mínimos de consentimento e transações podem ser mantidos para comprovação, segurança e obrigações legais. Eventos experimentais serão mantidos apenas enquanto necessários à análise e depois removidos ou agregados. O prazo específico de retenção ainda precisa ser definido pelo controlador antes da entrada de participantes em produção.</p>
    <p>Cupons já creditados mantêm as condições e a validade informadas quando foram disponibilizados, salvo se a própria oferta informar claramente outra condição.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {vip?.membership?.status === "active" ? <button className="button ghost" disabled={busy} onClick={() => void cancel()}>Cancelar inscrição no VIP</button> : <button className="button primary" disabled={busy || !vip?.membership} onClick={() => void consent()}>{busy ? "Registrando…" : "Consentir com os termos VIP"}</button>}
    <Link className="button ghost" to="/perfil">Voltar ao perfil</Link>
  </article>;
}
