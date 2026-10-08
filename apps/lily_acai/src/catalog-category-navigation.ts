import type { CatalogProduct } from "./api";

export type CatalogProductGroup = {
  key: string;
  name: string;
  products: CatalogProduct[];
};

export function groupCatalogProductsByCategory(products: CatalogProduct[]): CatalogProductGroup[] {
  const groups = new Map<string, CatalogProductGroup>();

  for (const product of products) {
    const key = product.category.parent?.slug ?? product.category.slug;
    const name = product.category.parent?.name ?? product.category.name;
    const existing = groups.get(key);

    if (existing) {
      existing.products.push(product);
    } else {
      groups.set(key, { key, name, products: [product] });
    }
  }

  return [...groups.values()];
}
