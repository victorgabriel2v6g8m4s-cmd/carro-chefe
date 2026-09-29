import { useEffect, useState } from "react";
import {
  denyLilyAnalytics,
  getLilyAnalyticsConsent,
  grantLilyAnalytics,
  lilyAnalyticsEvents,
  openLilyAnalyticsPreferences,
  type LilyAnalyticsConsent
} from "../../analytics";

export function LilyAnalyticsPreferencesButton() {
  return <button className="analytics-preferences-link" type="button" onClick={openLilyAnalyticsPreferences}>
    Preferências de analytics
  </button>;
}

export function LilyAnalyticsConsentBanner() {
  const [consent, setConsent] = useState<LilyAnalyticsConsent>(() => getLilyAnalyticsConsent());
  const [open, setOpen] = useState(() => getLilyAnalyticsConsent() === "unknown");

  useEffect(() => {
    const onChange = () => {
      const next = getLilyAnalyticsConsent();
      setConsent(next);
      setOpen(next === "unknown");
    };
    const onOpen = () => setOpen(true);
    window.addEventListener(lilyAnalyticsEvents.consent, onChange);
    window.addEventListener(lilyAnalyticsEvents.open, onOpen);
    return () => {
      window.removeEventListener(lilyAnalyticsEvents.consent, onChange);
      window.removeEventListener(lilyAnalyticsEvents.open, onOpen);
    };
  }, []);

  if (!open) return null;

  return <aside className="analytics-consent" role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title">
    <div>
      <strong id="analytics-consent-title">Analytics opcional</strong>
      <p>
        Podemos registrar navegação e funil de compra com um identificador aleatório de sessão e atribuição de campanha.
        Não enviamos telefone, nome, endereço, observações ou dados do cartão. Recusar não limita a loja.
      </p>
      {consent !== "unknown" && <small>Preferência atual: {consent === "granted" ? "permitido" : "recusado"}.</small>}
    </div>
    <div className="analytics-consent-actions">
      <button className="button ghost" type="button" onClick={() => { denyLilyAnalytics(); setOpen(false); }}>
        Não permitir
      </button>
      <button className="button primary" type="button" onClick={() => { grantLilyAnalytics(); setOpen(false); }}>
        Permitir analytics
      </button>
      {consent !== "unknown" && <button className="text-button" type="button" onClick={() => setOpen(false)}>Fechar</button>}
    </div>
  </aside>;
}
