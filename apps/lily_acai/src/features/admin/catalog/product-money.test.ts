import { describe, expect, it } from "vitest";
import { moneyInput, parseMoney } from "./product-money";

describe("formatação monetária do catálogo administrativo", () => {
  it("preserva a entrada em reais e converte para centavos", () => {
    expect(moneyInput(1234)).toBe("12,34");
    expect(moneyInput(null)).toBe("");
    expect(parseMoney("1.234,56")).toBe(123456);
    expect(parseMoney("12,34")).toBe(1234);
    expect(parseMoney("inválido")).toBe(0);
  });
});
