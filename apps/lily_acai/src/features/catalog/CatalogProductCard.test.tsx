import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogProductCard } from "./CatalogProductCard";

describe("CatalogProductCard", () => {
  it("reuses the same card structure for public and admin product previews", () => {
    const markup = renderToStaticMarkup(createElement(CatalogProductCard, {
      product: {
        displayName: "Lily Mix",
        categoryName: "Açaí",
        cover: { url: "/media/lily-mix.webp", altText: "Copo de açaí" }
      },
      price: createElement("strong", null, "R$ 20,00"),
      onOpen: () => undefined
    }));

    expect(markup).toContain('class="product-card "');
    expect(markup).toContain('class="product-card-media"');
    expect(markup).toContain("Lily Mix");
    expect(markup).toContain("Editar produto");
  });
});
