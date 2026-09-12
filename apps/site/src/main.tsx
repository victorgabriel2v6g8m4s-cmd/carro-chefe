import { FormEvent, StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";

const whatsapp = "https://wa.me/5567992046721";
const instagram = "https://instagram.com/carrochefe_cg";
const analyticsConsentKey = "carrochefe.analytics-consent.v1";
const attributionKey = "carrochefe.prelaunch.attribution.v1";
const sessionKey = "carrochefe.prelaunch.session.v1";
const trackedOnceKey = "carrochefe.prelaunch.tracked.v1";
const consentVersion = "prelaunch-whatsapp-v1";
const privacyPolicyVersion = "prelaunch-privacy-v1";

type AnalyticsConsent = "granted" | "denied" | "unknown";
type SignupState = "idle" | "loading" | "success" | "duplicate" | "error";
type Attribution = {
  ccQr: string | null;
  ccCampaign: string | null;
  ccVariant: string | null;
  firstSeenAt: string;
};
type EventName =
  | "qr_scan"
  | "landing_view"
  | "signup_cta_click"
  | "form_start"
  | "signup_submit"
  | "signup_success"
  | "signup_duplicate"
  | "signup_error"
  | "reward_view"
  | "instagram_click"
  | "whatsapp_click"
  | "privacy_open"
  | "consent_analytics_granted";
type EventMetadata = {
  experiment?: string | null;
  ctaVariant?: string | null;
  formPosition?: string | null;
  hasProductMedia?: boolean | null;
  section?: "hero" | "reward" | "product_teaser" | "brand_story" | "social" | null;
};
type QueuedEvent = { event: EventName; metadata: EventMetadata };

const pendingEvents: QueuedEvent[] = [];
let vendorsLoaded = false;

function sanitizeTrackingValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 120);
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : null;
}

function getAttribution(): Attribution {
  const stored = sessionStorage.getItem(attributionKey);
  if (stored) {
    try { return JSON.parse(stored) as Attribution; } catch { sessionStorage.removeItem(attributionKey); }
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    ccQr: sanitizeTrackingValue(params.get("cc_qr")),
    ccCampaign: sanitizeTrackingValue(params.get("cc_campaign")),
    ccVariant: sanitizeTrackingValue(params.get("cc_variant")),
    firstSeenAt: new Date().toISOString()
  };
  sessionStorage.setItem(attributionKey, JSON.stringify(attribution));
  return attribution;
}

function getSessionId() {
  const stored = sessionStorage.getItem(sessionKey);
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(sessionKey, id);
  return id;
}

function getAnalyticsConsent(): AnalyticsConsent {
  const stored = localStorage.getItem(analyticsConsentKey);
  return stored === "granted" || stored === "denied" ? stored : "unknown";
}

function safeMetadata(metadata: EventMetadata = {}): EventMetadata {
  return {
    experiment: metadata.experiment ?? null,
    ctaVariant: metadata.ctaVariant ?? null,
    formPosition: metadata.formPosition ?? null,
    hasProductMedia: metadata.hasProductMedia ?? false,
    section: metadata.section ?? null
  };
}

async function sendFirstPartyEvent(event: EventName, metadata: EventMetadata = {}) {
  const attribution = getAttribution();
  const body = {
    sessionId: getSessionId(),
    event,
    path: window.location.pathname,
    attribution: {
      ccQr: attribution.ccQr,
      ccCampaign: attribution.ccCampaign,
      ccVariant: attribution.ccVariant
    },
    metadata: safeMetadata(metadata)
  };

  try {
    await fetch("/api/v1/public/prelaunch/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify(body)
    });
  } catch {
    // Analytics nunca pode interromper o fluxo de cadastro.
  }
}

function sendVendorEvent(event: EventName, metadata: EventMetadata = {}) {
  const gtag = (window as any).gtag as undefined | ((...args: unknown[]) => void);
  if (gtag) gtag("event", event, safeMetadata(metadata));
  const clarity = (window as any).clarity as undefined | ((...args: unknown[]) => void);
  if (clarity) clarity("event", event);
}

function track(event: EventName, metadata: EventMetadata = {}) {
  const consent = getAnalyticsConsent();
  if (consent === "denied") return;
  if (consent === "unknown") {
    pendingEvents.push({ event, metadata });
    return;
  }
  void sendFirstPartyEvent(event, metadata);
  sendVendorEvent(event, metadata);
}

function trackOnce(event: EventName, metadata: EventMetadata = {}) {
  const stored = sessionStorage.getItem(trackedOnceKey);
  const events = stored ? new Set(stored.split(",")) : new Set<string>();
  if (events.has(event)) return;
  events.add(event);
  sessionStorage.setItem(trackedOnceKey, [...events].join(","));
  track(event, metadata);
}

