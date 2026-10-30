import { useState } from "react";
import { ProductEditor } from "./ProductEditor";
import type { AdminProductSummary } from "./types";

export function ProductCatalogIndex({ products, csrf, refresh, setError }: { products: AdminProductSummary[]; csrf: string; refresh: () => Promise<void>; setError: (value: string) => void }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const categories = [...new Map(products.map((product) => [product.category.id, product.category])).values()];
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleProducts = products.filter((product) => (!categoryId || product.category.id === categoryId)
    && (!normalizedQuery || `${product.displayName} ${product.descriptiveName ?? ""} ${product.category.name}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery)));
  return <>
    <div className="admin-form-grid compact">
      <label>Buscar produto<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou categoria" /></label>
      <label>Categoria<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <small aria-live="polite">{visibleProducts.length} de {products.length} produtos</small>
    </div>
    <div className="catalog-grid admin-product-list">
      {visibleProducts.map((product) => <ProductEditor key={product.id} product={product} csrf={csrf} refresh={refresh} setError={setError} />)}
      {visibleProducts.length === 0 && <p className="admin-empty-state">Nenhum produto corresponde à busca.</p>}
    </div>
  </>;
}
