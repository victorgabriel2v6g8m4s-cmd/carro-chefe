import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAttribution, isBannerVipCampaign } from "./campaign";
import { campaignContent } from "./campaign-content";
import { track, trackOnce } from "./analytics";
import { formatPhone, isValidPhone } from "./signup-phone";
const instagram = "https://instagram.com/carrochefe_cg";
const consentVersion = "prelaunch-whatsapp-v1";
const privacyPolicyVersion = "prelaunch-privacy-v1";
type SignupState = "idle" | "loading" | "success" | "duplicate" | "error";

export function SignupForm() {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SignupState>("idle");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const started = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const { search } = useLocation();
  const attribution = useMemo(() => getAttribution(), [search]);
  const bannerVip = isBannerVipCampaign(attribution);
  const copy = bannerVip ? campaignContent.vip : campaignContent.direct;
  const phoneInvalid = phoneTouched && !isValidPhone(phone);

  useEffect(() => {
    if (state === "success" || state === "duplicate") resultRef.current?.focus();
  }, [state]);

  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    trackOnce("form_start", { formPosition: "signup_section", hasProductMedia: true });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading") return;
    setPhoneTouched(true);
    setConsentError(!consent);
    if (!isValidPhone(phone)) { phoneRef.current?.focus(); return; }
    if (!consent) { consentRef.current?.focus(); return; }

    setState("loading");
    setServerMessage("");
    track("signup_submit", { ctaVariant: "product_signup_v2", formPosition: "signup_section", hasProductMedia: true });

    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/public/prelaunch/signup", {
        method: "POST",
        signal: AbortSignal.timeout(12000),
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
        track("signup_success", { ctaVariant: "product_signup_v2", formPosition: "signup_section", hasProductMedia: true });
        track("reward_view", { section: "reward", hasProductMedia: true });
        return;
      }
      if (response.ok && payload.status === "duplicate") {
        setState("duplicate");
        track("signup_duplicate", { formPosition: "signup_section", hasProductMedia: true });
        return;
      }
      if (response.status === 400) {
        setState("idle");
        setPhoneTouched(true);
        setServerMessage(payload.error ?? "Confira o número informado e tente novamente.");
        track("signup_error", { formPosition: "signup_section", hasProductMedia: true });
        return;
      }
      if (response.status === 429) setServerMessage("Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.");
      throw new Error("signup_failed");
    } catch {
      setState("error");
      track("signup_error", { formPosition: "signup_section", hasProductMedia: true });
    }
  };

  if (state === "success" || state === "duplicate") {
    const duplicate = state === "duplicate";
    return <div className="signup-result" ref={resultRef} tabIndex={-1} role="status" aria-live="polite">
      <span className="result-mark" aria-hidden="true">✓</span>
      <h2>{duplicate ? "Você já está na lista!" : copy.successTitle}</h2>
      <p>{duplicate ? "Este número já está cadastrado na Lista dos Primeiros. Aguarde as novidades da inauguração pelo WhatsApp." : bannerVip ? "Recebemos seu cadastro pelo banner. Você terá acesso à cupons e promoções exclusivas." : "Recebemos seu cadastro na Lista dos Primeiros. Vamos avisar sobre a inauguração pelo WhatsApp."}</p>
      {!duplicate && <ol className="progress-list"><li><strong>Cadastro confirmado</strong><span>✓</span></li><li><strong>A abertura será anunciada pelo WhatsApp</strong></li><li><strong>{bannerVip ? "acesso à cupons e promoções exclusivas" : "As novidades chegam pelo WhatsApp"}</strong></li></ol>}
      <p className="result-expectation">Não precisa fazer mais nada agora. Seguir no Instagram é opcional.</p>
      <div className="post-signup-actions"><a href={instagram} target="_blank" rel="noreferrer" onClick={() => track("instagram_click", { section: "social" })}>Ver os bastidores no Instagram ↗</a></div>
    </div>;
  }

  return <form className="signup-form" onSubmit={submit} noValidate data-clarity-mask="true" aria-label="Entrar na Lista dos Primeiros" aria-busy={state === "loading"}>
    <div className="form-heading"><span>Lista dos Primeiros</span><h2>{copy.formTitle}</h2><p>{bannerVip ? "Entre na lista e tenha acesso à cupons e promoções exclusivas. Os detalhes chegam pelo WhatsApp." : "Receba novidades da inauguração e promoções pelo WhatsApp."}</p></div>
    <div className="field-group">
      <label htmlFor="whatsapp">Seu WhatsApp</label>
      <input ref={phoneRef} id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="Seu número com DDD" value={phone} aria-invalid={phoneInvalid} aria-describedby={`phone-help${phoneInvalid ? " phone-error" : ""}`} onFocus={markStarted} onBlur={() => setPhoneTouched(true)} onChange={(event) => { const next = formatPhone(event.target.value); setPhone(next); setServerMessage(""); }} data-clarity-mask="true" />
      <small id="phone-help">Só precisamos do seu número com DDD.</small>
      {phoneInvalid && <p id="phone-error" className="field-error" role="alert">Confira o número: digite o DDD e seu telefone completo.</p>}
      {serverMessage && state !== "error" && <p className="field-error" role="alert">{serverMessage}</p>}
    </div>
    <label className={`consent-row${consentError ? " has-error" : ""}`}>
      <input ref={consentRef} type="checkbox" checked={consent} aria-invalid={consentError} aria-describedby={consentError ? "consent-error" : undefined} onFocus={markStarted} onChange={(event) => { setConsent(event.target.checked); if (event.target.checked) setConsentError(false); }} />
      <span>Quero receber pelo WhatsApp novidades da inauguração, promoções, cupons e outros benefícios do Carro Chefe. Posso cancelar quando quiser.</span>
    </label>
    {consentError && <p id="consent-error" className="field-error consent-message" role="alert">Marque esta opção para confirmar que deseja receber as mensagens.</p>}
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Site</label><input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
    {state === "error" && <div className="network-error" role="alert"><strong>Não conseguimos confirmar agora.</strong><span>{serverMessage || "Confira a conexão e tente novamente. Se o cadastro já tiver sido recebido, seu número será reconhecido."}</span></div>}
    <button className="signup-button" type="submit" disabled={state === "loading"} onClick={() => track("signup_cta_click", { ctaVariant: "product_signup_v2", formPosition: "signup_section", hasProductMedia: true })}>{state === "loading" ? "Confirmando seu lugar…" : state === "error" ? "Tentar novamente" : copy.cta}</button>
    <p className="privacy-note">Ao se cadastrar, seus dados são usados para este contato conforme nosso <Link to={{ pathname: "/privacidade", search }} target="_blank" rel="noreferrer" onClick={() => track("privacy_open")}>aviso de privacidade (nova aba)</Link>.</p>
  </form>;
}
