import { describe, expect, it } from "vitest";
import { formatBrazilianPhone } from "./phone-format";

describe("formatBrazilianPhone", () => {
  it("formata celular brasileiro com DDI", () => {
    expect(formatBrazilianPhone("+5567999864851")).toBe("+55 (67) 99986-4851");
  });

  it("formata telefone nacional sem DDI", () => {
    expect(formatBrazilianPhone("67999864851")).toBe("+55 (67) 99986-4851");
  });

  it("normaliza telefone já digitado com pontuação", () => {
    expect(formatBrazilianPhone("+55 (67) 99986-4851")).toBe("+55 (67) 99986-4851");
  });

  it("formata telefone fixo de dez dígitos", () => {
    expect(formatBrazilianPhone("+556733334444")).toBe("+55 (67) 3333-4444");
  });

  it("não altera valores que não têm tamanho telefônico brasileiro reconhecido", () => {
    expect(formatBrazilianPhone("123")).toBe("123");
  });
});
