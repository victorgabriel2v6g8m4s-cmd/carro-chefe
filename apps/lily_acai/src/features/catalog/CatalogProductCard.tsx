import type { ReactNode } from "react";

export type CatalogProductCardData = {
  displayName: string;
  categoryName: string;
  cover?: { url: string; altText: string } | null;
  soldOut?: boolean;
  vipLocked?: boolean;
};

export type CatalogProductCardBadge = {
  label: string;
  className: string;
  visible?: boolean;
};

export function CatalogProductCard({
  product,
  price,
  badges = [],
  actionLabel,
  onOpen
}: {
  product: CatalogProductCardData;
  price: ReactNode;
  badges?: CatalogProductCardBadge[];
  actionLabel?: string;
  onOpen: () => void;
}) {
  return <article data-lily-reveal className={`product-card ${product.soldOut ? "sold-out" : ""} ${product.vipLocked ? "vip-locked-card" : ""}`}>
    <div className={`product-card-media${product.vipLocked ? " vip-locked-media" : ""}`}>
      <button className="catalog-image-button" type="button" onClick={onOpen} disabled={product.vipLocked} aria-label={`${actionLabel ?? "Abrir produto"}: ${product.displayName}`}>
        <img src={product.cover?.url ?? `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`} alt={product.cover?.altText ?? `${product.displayName} — imagem temporária CookLily`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`; }} />
        {!product.cover && <span className="placeholder-label">Foto em breve</span>}
      </button>
      {badges.map(({ label, className, visible }) => visible && <span key={label} className={className}>{label}</span>)}
    </div>
    <button className="product-card-body" type="button" onClick={onOpen} disabled={product.vipLocked}>
      <span className="product-category">{product.categoryName}</span>
      <h3>{product.displayName}</h3>
      <div className="product-price">{price}</div>
      {actionLabel && <span className="product-category">{actionLabel}</span>}
    </button>
  </article>;
}
