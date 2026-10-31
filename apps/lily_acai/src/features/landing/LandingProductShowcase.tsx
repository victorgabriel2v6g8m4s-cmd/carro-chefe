import { useRef, type CSSProperties } from "react";
import type { CatalogProduct } from "../../api";
import { Link } from "../../router";
import type { LilyLandingPageConfig } from "@carro-chefe/contracts";
import { landingCopy as copy } from "./landing-copy";
import { money, productBadges, productStartingPrice } from "./landing-data";

function ProductTile({ product, elements }: { product: CatalogProduct; elements: LilyLandingPageConfig["showcase"]["elements"] }) {
  const url = `/cardapio?produto=${encodeURIComponent(product.slug)}`;
  const price = productStartingPrice(product);
  return <article className="landing-product-tile">
    <Link className="landing-product-image" to={url} aria-label={`Ver ${product.displayName}`}><img src={product.cover?.url ?? `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`} alt={product.cover?.altText ?? product.displayName} loading="lazy" /></Link>
    <div className="landing-product-body">
      {elements.badges && <div className="landing-product-badges">{productBadges(product).map((badge) => <span key={badge}>{badge}</span>)}</div>}
      {elements.title && <h3>{product.displayName}</h3>}
      {elements.description && <p>{product.descriptiveName ?? product.description ?? product.category.name}</p>}
      {elements.price && <p className="landing-product-price">{price === null ? copy.soldOut : <>{copy.priceFrom} <strong>{money(price)}</strong></>}</p>}
      {elements.action && (product.isPurchasable
        ? <Link className="button primary" to={url}>{copy.productAction}</Link>
        : <span className="landing-product-unavailable">{copy.soldOut}</span>)}
    </div>
  </article>;
}

export function LandingProductShowcase({ config, products, weeklyProduct }: { config: LilyLandingPageConfig["showcase"]; products: CatalogProduct[]; weeklyProduct: CatalogProduct | null }) {
  const rail = useRef<HTMLDivElement>(null);
  const featured = config.mode === "weekly"
    ? weeklyProduct ? [weeklyProduct] : []
    : config.productIds.map((id) => products.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product && !product.vipLocked && product.status === "published"));
  if (config.mode === "carousel" && featured.length === 0) return null;
  const title = config.mode === "weekly" ? copy.weeklyTitle : copy.carouselTitle;
  if (config.mode === "weekly" && featured.length === 0) return <section className="landing-showcase landing-showcase-empty"><div className="landing-section-heading"><div><span className="eyebrow">CookLily · cardápio</span><h2>{title}</h2></div></div><p className="landing-section-empty">{copy.weeklyEmpty}</p></section>;
  return <section className={`landing-showcase landing-showcase-${config.mode}`} style={{ "--landing-desktop-columns": config.desktopColumns, "--landing-mobile-columns": config.mobileColumns } as CSSProperties} aria-labelledby="landing-showcase-title">
    <div className="landing-section-heading"><div><span className="eyebrow">CookLily · cardápio</span><h2 id="landing-showcase-title">{title}</h2></div>{config.mode === "carousel" && featured.length > config.desktopColumns && <div className="landing-carousel-controls"><button type="button" aria-label={copy.previous} onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth, behavior: "smooth" })}>‹</button><button type="button" aria-label={copy.next} onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth, behavior: "smooth" })}>›</button></div>}</div>
    <div className="landing-product-rail" ref={rail} aria-label={title}>{featured.map((product) => <ProductTile key={product.id} product={product} elements={config.elements} />)}</div>
  </section>;
}