function loadAnalyticsVendors() {
  if (vendorsLoaded) return;
  vendorsLoaded = true;

  const gaId = import.meta.env.VITE_GA4_ID?.trim();
  if (gaId) {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = function (...args: unknown[]) { (window as any).dataLayer.push(args); };
    (window as any).gtag("js", new Date());
    (window as any).gtag("config", gaId, { send_page_view: false, anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
  }

  const clarityId = import.meta.env.VITE_CLARITY_ID?.trim();
  if (clarityId) {
    (window as any).clarity = (window as any).clarity || function (...args: unknown[]) {
      ((window as any).clarity.q = (window as any).clarity.q || []).push(args);
    };
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;
    document.head.appendChild(script);
  }
}

function grantAnalytics() {
  localStorage.setItem(analyticsConsentKey, "granted");
  loadAnalyticsVendors();
  void sendFirstPartyEvent("consent_analytics_granted");
  sendVendorEvent("consent_analytics_granted");
  for (const queued of pendingEvents.splice(0)) {
    void sendFirstPartyEvent(queued.event, queued.metadata);
    sendVendorEvent(queued.event, queued.metadata);
  }
}

function denyAnalytics() {
  localStorage.setItem(analyticsConsentKey, "denied");
  pendingEvents.splice(0);
}

function normalizePhoneForValidation(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
}

function isValidPhone(value: string) {
  const national = normalizePhoneForValidation(value);
  if (national.length !== 10 && national.length !== 11) return false;
  if (/^(\d)\1+$/.test(national)) return false;
  if (national.startsWith("0") || national.slice(2).startsWith("0")) return false;
  return national.length !== 11 || national[2] === "9";
}

function formatPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function AnalyticsChoice({ onChange }: { onChange: (value: AnalyticsConsent) => void }) {
  const [consent, setConsent] = useState<AnalyticsConsent>(() => getAnalyticsConsent());
  if (consent !== "unknown") return null;

  const choose = (value: "granted" | "denied") => {
    if (value === "granted") grantAnalytics(); else denyAnalytics();
    setConsent(value);
    onChange(value);
  };

  return <aside className="analytics-choice" aria-label="Preferência de analytics">
    <div><strong>Podemos usar analytics para entender como esta página é usada?</strong><p>Isso nos ajuda a melhorar a experiência. O cadastro funciona mesmo se você recusar.</p></div>
    <div className="analytics-actions"><button type="button" onClick={() => choose("granted")}>Aceitar analytics</button><button type="button" onClick={() => choose("denied")}>Recusar</button></div>
  </aside>;
}

function SignupForm() {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SignupState>("idle");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const started = useRef(false);
  const attribution = useMemo(() => getAttribution(), []);
  const phoneInvalid = phoneTouched && phone.length > 0 && !isValidPhone(phone);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackOnce("form_start", { formPosition: "hero_inline", hasProductMedia: false });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "loading") return;
    setPhoneTouched(true);
    setConsentError(!consent);
    if (!isValidPhone(phone) || !consent) return;

    setState("loading");
    setServerMessage("");
    track("signup_submit", { ctaVariant: "prelaunch_primary_v1", formPosition: "hero_inline", hasProductMedia: false });

    const data = new FormData(event.currentTarget as HTMLFormElement);
    try {
      const response = await fetch("/api/v1/public/prelaunch/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone,
          firstName: null,
          marketingConsent: true,
          consentVersion,
          privacyPolicyVersion,
          firstSeenAt: attribution.firstSeenAt,
          attribution: {
            ccQr: attribution.ccQr,
            ccCampaign: attribution.ccCampaign,
            ccVariant: attribution.ccVariant
          },
          website: String(data.get("website") ?? "")
        })
      });
      const payload = await response.json().catch(() => ({})) as { status?: string; error?: string };

      if (response.ok && payload.status === "created") {
        setState("success");
        track("signup_success", { ctaVariant: "prelaunch_primary_v1", formPosition: "hero_inline", hasProductMedia: false });
        track("reward_view", { section: "reward", hasProductMedia: false });
        return;
      }
      if (response.ok && payload.status === "duplicate") {
        setState("duplicate");
        track("signup_duplicate", { formPosition: "hero_inline", hasProductMedia: false });
        return;
      }
      if (response.status === 400) {
        setState("idle");
        setPhoneTouched(true);
        setServerMessage(payload.error ?? "Confira o número informado e tente novamente.");
        track("signup_error", { formPosition: "hero_inline", hasProductMedia: false });
        return;
      }
      throw new Error("signup_failed");
    } catch {
      setState("error");
      track("signup_error", { formPosition: "hero_inline", hasProductMedia: false });
    }
  };

  if (state === "success" || state === "duplicate") {
    const duplicate = state === "duplicate";
    return <div className="signup-result" role="status" aria-live="polite">
      <span className="result-mark" aria-hidden="true">✓</span>
      <h2>{duplicate ? "Você já está na Lista dos Primeiros." : "Você está dentro."}</h2>
      <p>{duplicate ? "Esse WhatsApp já está confirmado. Quando houver novidade da inauguração, você continua dentro." : "Seu lugar na Lista dos Primeiros está confirmado."}</p>
      {!duplicate && <ol className="progress-list"><li><strong>Cadastro confirmado</strong><span>✓</span></li><li><strong>A abertura será anunciada pelo WhatsApp</strong></li><li><strong>Seu benefício chegará próximo à inauguração</strong></li></ol>}
      <div className="post-signup-actions"><a href={instagram} target="_blank" rel="noreferrer" onClick={() => track("instagram_click", { section: "social" })}>Acompanhar no Instagram</a></div>
    </div>;
  }

  return <form className="signup-form" onSubmit={submit} noValidate data-clarity-mask="true">
    <div className="form-heading"><span>Lista dos Primeiros</span><h2>Saiba antes. Chegue primeiro.</h2><p>Novidades da inauguração e promoções pelo WhatsApp. Saia quando quiser.</p></div>
    <div className="field-group">
      <label htmlFor="whatsapp">Seu WhatsApp</label>
      <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(67) 99204-6721" value={phone} aria-invalid={phoneInvalid || Boolean(serverMessage)} aria-describedby="phone-help phone-error" onFocus={markStarted} onBlur={() => setPhoneTouched(true)} onChange={(event) => { const next = formatPhone(event.target.value); setPhone(next); if (phoneTouched && isValidPhone(next)) setServerMessage(""); }} data-clarity-mask="true" />
      <small id="phone-help">DDD + telefone. Aceitamos número com ou sem formatação.</small>
      {(phoneInvalid || serverMessage) && <p id="phone-error" className="field-error" role="alert"><strong>Confira o número.</strong> {serverMessage || "Digite DDD + telefone, por exemplo (67) 99204-6721."}</p>}
    </div>
    <label className={`consent-row${consentError ? " has-error" : ""}`}>
      <input type="checkbox" checked={consent} onFocus={markStarted} onChange={(event) => { setConsent(event.target.checked); if (event.target.checked) setConsentError(false); }} />
      <span>Quero receber pelo WhatsApp novidades da inauguração e promoções do Carro Chefe. Posso cancelar quando quiser.</span>
    </label>
    {consentError && <p className="field-error consent-message" role="alert">Marque esta opção para confirmar que deseja receber as mensagens.</p>}
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Site</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    {state === "error" && <div className="network-error" role="alert"><strong>Não conseguimos confirmar agora.</strong><span>Seu cadastro ainda não foi concluído. Confira a conexão e tente novamente.</span></div>}
    <button className="signup-button" type="submit" disabled={state === "loading"} onClick={() => track("signup_cta_click", { ctaVariant: "prelaunch_primary_v1", formPosition: "hero_inline", hasProductMedia: false })}>{state === "loading" ? "Confirmando seu lugar…" : state === "error" ? "Tentar novamente" : "Entrar na Lista dos Primeiros"}</button>
    <p className="privacy-note">Ao se cadastrar, seus dados são usados para este contato conforme nosso <Link to="/privacidade" onClick={() => track("privacy_open")}>aviso de privacidade</Link>.</p>
  </form>;
}

