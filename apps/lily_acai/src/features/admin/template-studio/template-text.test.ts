import { describe, expect, it } from "vitest";
import { ensureVariableNames, normalizeVariableName, removeVariable, variableUsage } from "./template-text";

describe("variáveis nomeadas do estúdio", () => {
  it("normaliza nomes digitados em português para identificadores simples", () => {
    expect(normalizeVariableName("Número do pedido")).toBe("numero_do_pedido");
  });

  it("cria rótulos de compatibilidade para templates antigos com variáveis numeradas", () => {
    expect(ensureVariableNames([{ type: "BODY", text: "Pedido {{1}} e {{3}}" }], [])).toEqual(["variavel_1", "variavel_2", "variavel_3"]);
  });

  it("remove a variável inteira e renumera as posteriores em cada componente", () => {
    const result = removeVariable([
      { type: "HEADER", text: "{{2}}" },
      { type: "BODY", text: "{{1}} {{2}} {{3}}" }
    ], ["cliente", "pedido", "etapa"], 2);
    expect(result.components.map((component) => component.text)).toEqual(["", "{{1}}  {{2}}"]);
    expect(result.variableNames).toEqual(["cliente", "etapa"]);
  });

  it("conta referências sem quebrar ou contar texto parcial", () => {
    expect(variableUsage([{ type: "BODY", text: "{{1}} {{1}}" }], 1)).toBe(2);
  });
});
