import type { ReactNode } from "react";

export type CatalogProductCardData = {
  displayName: string;
  categoryName: string;
  cover?: { url: string; altText: string } | null;
};

export function CatalogProductCard({
  product,
  price,
  onOpen,
  isSoldOut = false
}: {
  product: CatalogProductCardData;
  price: ReactNode;
  onOpen: () => void;
  isSoldOut?: boolean;
}) {
  return <article className={`product-card${isSoldOut ? " sold-out" : ""}`}>
    <div className="product-card-media">
      <button className="catalog-image-button" type="button" onClick={onOpen} aria-label={`Editar ${product.displayName}`}>
        <img src={product.cover?.url ?? `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`} alt={product.cover?.altText ?? product.displayName} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = `${import.meta.env.BASE_URL}brand/cooklily-logo-96.webp`; }} />
        {!product.cover && <span className="placeholder-label">Foto em breve</span>}
      </button>
    </div>
    <button className="product-card-body" type="button" onClick={onOpen}>
      <span className="product-category">{product.categoryName}</span>
      <h3>{product.displayName}</h3>
      <div className="product-price">{price}</div>
      <span className="product-category">Editar produto</span>
    </button>
  </article>;
}
