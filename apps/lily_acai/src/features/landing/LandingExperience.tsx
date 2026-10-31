import { useEffect, useState } from "react";
import type { AuthPayload, CatalogProduct, LilyPublicConfig } from "../../api";
import { getLilyCatalog, type CatalogPayload } from "../../api";
import { Link } from "../../router";
import { trackLilyAnalytics } from "../../analytics";
import { getPublicLandingPage } from "./landing-api";
import { landingCopy as copy } from "./landing-copy";
import { LandingBanner } from "./LandingBanner";
import { LandingBrandIdentity } from "./LandingBrandIdentity";
import { LandingProductShowcase } from "./LandingProductShowcase";
import { LandingStory } from "./LandingStory";
import { LandingCommunitySidebar } from "./LandingCommunitySidebar";
import { LandingReelsSection } from "./LandingReelsSection";
import { LandingLocation } from "./LandingLocation";
import { LandingLeadCapture } from "./LandingLeadCapture";
import type { PublicLandingPage } from "./landing-types";
import "./landing.css";

export function LandingExperience({ user, publicConfig, authLoaded }: { user: AuthPayload["user"] | null; publicConfig: LilyPublicConfig | null; authLoaded: boolean }) {
  const [landing, setLanding] = useState<PublicLandingPage | null>(null);
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [loadingError, setLoadingError] = useState("");

  useEffect(() => {
    let active = true;
    void getPublicLandingPage().then((value) => { if (active) setLanding(value); })
      .catch(() => { if (active) setLoadingError(copy.error); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!landing) return;
    let active = true;
    const needsCatalog = landing.showcase.mode === "carousel" || landing.sections.reelsEnabled;
    void getLilyCatalog({ limit: needsCatalog ? 40 : 1, offset: 0 }).then((value) => { if (active) setCatalog(value); })
      .catch(() => { if (active) setCatalog(null); });
    return () => { active = false; };
  }, [landing?.showcase.mode, landing?.sections.reelsEnabled]);

  if (!landing) return <section className="landing-loading" role={loadingError ? "alert" : "status"}>{loadingError || "CookLily · carregando a página…"}</section>;
  const products: CatalogProduct[] = catalog?.products ?? [];
  const whatsapp = publicConfig?.social.links.find((link) => link.platform === "whatsapp")?.url ?? null;
  const trackingText = encodeURIComponent("Olá! Vim pelo site da CookLily e gostaria de acompanhar meu pedido.");

  return <div className="landing-page">
    <LandingBanner landing={landing} publicConfig={publicConfig} products={products} />
    <div className="landing-content">
      <LandingBrandIdentity landing={landing} user={user} config={publicConfig} />
      <LandingProductShowcase config={landing.showcase} products={products} weeklyProduct={catalog?.weeklyProduct ?? null} />
      <div className="landing-community-grid"><LandingStory /><LandingCommunitySidebar enabled={landing.sections.rankingEnabled} /></div>
      <LandingReelsSection enabled={landing.sections.reelsEnabled} title={landing.sections.reelsTitle} products={products} />
      <LandingLocation enabled={landing.sections.locationEnabled} address={landing.address} />
      {authLoaded && <LandingLeadCapture config={publicConfig} user={user} />}
      <section className="landing-next-actions"><article><span className="eyebrow">CookLily · participe</span><h2>Ajude a melhorar a experiência</h2><p>Sua opinião pode orientar novas missões e melhorias no cardápio.</p><Link className="button ghost" to="/pesquisas">Ver pesquisas</Link></article>
        <article><span className="eyebrow">Acompanhamento</span><h2>{copy.orderTrackingTitle}</h2><p>{copy.orderTrackingText}</p>{whatsapp ? <a className="button primary" href={`${whatsapp}?text=${trackingText}`} target="_blank" rel="noreferrer" onClick={() => trackLilyAnalytics("whatsapp_click", { surface: "landing" })}>{copy.orderTrackingAction}</a> : <Link className="button primary" to="/pedidos">Ver meus pedidos</Link>}</article>
      </section>
    </div>
  </div>;
}
