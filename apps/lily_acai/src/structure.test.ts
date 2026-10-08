import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(sourceDirectory, "styles.css"), "utf8");
const html = readFileSync(resolve(sourceDirectory, "../index.html"), "utf8");
const mainSource = readFileSync(resolve(sourceDirectory, "main.tsx"), "utf8");
const catalogSource = readFileSync(resolve(sourceDirectory, "catalog.tsx"), "utf8");
const profileSource = readFileSync(resolve(sourceDirectory, "features/account/ProfilePage.tsx"), "utf8");
const paymentSource = [
  "features/payments/PaymentPage.tsx",
  "features/payments/PaymentChoicePage.tsx",
  "features/payments/PaymentChoiceComponents.tsx",
  "features/payments/MercadoPagoCardChoiceBrick.tsx"
].map((path) => readFileSync(resolve(sourceDirectory, path), "utf8")).join("\n");
const kitchenSource = readFileSync(resolve(sourceDirectory, "features/operations/KitchenPage.tsx"), "utf8");
const courierSource = readFileSync(resolve(sourceDirectory, "features/logistics/CourierPage.tsx"), "utf8");
const accountOrdersSource = readFileSync(resolve(sourceDirectory, "features/account/AccountPages.tsx"), "utf8");
const cartSource = readFileSync(resolve(sourceDirectory, "features/cart/CartPage.tsx"), "utf8");
const cartContextSource = readFileSync(resolve(sourceDirectory, "features/cart/CartContext.tsx"), "utf8");
const checkoutSource = readFileSync(resolve(sourceDirectory, "features/checkout/CheckoutPage.tsx"), "utf8");
const printSource = readFileSync(resolve(sourceDirectory, "features/operations/KitchenPrintPage.tsx"), "utf8");
const allergenSource = readFileSync(resolve(sourceDirectory, "features/allergens/AllergenNotice.tsx"), "utf8");
const adminSource = readFileSync(resolve(sourceDirectory, "admin.tsx"), "utf8");
const adminEnhancementsSource = readFileSync(resolve(sourceDirectory, "admin-interaction-enhancements.ts"), "utf8");
const cropEditorSource = readFileSync(resolve(sourceDirectory, "image-crop-editor.ts"), "utf8");

