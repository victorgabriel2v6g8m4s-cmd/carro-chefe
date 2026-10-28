import { describe, expect, it } from "vitest";
import { parseSocialLinks, socialLinksSchema } from "./social-links";

describe("redes sociais públicas CookLily", () => {
  it("aceita canais opcionais de domínios HTTPS oficiais", () => {
    expect(socialLinksSchema.parse([
      { platform: "instagram", url: "https://instagram.com/cook._lily", identifier: "@cook._lily", label: "" },
      { platform: "whatsapp", url: "https://wa.me/5567999999999", identifier: "", label: "" }
    ])).toHaveLength(2);
  });

  it("rejeita URL HTTP, domínio parecido e credenciais embutidas", () => {
    for (const url of ["http://instagram.com/cook._lily", "https://instagram.com.example.org/cook._lily", "https://admin:senha@instagram.com/cook._lily"]) {
      expect(socialLinksSchema.safeParse([{ platform: "instagram", url, identifier: "", label: "" }]).success).toBe(false);
    }
  });

  it("retorna lista vazia para dados legados vazios ou inválidos", () => {
    expect(parseSocialLinks("[]")).toEqual([]);
    expect(parseSocialLinks("invalido")).toEqual([]);
  });
});
