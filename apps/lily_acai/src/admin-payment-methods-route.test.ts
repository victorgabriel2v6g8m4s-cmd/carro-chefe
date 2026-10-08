import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());

function source(relative: string) {
  return readFileSync(path.join(root, relative), "utf8");
}

describe("CookLily — painel de pagamentos", () => {
  it("expõe uma rota própria para métodos e descontos", () => {
    const main = source("apps/lily_acai/src/main.tsx");
    expect(main).toContain('import { AdminPaymentMethodsPage } from "./features/admin/AdminPaymentMethodsPage";');
    expect(main).toContain('path="/painel/pagamentos/metodos"');
    expect(main).toContain("<AdminPaymentMethodsPage />");
  });

  it("separa configuração financeira de pagamentos e reconciliação", () => {
    const admin = source("apps/lily_acai/src/admin.tsx");
    const payments = source("apps/lily_acai/src/features/admin/AdminPaymentsPage.tsx");
    const methods = source("apps/lily_acai/src/features/admin/AdminPaymentMethodsPage.tsx");

    expect(admin).toMatch(/painel\/pagamentos\/metodos[\s\S]*Métodos e descontos/);
    expect(admin).toMatch(/painel\/pagamentos[\s\S]*Pagamentos e reconciliação/);
    expect(payments).toContain('to="/painel/pagamentos/metodos">Métodos e descontos');
    expect(methods).toContain("Formas de pagamento e descontos");
    expect(methods).toContain("O cliente escolhe Pix, crédito ou débito.");
  });
});