function BrandHeader() {
  return <header className="prelaunch-header"><Link className="brand" to="/" aria-label="Carro Chefe — início"><img src="/assets/brand/logo-base.png" alt="" /><span><strong>Carro Chefe</strong><small>Sabor que lidera</small></span></Link><span className="header-status">Pré-inauguração</span></header>;
}

function PrelaunchLanding() {
  const [, setAnalyticsConsent] = useState<AnalyticsConsent>(() => getAnalyticsConsent());

  useEffect(() => {
    const consent = getAnalyticsConsent();
    if (consent === "granted") loadAnalyticsVendors();
    const attribution = getAttribution();
    if (attribution.ccQr) trackOnce("qr_scan", { hasProductMedia: false });
    trackOnce("landing_view", { hasProductMedia: false });
  }, []);

  return <div className="prelaunch-shell"><a className="skip" href="#cadastro">Pular para o cadastro</a><BrandHeader />
    <main>
      <section className="prelaunch-hero">
        <div className="hero-message"><span className="eyebrow">Pré-inauguração · Campo Grande</span><h1>O Carro Chefe<br /><em>está chegando.</em></h1><p className="hero-lead">Brasa, espeto e baguete em uma experiência feita para chamar atenção antes mesmo da primeira mordida.</p><p className="hero-promise">Entre para a <strong>Lista dos Primeiros</strong> e receba a abertura em primeira mão e um benefício especial de inauguração.</p><a className="hero-anchor" href="#cadastro" onClick={() => track("signup_cta_click", { ctaVariant: "prelaunch_anchor_v1", formPosition: "hero_inline", hasProductMedia: false })}>Entrar na Lista dos Primeiros <span aria-hidden="true">↓</span></a></div>
        <div className="signup-panel" id="cadastro"><SignupForm /></div>
      </section>
      <section className="expectation-strip" aria-label="O que você recebe"><div><span>01</span><strong>Abertura em primeira mão</strong><p>Você recebe o aviso pelo WhatsApp quando a inauguração estiver confirmada.</p></div><div><span>02</span><strong>Benefício de inauguração</strong><p>A Lista dos Primeiros receberá a condição especial quando a regra estiver definida e pronta para ser honrada.</p></div><div><span>03</span><strong>Bastidores da marca</strong><p>Acompanhe a preparação do Carro Chefe sem promessas, datas ou contagens artificiais.</p></div></section>
      <section className="brand-story"><div><span className="eyebrow">Sabor que lidera</span><h2>Brasa no centro.<br />Sem atalhos na promessa.</h2></div><p>O pré-lançamento existe para avisar quem quer chegar primeiro — sem pedido antecipado, sem data inventada e sem escassez artificial. Quando estiver pronto para abrir, você vai saber.</p></section>
      <section className="social-section"><span className="eyebrow">Enquanto a brasa acende</span><h2>Acompanhe os bastidores.</h2><p>O cadastro é a forma principal de receber a abertura. Se quiser ver o processo de perto, estamos também nas redes.</p><div><a href={instagram} target="_blank" rel="noreferrer" onClick={() => track("instagram_click", { section: "social" })}>@carrochefe_cg</a><a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { section: "social" })}>WhatsApp oficial</a></div></section>
    </main>
    <footer className="prelaunch-footer"><div className="footer-brand"><img src="/assets/brand/logo-base.png" alt="" /><span><strong>Carro Chefe</strong><small>Sabor que lidera</small></span></div><nav aria-label="Rodapé"><Link to="/privacidade" onClick={() => track("privacy_open")}>Privacidade</Link><a href={instagram} target="_blank" rel="noreferrer" onClick={() => track("instagram_click", { section: "social" })}>Instagram</a><a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { section: "social" })}>WhatsApp</a></nav><small>© {new Date().getFullYear()} Carro Chefe</small></footer>
    <AnalyticsChoice onChange={setAnalyticsConsent} />
  </div>;
}

