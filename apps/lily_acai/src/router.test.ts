import { describe, expect, it } from "vitest";
import { isNavLinkActive } from "./router";

describe("links ativos Lily", () => {
  it("mantém o link Início ativo somente na raiz", () => {
    expect(isNavLinkActive("/", "/")).toBe(true);
    expect(isNavLinkActive("/cardapio", "/")).toBe(false);
  });

  it("marca uma seção e suas rotas filhas, mas respeita end", () => {
    expect(isNavLinkActive("/painel/fidelidade", "/painel")).toBe(true);
    expect(isNavLinkActive("/painel/fidelidade", "/painel", true)).toBe(false);
  });
});
