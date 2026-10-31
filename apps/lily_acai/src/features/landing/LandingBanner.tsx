import type { LilyPublicConfig, CatalogProduct } from "../../api";
import { Link } from "../../router";
import type { PublicLandingPage } from "./landing-types";
import { landingActionTarget } from "./landing-data";
import { landingCopy as copy } from "./landing-copy";

function BannerImage({ src, alt, crop, className }: { src: string; alt: string; crop: { x: number; y: number; zoom: number }; className: string }) {
  return <img className={className} src={src} alt={alt} fetchPriority="high" style={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})` }} />;
}

export function LandingBanner({ landing, publicConfig, products }: { landing: PublicLandingPage; publicConfig: LilyPublicConfig | null; products: CatalogProduct[] }) {
  const action = landingActionTarget(landing.banner.action, publicConfig, products, landing.banner.productTarget?.slug);
  const mobileImage = landing.banner.sameImage ? landing.banner.desktopImage : landing.banner.mobileImage ?? landing.banner.desktopImage;
  const desktop = landing.banner.desktopImage;
  const content = desktop || mobileImage
    ? <picture className="landing-banner-art">
        {mobileImage && <BannerImage className="landing-banner-mobile" src={mobileImage.url} alt={landing.banner.altText || mobileImage.altText} crop={landing.banner.mobileCrop} />}
        {desktop && <BannerImage className="landing-banner-desktop" src={desktop.url} alt={landing.banner.altText || desktop.altText} crop={landing.banner.desktopCrop} />}
        {!desktop && mobileImage && <BannerImage className="landing-banner-desktop" src={mobileImage.url} alt={landing.banner.altText || mobileImage.altText} crop={landing.banner.desktopCrop} />}
      </picture>
    : <div className="landing-banner-fallback"><img src={`${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`} alt="" /><span><strong>{copy.fallbackBannerTitle}</strong><small>{copy.fallbackBannerText}</small></span></div>;

  if (!action) return <section className="landing-banner" aria-label="CookLily">{content}</section>;
  const anchor = <a className="landing-banner-link" href={action.href} aria-label={copy.fallbackBannerAction} {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}>{content}</a>;
  return action.external ? <section className="landing-banner">{anchor}</section> : <section className="landing-banner"><Link className="landing-banner-link" to={action.href}>{content}</Link></section>;
}
