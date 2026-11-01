import { useEffect, useRef, useState, type CSSProperties, type UIEvent } from "react";
import type { CatalogProduct } from "../../api";
import { Link } from "../../router";
import type { LilyLandingPageConfig } from "@carro-chefe/contracts";
import { landingCopy as copy } from "./landing-copy";
import { money, productBadges, productStartingPrice } from "./landing-data";

function ProductTile({ product, config, imageOnly, active, carousel }: { product: CatalogProduct; config: LilyLandingPageConfig["showcase"]; imageOnly: boolean; active?: boolean; carousel?: boolean }) {
  const url = `/cardapio?produto=${encodeURIComponent(product.slug)}`;
  const price = productStartingPrice(product);
  if (carousel) return <article className={`combo-carousel-slide landing-product-slide${active ? " is-active" : ""}${imageOnly ? " is-image-only" : ""}`} style={imageOnly ? { display: "block", position: "relative", minHeight: "clamp(220px,35vw,340px)" } : undefined} aria-current={active ? "true" : undefined}>
    <div className="combo-slide-image" style={imageOnly ? { position: "absolute", inset: 0, minHeight: 0 } : undefined}><Link to={url} aria-label={`Ver ${product.displayName}`} style={{ display: "block", width: "100%", height: "100%" }}><img src={product.cover?.url ?? `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`} alt={product.cover?.altText ?? product.displayName} loading="lazy" draggable={false} /></Link></div>
    {!imageOnly && <div className="combo-slide-copy landing-product-slide-copy">
      {config.elements.badges && <div className="landing-product-badges">{productBadges(product).map((badge) => <span key={badge}>{badge}</span>)}</div>}
      {config.elements.title && <h3>{product.displayName}</h3>}
      {config.elements.description && <p>{product.descriptiveName ?? product.description ?? product.category.name}</p>}
      {config.elements.price && <p className="combo-slide-price landing-product-price">{price === null ? copy.soldOut : <strong>{copy.priceFrom} {money(price)}</strong>}</p>}
      {config.elements.action && (product.isPurchasable ? <Link className="button primary combo-slide-cta" to={url}>{copy.productAction}</Link> : <span className="landing-product-unavailable">{copy.soldOut}</span>)}
    </div>}
  </article>;
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
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const featured = config.mode === "weekly" ? weeklyProduct ? [weeklyProduct] : [] : config.productIds.map((id) => products.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product && !product.vipLocked && product.status === "published"));
  const imageOnly = !Object.values(config.elements).some(Boolean);
  function moveTo(nextIndex: number, behavior: ScrollBehavior = "smooth") {
    if (featured.length < 2) return;
    const normalized = (nextIndex + featured.length) % featured.length;
    const viewport = rail.current;
    const slide = slideRefs.current[normalized];
    setIndex(normalized);
    if (viewport && slide) viewport.scrollTo({ left: slide.offsetLeft - Math.max(0, (viewport.clientWidth - slide.clientWidth) / 2), behavior });
  }
  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;
    const center = viewport.scrollLeft + viewport.clientWidth / 2;
    let closest = index;
    let distance = Number.POSITIVE_INFINITY;
    slideRefs.current.forEach((slide, slideIndex) => {
      if (!slide) return;
      const nextDistance = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
      if (nextDistance < distance) { distance = nextDistance; closest = slideIndex; }
    });
    if (closest !== index) setIndex(closest);
  }
  useEffect(() => {
    if (config.mode !== "carousel" || paused || featured.length < 2) return;
    const timer = window.setTimeout(() => moveTo(index + 1), config.intervalSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [config.mode, config.intervalSeconds, featured.length, index, paused]);
  useEffect(() => { setIndex(0); rail.current?.scrollTo({ left: 0, behavior: "auto" }); }, [config.mode, featured.map((product) => product.id).join("|")]);
  if (config.mode === "carousel" && featured.length === 0) return null;
  const title = config.mode === "weekly" ? copy.weeklyTitle : copy.carouselTitle;
  if (config.mode === "weekly" && !featured.length) return <section className="landing-showcase landing-showcase-empty"><div className="landing-section-heading"><div><span className="eyebrow">CookLily · cardápio</span><h2>{title}</h2></div></div><p className="landing-section-empty">{copy.weeklyEmpty}</p></section>;
  return <section className={`landing-showcase landing-showcase-${config.mode}${config.mode === "carousel" ? " combo-carousel landing-product-carousel" : ""}`} style={{ "--landing-desktop-columns": config.desktopColumns, "--landing-mobile-columns": config.mobileColumns } as CSSProperties} aria-labelledby="landing-showcase-title" aria-roledescription={config.mode === "carousel" ? "carrossel" : undefined} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerCancel={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
    <div className="landing-section-heading combo-carousel-top"><div><span className="eyebrow">CookLily · cardápio</span><h2 id="landing-showcase-title">{title}</h2></div>{config.mode === "carousel" && featured.length > 1 && <div className="combo-carousel-controls"><button type="button" aria-label={copy.previous} onClick={() => moveTo(index - 1)}>←</button><span aria-live="polite">{index + 1}/{featured.length}</span><button type="button" aria-label={copy.next} onClick={() => moveTo(index + 1)}>→</button></div>}</div>
    {config.mode === "carousel" ? <div className="combo-carousel-viewport" ref={rail} aria-label={title} onScroll={handleScroll}><div className="combo-carousel-track">{featured.map((product, slideIndex) => <div className="landing-product-slide-wrap" key={product.id} ref={(node) => { slideRefs.current[slideIndex] = node; }}><ProductTile product={product} config={config} imageOnly={imageOnly} active={slideIndex === index} carousel /></div>)}</div></div> : <div className="landing-product-rail" ref={rail} aria-label={title}>{featured.map((product) => <ProductTile key={product.id} product={product} config={config} imageOnly={imageOnly} />)}</div>}
    {config.mode === "carousel" && featured.length > 1 && <div className="combo-carousel-timer" aria-hidden="true"><span key={index} style={{ animationDuration: `${config.intervalSeconds}s`, animationPlayState: paused ? "paused" : "running" }} /></div>}
  </section>;
}
