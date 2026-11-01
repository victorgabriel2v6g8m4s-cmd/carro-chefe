import type { AuthPayload } from "../../api";
import { Link } from "../../router";
import { WhatsAppText } from "../rich-text/WhatsAppText";
import type { PublicLandingPage } from "./landing-types";
import { landingCopy as copy } from "./landing-copy";

export function LandingBrandIdentity({ landing, user }: { landing: PublicLandingPage; user: AuthPayload["user"] | null }) {
  return <section className="landing-brand-identity" aria-labelledby="landing-brand-title">
    <span className="eyebrow">{copy.eyebrow}</span>
    <h1 id="landing-brand-title" className="landing-brand-wordmark" aria-label={copy.brandName}>
      <span className="landing-brand-wordmark-cook" aria-hidden="true">Cook</span>
      <span className="landing-brand-wordmark-lily" aria-hidden="true">Lily</span>
    </h1>
    <p className="landing-brand-tagline">{landing.brand.tagline}</p>
    <div className="landing-rich-text"><WhatsAppText text={landing.brand.description} /></div>
    <nav className="landing-brand-actions" aria-label="CookLily">
      {user && <><p>{copy.memberGreeting(user.displayName?.trim() || undefined)}</p><Link className="button primary" to="/dashboard">{copy.memberDashboard}</Link></>}
      <Link className="button primary combo-slide-cta landing-menu-cta" to="/cardapio">{copy.menu}</Link>
    </nav>
  </section>;
}
