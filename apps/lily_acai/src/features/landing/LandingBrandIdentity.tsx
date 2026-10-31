import type { AuthPayload, LilyPublicConfig } from "../../api";
import { Link } from "../../router";
import { WhatsAppText } from "../rich-text/WhatsAppText";
import type { PublicLandingPage } from "./landing-types";
import { landingCopy as copy } from "./landing-copy";

export function LandingBrandIdentity({ landing, user, config }: { landing: PublicLandingPage; user: AuthPayload["user"] | null; config: LilyPublicConfig | null }) {
  const whatsapp = config?.social.links.find((link) => link.platform === "whatsapp")?.url;
  return <section className="landing-brand-identity" aria-labelledby="landing-brand-title">
    <span className="eyebrow">{copy.eyebrow}</span>
    <h1 id="landing-brand-title">{copy.brandName}</h1>
    <p className="landing-brand-tagline">{landing.brand.tagline}</p>
    <div className="landing-rich-text"><WhatsAppText text={landing.brand.description} /></div>
    <nav className="landing-brand-actions" aria-label="Acesso CookLily">
      {user ? <><p>{copy.memberGreeting(user.displayName?.trim() || undefined)}</p><Link className="button primary" to="/dashboard">{copy.memberDashboard}</Link></> : <div className="landing-account-actions"><span>{copy.loginPrompt}</span><Link className="button ghost" to="/entrar">{copy.login}</Link><Link className="button primary" to="/cadastro">{copy.createAccount}</Link></div>}
      <Link className="button ghost" to="/cardapio">{copy.menu}</Link>
      {whatsapp && !user && <a className="landing-contact-link" href={whatsapp} target="_blank" rel="noreferrer">Fale com a CookLily</a>}
    </nav>
  </section>;
}