function Privacy() {
  useEffect(() => { trackOnce("privacy_open"); }, []);
  return <div className="legal-shell"><BrandHeader /><main className="legal-page"><span className="eyebrow">Versão operacional · pré-lançamento</span><h1>Aviso de Privacidade</h1><p className="legal-intro">Este aviso descreve a coleta usada na Lista dos Primeiros. O texto jurídico definitivo ainda passará por revisão antes de substituir esta versão operacional.</p>
    <section><h2>O que coletamos</h2><p>Para o cadastro, coletamos o número de WhatsApp informado, o aceite de comunicação, a versão deste aviso e, quando a visita veio de uma peça identificada, os códigos de campanha e QR. O primeiro nome não é obrigatório nesta etapa.</p></section>
    <section><h2>Para que usamos</h2><p>O WhatsApp é usado para comunicar novidades da inauguração e promoções do Carro Chefe conforme o consentimento dado. Os códigos de campanha permitem entender qual peça física originou o cadastro.</p></section>
    <section><h2>Analytics opcional</h2><p>Analytics não essencial só é ativado após sua escolha. Se você recusar, o cadastro continua funcionando. Eventos analíticos não recebem nome nem telefone; ferramentas externas configuradas para esta página também não devem receber esses dados.</p></section>
    <section><h2>Cancelamento e direitos</h2><p>Você pode pedir para deixar de receber mensagens pelo canal oficial de WhatsApp. Solicitações sobre acesso, correção ou eliminação de dados serão tratadas pelos canais oficiais do Carro Chefe, respeitando as obrigações legais aplicáveis.</p></section>
    <section><h2>Retenção e fornecedores</h2><p>Os dados serão mantidos somente pelo período necessário às finalidades informadas e às obrigações aplicáveis. Serviços de analytics, quando configurados e aceitos, podem atuar como fornecedores técnicos. Prazos definitivos, identificação jurídica completa do controlador e revisão de bases legais serão consolidados na versão jurídica final.</p></section>
    <Link className="back-link" to="/">← Voltar para o pré-lançamento</Link></main></div>;
}

function App() {
  return <BrowserRouter><Routes><Route path="/" element={<PrelaunchLanding />} /><Route path="/welcome" element={<Navigate to="/" replace />} /><Route path="/cardapio" element={<Navigate to="/" replace />} /><Route path="/privacidade" element={<Privacy />} /><Route path="/termos" element={<Navigate to="/privacidade" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
