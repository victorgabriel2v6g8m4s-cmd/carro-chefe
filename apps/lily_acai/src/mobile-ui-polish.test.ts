import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());

function source(relative: string) {
  return readFileSync(path.join(root, relative), "utf8");
}

describe("CookLily — ajustes mobile de UI", () => {
  it("usa o slot do carrinho no footer para acessar o Ranking", () => {
    const app = source("apps/lily_acai/src/main.tsx");
    expect(app).toContain('NavLink to="/ranking"><Trophy size={22}');
    expect(app).toContain('NavLink to="/cardapio"><BookOpen size={22}');
    expect(app).not.toContain('NavLink to="/carrinho" aria-label={`Carrinho');
  });

  it("mantém ações de modal acima da navegação e separa o preço selecionado", () => {
    const styles = source("apps/lily_acai/src/styles.css");
    expect(styles).toContain(".product-modal-backdrop { position: fixed; inset: 0; z-index: 90;");
    expect(styles).toContain("body:has(.product-modal-backdrop) .mobile-footer-nav { visibility: hidden; }");
    expect(styles).toContain(".choice-chip.selected .price-display strong { color: #fff;");
  });

  it("desloca o consentimento de analytics acima do footer fixo mobile", () => {
    const styles = source("apps/lily_acai/src/styles.css");
    expect(styles).toContain(".analytics-consent { bottom: calc(var(--mobile-footer-nav-height) + env(safe-area-inset-bottom) + 10px); }");
  });

  it("omite temporariamente alergênicos das telas do cliente", () => {
    const customerSurfaces = [
      "apps/lily_acai/src/catalog.tsx",
      "apps/lily_acai/src/features/cart/CartPage.tsx",
      "apps/lily_acai/src/features/checkout/CheckoutPage.tsx",
      "apps/lily_acai/src/features/account/AccountPages.tsx",
      "apps/lily_acai/src/features/orders/GuestOrderTrackingPage.tsx"
    ];
    for (const file of customerSurfaces) {
      expect(source(file), file).not.toContain("AllergenNotice");
    }
  });
});
