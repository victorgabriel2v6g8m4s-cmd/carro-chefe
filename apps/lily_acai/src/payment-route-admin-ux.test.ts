import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());

function source(relative: string) {
  return readFileSync(path.join(root, relative), "utf8");
}

describe("CookLily — pagamento e UX administrativa", () => {
  it("inicia a escolha de pagamento dentro do prefixo /payments liberado pelo Nginx", () => {
    const client = source("apps/lily_acai/src/features/payments/payment-choice-api.ts");
    const alias = source("apps/api/src/modules/lily/payment-choice-nginx-alias.ts");
    const app = source("apps/api/src/app.ts");
    expect(client).toContain('fetch("/api/v1/lily/payments/options"');
    expect(client).not.toContain('fetch("/api/v1/lily/payment-options"');
    expect(alias).toContain('app.post("/api/v1/lily/payments/options"');
    expect(alias).toContain('url: "/api/v1/lily/payment-options"');
    expect(app).toContain("lilyPaymentChoiceNginxAliasRoutes");
  });

  it("oferece upload direto de capa por produto e feedback discreto", () => {
    const enhancement = source("apps/lily_acai/src/admin-interaction-enhancements.ts");
    expect(enhancement).toContain("Enviar foto de capa");
    expect(enhancement).toContain('body: JSON.stringify({ coverMediaId: mediaId })');
    expect(enhancement).toContain("Produto atualizado com sucesso.");
    expect(enhancement).toContain("cooklily-admin-refresh-snapshot");
  });

  it("carrega o módulo de melhoria administrativa no app", () => {
    const html = source("apps/lily_acai/index.html");
    expect(html).toContain('/src/admin-interaction-enhancements.ts');
  });
});
