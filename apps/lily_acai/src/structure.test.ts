import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(sourceDirectory, "styles.css"), "utf8");
const mainSource = readFileSync(resolve(sourceDirectory, "main.tsx"), "utf8");
const catalogSource = readFileSync(resolve(sourceDirectory, "catalog.tsx"), "utf8");
const profileSource = readFileSync(resolve(sourceDirectory, "features/account/ProfilePage.tsx"), "utf8");

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
    expect(mainSource).toContain('event.key !== "Escape"');
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

  it("mantém logout acessível no perfil", () => {
    expect(profileSource).toContain("async function handleLogout()");
    expect(profileSource).toContain("await logoutLily(session.csrfToken)");
    expect(profileSource).toContain("Sair da conta");
  });
});
