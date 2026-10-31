import { useState, type FormEvent } from "react";
import type { AuthPayload, LilyPublicConfig } from "../../api";
import { submitCookLilyLead } from "../../api";
import { Link } from "../../router";
import { trackLilyAnalytics } from "../../analytics";
import { attributionForApi, hasCookLilyAttribution, readCookLilyAttribution, readStoredCookLilyAttribution } from "../../tracking";
import { landingCopy as copy } from "./landing-copy";

export function LandingLeadCapture({ config, user }: { config: LilyPublicConfig | null; user: AuthPayload["user"] | null }) {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  if (user) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("marketingConsent") !== "on") {
      setState("error"); setMessage("Marque a autorização ou deixe este cadastro de lado."); return;
    }
    setState("submitting"); setMessage("");
    trackLilyAnalytics("lead_submit", { surface: "landing" });
    try {
      const current = readCookLilyAttribution(window.location.search);
      const stored = readStoredCookLilyAttribution();
      const attribution = hasCookLilyAttribution(current) ? current : stored;
      await submitCookLilyLead({
        phone: String(data.get("phone") ?? ""),
        marketingConsent: true,
        consentVersion: config.consentVersions.lilyMarketing,
        privacyPolicyVersion: config.privacyPolicyVersion,
        attribution: attributionForApi(attribution),
        website: String(data.get("website") ?? "")
      });
      form.reset(); setState("success"); setMessage(copy.leadSuccess); trackLilyAnalytics("lead_success", { surface: "landing" });
    } catch (cause) {
      setState("error"); setMessage(cause instanceof Error ? cause.message : "Não foi possível cadastrar agora."); trackLilyAnalytics("lead_error", { surface: "landing" });
    }
  }

  return <details className="landing-lead-capture"><summary>{copy.leadTitle}</summary><div><p>{copy.leadText}</p><p className="landing-login-reminder">{copy.loginPrompt} <Link to="/entrar">{copy.login}</Link> · <Link to="/cadastro">{copy.createAccount}</Link></p>
    <form onSubmit={submit}>
      <label>{copy.leadPhone}<input name="phone" inputMode="tel" autoComplete="tel" placeholder="(67) 99999-9999" required /></label>
      <label className="check lead-consent"><input name="marketingConsent" type="checkbox" /><span>{copy.leadConsent}</span></label>
      <label className="trap-field" aria-hidden="true">Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <small>O cadastro é opcional e serve somente para enviar novidades. <Link to="/privacidade">Veja como tratamos os dados.</Link></small>
      {message && <p className={state === "success" ? "success" : "error"} role="status">{message}</p>}
      <button className="button primary" disabled={state === "submitting" || !config}>{state === "submitting" ? "Enviando…" : copy.leadSubmit}</button>
    </form>
  </div></details>;
}