describe("estrutura crítica de UX CookLily", () => {
  it("mantém idioma e viewport declarados no documento", () => {
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1.0"');
  });

  it("mantém skip link e destino de foco para teclado", () => {
    expect(mainSource).toContain('className="skip-link"');
    expect(mainSource).toContain('href="#lily-main-content"');
    expect(mainSource).toContain('id="lily-main-content"');
    expect(mainSource).toContain('tabIndex={-1}');
    expect(css).toContain(".skip-link:focus-visible { transform: translateY(0); }");
    expect(css).toContain("#lily-main-content:focus-visible { outline: 3px solid var(--cl-color-primary); outline-offset: 4px; }");
  });

  it("mantém foco visível abrangente em controles interativos", () => {
    expect(css).toContain("button:focus-visible");
    expect(css).toContain("select:focus-visible");
    expect(css).toContain("textarea:focus-visible");
    expect(css).toContain("outline: 3px solid var(--cl-color-primary)");
    expect(css).toContain("outline-offset: 3px");
  });

  it("respeita preferência de movimento reduzido", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("transition: none !important");
    expect(css).toContain("animation: none !important");
  });

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

  it("agrupa o cardápio em seções e mantém abas sincronizadas com a rolagem", () => {
    expect(catalogSource).toContain("groupCatalogProductsByCategory(products)");
    expect(catalogSource).toContain('className="catalog-category-tabs"');
    expect(catalogSource).toContain('role="tablist"');
    expect(catalogSource).toContain('aria-selected={activeCategory === group.key}');
    expect(catalogSource).toContain("scrollIntoView");
    expect(catalogSource).toContain('localStorage.setItem("cooklily.catalog.activeCategory", key)');
    expect(catalogSource).toContain('localStorage.getItem("cooklily.catalog.activeCategory")');
    expect(catalogSource).toContain("IntersectionObserver");
    expect(catalogSource).toContain('data-category-key={group.key}');
    expect(catalogSource).toContain('limit: 40');
    expect(css).toContain(".catalog-category-section");
    expect(css).toContain("scroll-margin-top");
    expect(css).toContain(".catalog-category-tab.active");
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

  it("mantém estado ativo visível na navegação principal", () => {
    expect(mainSource).toContain("<NavLink to=\"/cardapio\">Cardápio</NavLink>");
    expect(mainSource).toContain("<NavLink to=\"/ranking\">Ranking</NavLink>");
    expect(css).toContain(".topbar .desktop-nav a.active");
    expect(css).toContain(".topbar .desktop-nav a.active::after");
    expect(css).toContain(".topbar .mobile-menu a.active:not(.mobile-menu-primary):not(.staff-menu-link)");
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

  it("reutiliza o editor de recorte no perfil e nas capas de produto", () => {
    expect(profileSource).toContain('openImageCropper(file, {');
    expect(profileSource).toContain("aspectRatio: 1");
    expect(profileSource).toContain("maxOutputBytes: 5 * 1024 * 1024");
    expect(adminEnhancementsSource).toContain('openImageCropper(file, {');
    expect(adminEnhancementsSource).toContain("aspectRatio: 4 / 5");
    expect(adminEnhancementsSource).toContain("maxOutputBytes: 5 * 1024 * 1024");
    expect(cropEditorSource).toContain("Arraste a foto");
    expect(cropEditorSource).toContain("image/webp");
    expect(css).toContain(".cooklily-image-cropper");
    expect(css).toContain(".cooklily-image-cropper-circle");
  });

  it("mantém logout e controle explícito de sessões acessíveis no perfil", () => {
    expect(profileSource).toContain("async function handleLogout()");
    expect(profileSource).toContain("await logoutLily(session.csrfToken)");
    expect(profileSource).toContain("Sair da conta");
    expect(profileSource).toContain("Encerrar outras sessões");
    expect(profileSource).toContain("revokeOtherLilySessions");
  });

  it("mantém preferências de WhatsApp, visualização da foto e logout discreto no perfil", () => {
    expect(profileSource).toContain("whatsappUpdatesOptIn");
    expect(profileSource).toContain("whatsappOffersOptIn");
    expect(profileSource).toContain('aria-modal="true"');
    expect(profileSource).toContain('aria-label="Trocar foto de perfil"');
    expect(profileSource).toContain('aria-label="Fechar visualização da foto"');
    expect(profileSource).toContain('className="profile-logout-footer"');
    expect(profileSource).toContain("formatBrazilianPhone(profile.user.phone)");
    expect(css).toContain(".profile-avatar-modal");
    expect(css).toContain(".profile-logout-link");
  });

  it("tokeniza cartão no Brick sem criar campos próprios de PAN/CVV", () => {
    expect(paymentSource).toContain("https://sdk.mercadopago.com/js/v2");
    expect(paymentSource).toContain('bricks.create("cardPayment"');
    expect(paymentSource).toContain("payment_method_id");
    expect(paymentSource).toContain("formData?.token");
    expect(paymentSource).not.toMatch(/name=["'](?:card_number|security_code|cvv)["']/i);
  });

  it("separa crédito e débito explicitamente no Brick", () => {
    expect(paymentSource).toContain('props.method === "debit_card"');
    expect(paymentSource).toContain('["credit_card", "prepaid_card"]');
    expect(paymentSource).toContain('["debit_card", "prepaid_card"]');
  });

  it("exibe QR Pix e não expõe credenciais privadas no frontend", () => {
    expect(paymentSource).toContain("providerData?.qrCodeBase64");
    expect(paymentSource).toContain("providerData?.qrCode");
    expect(paymentSource).not.toContain("MERCADO_PAGO_ACCESS_TOKEN");
    expect(paymentSource).not.toContain("MERCADO_PAGO_WEBHOOK_SECRET");
  });

  it("mantém painel do entregador com coleta e entrega confirmadas por código", () => {
    expect(mainSource).toContain('path="/entregas"');
    expect(mainSource).toContain("CourierPage");
    expect(courierSource).toContain("Aceitar entrega");
    expect(courierSource).toContain("Cheguei na coleta");
    expect(courierSource).toContain("Código de coleta");
    expect(courierSource).toContain("Saí do local de coleta");
    expect(courierSource).toContain("Cheguei no local de entrega");
    expect(courierSource).toContain("Código de entrega");
    expect(courierSource).toContain("Saí do local de entrega");
  });

  it("mantém códigos logísticos separados entre cozinha, entregador e cliente", () => {
    expect(kitchenSource).toContain("Código de coleta");
    expect(kitchenSource).toContain("Informe este código ao entregador somente");
    expect(accountOrdersSource).toContain("deliveryCode");
    expect(accountOrdersSource).toContain("Informe este código ao entregador somente quando ele estiver no seu endereço");
    expect(accountOrdersSource).toContain("deliveryEvents");
  });

  it("mantém alergênicos visíveis no funil do cliente e na produção", () => {
    expect(catalogSource).toContain("AllergenNotice");
    expect(cartSource).toContain("AllergenNotice");
    expect(cartContextSource).toContain("item salvo antes da revisão de alergênicos");
    expect(checkoutSource).toContain("AllergenNotice");
    expect(accountOrdersSource).toContain("AllergenNotice");
    expect(kitchenSource).toContain("AllergenNotice");
    expect(printSource).toContain("AllergenNotice");
    expect(allergenSource).toContain("Informação em revisão");
    expect(allergenSource).toContain("CONTÉM:");
    expect(allergenSource).toContain("PODE CONTER:");
    expect(allergenSource).toContain("contato cruzado");
    expect(adminSource).toContain("AllergenAdminFields");
    expect(adminSource).toContain("Pendente de revisão");
  });

  it("mantém fila da cozinha no painel e bloqueia montagem sem pagamento", () => {
    expect(mainSource).toContain('path="/painel/cozinha"');
    expect(kitchenSource).toContain("Fila da cozinha");
    expect(kitchenSource).toContain('order.financialStatus !== "paid"');
    expect(kitchenSource).toContain("Aguardando pagamento");
    expect(kitchenSource).toContain("Montar pedido");
    expect(kitchenSource).toContain("Despachar pedido");
  });
});
