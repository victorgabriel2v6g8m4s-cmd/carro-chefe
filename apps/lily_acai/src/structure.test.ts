import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(sourceDirectory, "styles.css"), "utf8");
const mainSource = readFileSync(resolve(sourceDirectory, "main.tsx"), "utf8");
const catalogSource = readFileSync(resolve(sourceDirectory, "catalog.tsx"), "utf8");
const profileSource = readFileSync(resolve(sourceDirectory, "features/account/ProfilePage.tsx"), "utf8");
const paymentSource = readFileSync(resolve(sourceDirectory, "features/payments/PaymentPage.tsx"), "utf8");

describe("estrutura crítica de UX CookLily", () => {
  it("não mascara overflow horizontal globalmente", () => {
    expect(css).not.toMatch(/html,\s*body,\s*#root\s*\{[^}]*overflow-x:\s*hidden/i);
    expect(css).not.toMatch(/main\s*\{[^}]*overflow:\s*clip/i);
    expect(css).not.toContain("calc(100% + 24px)");
    expect(css).not.toContain("calc(100% + 16px)");
  });

  it("mantém navegação desktop fora do header mobile e drawer dentro da viewport", () => {
    expect(css).toContain(".topbar-inner .desktop-nav,\n  .auth-actions-desktop {\n    display: none;");
    expect(css).toContain("width: min(330px,calc(100% - 20px))");
    expect(mainSource).toContain('className="mobile-menu-backdrop"');
    expect(mainSource).toContain('onClick={closeMenu}');
    expect(mainSource).toContain('event.key === "Escape"');
    expect(mainSource).toContain('event.key !== "Tab"');
    expect(mainSource).toContain("querySelectorAll<HTMLElement>(focusableSelector)");
    expect(mainSource).toContain("last.focus()");
    expect(mainSource).toContain("first.focus()");
  });

  it("prioriza produtos antes dos combos no cardápio", () => {
    const summary = catalogSource.indexOf('className="catalog-summary"');
    const grid = catalogSource.indexOf('className="catalog-grid"');
    const combos = catalogSource.indexOf("<ComboCarousel");
    expect(summary).toBeGreaterThan(-1);
    expect(grid).toBeGreaterThan(summary);
    expect(combos).toBeGreaterThan(grid);
  });

  it("mantém carrossel com snap sem alargar a viewport", () => {
    expect(css).toContain(".combo-carousel-viewport");
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("flex: 0 0 calc(100% - 34px)");
    expect(css).toContain("flex-basis: calc(100% - 22px)");
  });

  it("mantém alvos de toque críticos com pelo menos 44px", () => {
    expect(css).toContain(".combo-carousel-controls button {\n  width: 44px;\n  height: 44px;");
    expect(css).not.toContain(".combo-carousel-controls button { width: 36px; height: 36px; }");
    expect(css).toContain(".header-icon { width: 44px; height: 44px; min-width: 44px; }");
  });

  it("mantém configurações da loja separadas de entrega", () => {
    expect(mainSource).toContain('path="/painel/configuracoes"');
    expect(mainSource).toContain("AdminStoreSettingsPage");
  });

  it("mantém deep-link estável para abrir produto por slug", () => {
    expect(catalogSource).toContain('/cardapio?produto=');
    expect(catalogSource).toContain('searchParams.get("produto")');
    expect(catalogSource).toContain('getLilyProductBySlug(productSlug)');
    expect(catalogSource).toContain('next.set("produto", product.slug)');
    expect(catalogSource).toContain('next.delete("produto")');
    expect(catalogSource).toContain('onClose={closeProduct}');
  });

  it("mantém logout e controle explícito de sessões acessíveis no perfil", () => {
    expect(profileSource).toContain("async function handleLogout()");
    expect(profileSource).toContain("await logoutLily(session.csrfToken)");
    expect(profileSource).toContain("Sair da conta");
    expect(profileSource).toContain("Encerrar outras sessões");
    expect(profileSource).toContain("revokeOtherLilySessions");
  });

  it("tokeniza cartão no Brick sem criar campos próprios de PAN/CVV", () => {
    expect(paymentSource).toContain("https://sdk.mercadopago.com/js/v2");
    expect(paymentSource).toContain('bricks.create("cardPayment"');
    expect(paymentSource).toContain("payment_method_id");
    expect(paymentSource).toContain("formData?.token");
    expect(paymentSource).not.toMatch(/name=["'](?:card_number|security_code|cvv)["']/i);
  });

  it("exibe QR Pix e não expõe credenciais privadas no frontend", () => {
    expect(paymentSource).toContain("providerData?.qrCodeBase64");
    expect(paymentSource).toContain("providerData?.qrCode");
    expect(paymentSource).not.toContain("MERCADO_PAGO_ACCESS_TOKEN");
    expect(paymentSource).not.toContain("MERCADO_PAGO_WEBHOOK_SECRET");
  });
});
