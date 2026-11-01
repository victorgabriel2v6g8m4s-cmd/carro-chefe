import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CatalogProduct } from "../../api";
import { Link } from "../../router";
import type { LilyLandingPageConfig } from "@carro-chefe/contracts";
import { landingCopy as copy } from "./landing-copy";
import { money, productBadges, productStartingPrice } from "./landing-data";

function ProductTile({ product, config, imageOnly }: { product: CatalogProduct; config: LilyLandingPageConfig["showcase"]; imageOnly: boolean }) {
  const url = `/cardapio?produto=${encodeURIComponent(product.slug)}`;
  const price = productStartingPrice(product);
  return <article className={`landing-product-tile${imageOnly ? " is-image-only" : ""}`}>
    <Link className="landing-product-image" to={url} aria-label={`Ver ${product.displayName}`}><img src={product.cover?.url ?? `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`} alt={product.cover?.altText ?? product.displayName} loading="lazy" /></Link>
    {!imageOnly && <div className="landing-product-body">
      {config.elements.badges && <div className="landing-product-badges">{productBadges(product).map((badge) => <span key={badge}>{badge}</span>)}</div>}
      {config.elements.title && <h3>{product.displayName}</h3>}
      {config.elements.description && <p>{product.descriptiveName ?? product.description ?? product.category.name}</p>}
      {config.elements.price && <p className="landing-product-price">{price === null ? copy.soldOut : <>{copy.priceFrom} <strong>{money(price)}</strong></>}</p>}
      {config.elements.action && (product.isPurchasable ? <Link className="button primary" to={url}>{copy.productAction}</Link> : <span className="landing-product-unavailable">{copy.soldOut}</span>)}
    </div>}
  </article>;
}

export function LandingProductShowcase({ config, products, weeklyProduct }: { config: LilyLandingPageConfig["showcase"]; products: CatalogProduct[]; weeklyProduct: CatalogProduct | null }) {
  const rail = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const featured = config.mode === "weekly" ? weeklyProduct ? [weeklyProduct] : [] : config.productIds.map((id) => products.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product && !product.vipLocked && product.status === "published"));
  const imageOnly = !Object.values(config.elements).some(Boolean);
  function move(direction: number) { const node = rail.current; if (!node) return; const limit = node.scrollWidth - node.clientWidth; const first = node.firstElementChild as HTMLElement; const step = node.children.length > 1 ? (node.children[1] as HTMLElement).offsetLeft - first.offsetLeft : first.offsetWidth; const target = node.scrollLeft + step * direction; node.scrollTo({ left: target < 0 ? limit : target >= limit ? 0 : target, behavior: "smooth" }); setCycle((value) => value + 1); }
  useEffect(() => { if (config.mode !== "carousel" || paused || featured.length < 2) return; const timer = window.setInterval(() => move(1), config.intervalSeconds * 1000); return () => window.clearInterval(timer); }, [config.mode, config.intervalSeconds, featured.length, paused]);
  if (config.mode === "carousel" && featured.length === 0) return null;
  const title = config.mode === "weekly" ? copy.weeklyTitle : copy.carouselTitle;
  if (config.mode === "weekly" && !featured.length) return <section className="landing-showcase landing-showcase-empty"><div className="landing-section-heading"><div><span className="eyebrow">CookLily · cardápio</span><h2>{title}</h2></div></div><p className="landing-section-empty">{copy.weeklyEmpty}</p></section>;
  return <section className={`landing-showcase landing-showcase-${config.mode}`} style={{ "--landing-desktop-columns": config.desktopColumns, "--landing-mobile-columns": config.mobileColumns } as CSSProperties} aria-labelledby="landing-showcase-title" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
    <div className="landing-section-heading"><div><span className="eyebrow">CookLily · cardápio</span><h2 id="landing-showcase-title">{title}</h2></div>{config.mode === "carousel" && featured.length > 1 && <div className="combo-carousel-controls"><button type="button" aria-label={copy.previous} onClick={() => move(-1)}>‹</button><button type="button" aria-label={copy.next} onClick={() => move(1)}>›</button></div>}</div>
    <div className="landing-product-rail" ref={rail} aria-label={title}>{featured.map((product) => <ProductTile key={product.id} product={product} config={config} imageOnly={imageOnly} />)}</div>
    {config.mode === "carousel" && featured.length > 1 && <div className="combo-carousel-timer" aria-hidden="true"><span key={cycle} style={{ animationDuration: `${config.intervalSeconds}s`, animationPlayState: paused ? "paused" : "running" }} /></div>}
  </section>;
}
