import { getLilyCatalog, type CatalogProduct } from "../../api";

const CATALOG_PAGE_SIZE = 40;

export async function loadReelsCatalog(): Promise<CatalogProduct[]> {
  const products: CatalogProduct[] = [];
  let offset = 0;
  do {
    const page = await getLilyCatalog({ limit: CATALOG_PAGE_SIZE, offset });
    products.push(...page.products);
    if (page.nextOffset === null || page.nextOffset <= offset) break;
    offset = page.nextOffset;
  } while (true);
  return products.filter((product) => product.status === "published" && (product.isAvailable || product.vipLocked));
}
