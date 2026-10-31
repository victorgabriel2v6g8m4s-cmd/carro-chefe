import type { CatalogProduct } from "../../api";
import { Link } from "../../router";
import { LandingReveal } from "./LandingReveal";
import { landingCopy as copy } from "./landing-copy";

function ReelThumbnail({ product }: { product: CatalogProduct }) {
  const clip = product.gallery.find((media) => media.mime.startsWith("video/"));
  const src = clip?.url ?? product.cover?.url;
  if (!src) return <div className="landing-reel-placeholder">{product.displayName}</div>;
  return clip
    ? <video src={clip.url} muted playsInline preload="none" poster={product.cover?.url ?? undefined} aria-label={product.displayName} />
    : <img src={src} alt={product.cover?.altText ?? product.displayName} loading="lazy" />;
}

export function LandingReelsSection({ enabled, title, products }: { enabled: boolean; title: string; products: CatalogProduct[] }) {
  if (!enabled) return null;
  const reels = products.filter((product) => product.status === "published" && product.isAvailable && !product.vipLocked);
  return <LandingReveal className="landing-reels-section"><header className="landing-section-heading"><div><span className="eyebrow">Reels CookLily</span><h2>{title}</h2></div><Link className="landing-text-link" to="/reels">Todos os Reels <span aria-hidden="true">→</span></Link></header>
    {reels.length === 0 ? <p className="landing-section-empty">{copy.reelsEmpty}</p> : <div className="landing-reels-rail">{reels.map((product) => <Link className="landing-reel-card" to={`/reels?produto=${encodeURIComponent(product.slug)}`} key={product.id}><ReelThumbnail product={product} /><span><strong>{product.displayName}</strong><small>Assistir Reel <span aria-hidden="true">↗</span></small></span></Link>)}</div>}
  </LandingReveal>;
}
