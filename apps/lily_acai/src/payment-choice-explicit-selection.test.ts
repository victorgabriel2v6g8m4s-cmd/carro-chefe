import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const file = path.resolve(process.cwd(), "apps/lily_acai/src/features/payments/PaymentChoicePage.tsx");

describe("escolha explícita do método de pagamento", () => {
  it("não pré-seleciona Pix nem cartão ao abrir a etapa de pagamento", async () => {
    const source = await readFile(file, "utf8");
    expect(source).toContain('useState<LilyCheckoutPaymentMethod | null>(null)');
    expect(source).toContain('setSelectedMethod(null)');
    expect(source).not.toContain('const preferred = payload.methods.find');
  });

  it("só renderiza detalhes do provedor depois da escolha do cliente", async () => {
    const source = await readFile(file, "utf8");
    expect(source).toContain('const option = selectedMethod');
    expect(source).toContain('Nenhuma cobrança será iniciada antes da sua escolha.');
    expect(source).toContain('option.id === "credit_card" || option.id === "debit_card"');
  });
});
