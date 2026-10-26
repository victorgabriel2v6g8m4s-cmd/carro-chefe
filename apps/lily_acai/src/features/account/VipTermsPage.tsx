import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getLilySession, getLilyVip, postLilyVipAction, type AuthPayload, type LilyVipPayload } from "../../api";
import { vipTermsVersion } from "./vip-consent-navigation";
import "./vip-program.css";

export function VipTermsPage() {
  const [session, setSession] = useState<AuthPayload | null>(null);
  const [vip, setVip] = useState<LilyVipPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sessionLoadError, setSessionLoadError] = useState("");
  const navigate = useNavigate();
  async function loadTermsState() {
    setLoadError("");
    const [currentResult, vipResult] = await Promise.allSettled([getLilySession(), getLilyVip()]);
    setSession(currentResult.status === "fulfilled" ? currentResult.value : null);
    setSessionLoadError(currentResult.status === "rejected" ? (currentResult.reason instanceof Error ? currentResult.reason.message : "Não foi possível verificar sua conta.") : "");
    if (vipResult.status === "fulfilled") setVip(vipResult.value);
    else setLoadError(vipResult.reason instanceof Error ? vipResult.reason.message : "Não foi possível verificar sua inscrição. Tente novamente.");
  }
  useEffect(() => { void loadTermsState().finally(() => setLoading(false)); }, []);
  async function consent() {
    if (!session) { navigate("/entrar?next=%2Fvip%2Ftermos"); return; }
    setBusy(true); setError("");
    try { await postLilyVipAction("consent", session.csrfToken, { version: vipTermsVersion }); navigate("/perfil?vip-consented=1"); }
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
    <p>Versão {vipTermsVersion}. A inscrição é voluntária e separada dos consentimentos de marketing e WhatsApp.</p>
    <h2>O que você recebe</h2><p>Acesso antecipado a lançamentos, cupons, promoções e ofertas identificadas como VIP. Condições, validade e disponibilidade são exibidas em cada campanha.</p>
    <h2>Analytics próprios necessários</h2><p>Para avaliar os experimentos, registramos sua adesão, abertura de lançamentos VIP e criação de pedidos durante sua participação. Os dados ficam na base CookLily, acessíveis a staff autorizado; o painel mostra apenas totais agregados. Eventos são excluídos após o prazo de retenção configurado (padrão: 180 dias, ajustável entre 30 e 3.650) e ao cancelar o VIP. Não enviamos telefone, respostas abertas ou eventos individualizados para plataformas de anúncios nem compartilhamos dados com a operação Carro Chefe ou terceiros.</p>
    <p>Respostas de pesquisas só são vinculadas à conta se a pesquisa apresentar seu próprio aviso de consentimento para esse vínculo. O consentimento VIP não substitui esse aviso.</p>
    <h2>Retenção e cancelamento</h2><p>Você pode cancelar a qualquer momento, sem justificativa. O acesso VIP termina imediatamente. Registros mínimos de consentimento e transações podem ser mantidos para comprovação, segurança e obrigações legais. Eventos experimentais serão mantidos apenas enquanto necessários à análise e depois removidos ou agregados. O prazo específico de retenção ainda precisa ser definido pelo controlador antes da entrada de participantes em produção.</p>
    <p>Cupons já creditados mantêm as condições e a validade informadas quando foram disponibilizados, salvo se a própria oferta informar claramente outra condição.</p>
    {loading && <p role="status" aria-live="polite">Verificando sua inscrição…</p>}
    {loadError && session && <div className="error" role="alert"><p>{loadError}</p><button className="button ghost" type="button" onClick={() => { setLoading(true); void loadTermsState().finally(() => setLoading(false)); }}>Tentar novamente</button></div>}
    {error && <p className="error" role="alert">{error}</p>}
    {!loading && !loadError && vip?.membership?.status === "active" && <button className="button ghost" disabled={busy} onClick={() => void cancel()}>Cancelar inscrição no VIP</button>}
    {!loading && !loadError && vip?.membership?.status !== "active" && session && vip?.membership?.status === "invited" && <button className="button primary" disabled={busy} onClick={() => void consent()}>{busy ? "Registrando…" : "Consentir com os termos VIP"}</button>}
    {!loading && !session && <div className="vip-terms-next-step"><p>{sessionLoadError ? "Entre na sua conta para verificar o convite e continuar com os termos VIP." : "Entre na sua conta para verificar o convite e, se estiver disponível, consentir com os termos VIP."}</p><Link className="button primary" to="/entrar?next=%2Fvip%2Ftermos">Entrar na minha conta</Link></div>}
    {!loading && !loadError && session && !vip?.membership && <div className="vip-terms-next-step"><p>Para consentir, primeiro resgate seu convite ou solicite o acesso VIP pelo perfil.</p><Link className="button primary" to="/perfil">Ir ao perfil</Link></div>}
    {!loading && !loadError && session && vip?.membership?.status === "canceled" && <div className="vip-terms-next-step"><p>Sua inscrição VIP foi cancelada. Volte ao perfil para verificar se há um novo convite ou elegibilidade.</p><Link className="button primary" to="/perfil">Voltar ao perfil</Link></div>}
    <Link className="button ghost" to="/perfil">Voltar ao perfil</Link>
  </article>;
}
