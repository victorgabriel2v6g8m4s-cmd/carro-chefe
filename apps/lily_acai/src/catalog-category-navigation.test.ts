import { describe, expect, it } from "vitest";
import { groupCatalogProductsByCategory } from "./catalog-category-navigation";
import type { CatalogProduct } from "./api";

function product(id: string, category: CatalogProduct["category"]): CatalogProduct {
  return {
    id,
    slug: id,
    displayName: id,
    descriptiveName: null,
    description: null,
    tags: [],
    allergens: { reviewStatus: "reviewed", contains: [], mayContain: [] },
    configurationType: "fixed",
    status: "published",
    isAvailable: true,
    isPurchasable: true,
    soldOut: false,
    featured: false,
    weeklyHighlight: false,
    allowPlaceholder: false,
    sortOrder: 0,
    category,
    cover: null,
    gallery: [],
    variants: [],
    flavors: [],
    addons: [],
    mixTiers: [],
    offers: []
  };
}

describe("agrupamento de categorias do catálogo", () => {
  it("agrupa produtos pela categoria pai quando existe", () => {
    const groups = groupCatalogProductsByCategory([
      product("a", { id: "1", slug: "acai", name: "Açaí", parent: null }),
      product("b", { id: "2", slug: "lilyshake", name: "LilyShake", parent: null }),
      product("c", { id: "3", slug: "tradicional", name: "Tradicional", parent: { id: "1", slug: "acai", name: "Açaí" } })
    ]);

    expect(groups.map((group) => group.key)).toEqual(["acai", "lilyshake"]);
    expect(groups[0]?.products.map((item) => item.id)).toEqual(["a", "c"]);
    expect(groups[0]?.name).toBe("Açaí");
  });

  it("preserva a ordem da primeira ocorrência das categorias", () => {
    const groups = groupCatalogProductsByCategory([
      product("b", { id: "2", slug: "lilyshake", name: "LilyShake", parent: null }),
      product("a", { id: "1", slug: "acai", name: "Açaí", parent: null }),
      product("c", { id: "3", slug: "lilyshake-2", name: "LilyShake 2", parent: { id: "2", slug: "lilyshake", name: "LilyShake" } })
    ]);

    expect(groups.map((group) => group.key)).toEqual(["lilyshake", "acai"]);
    expect(groups[0]?.products.map((item) => item.id)).toEqual(["b", "c"]);
  });
});
