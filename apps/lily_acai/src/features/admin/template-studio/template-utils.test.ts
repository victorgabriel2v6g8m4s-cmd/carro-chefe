import { describe, expect, it } from "vitest";
import { emptyTemplate, makeMetaPayload, renderTemplateMessage, textVariables, validateComponents } from "./template-utils";
import type { MetaTemplateComponent } from "./template-types";
import { createAuthenticationComponents, setAuthenticationExpiration, setAuthenticationSecurityRecommendation, setOtpType } from "./authentication-template";

describe("WhatsApp Meta template studio utilities", () => {
  it("prepara a categoria Meta, idioma e componentes sem enviar nada", () => {
    const payload = makeMetaPayload({
      ...emptyTemplate,
      key: "pedido_pronto",
      category: "utility",
      components: [{ type: "BODY", text: "Pedido {{1}} pronto" }]
    });
    expect(payload).toEqual({
      name: "pedido_pronto",
      language: "pt_BR",
      category: "UTILITY",
      components: [{ type: "BODY", text: "Pedido {{1}} pronto" }]
    });
  });

  it("aplica o template ao chat local e identifica parâmetros posicionais", () => {
    const components: MetaTemplateComponent[] = [
      { type: "HEADER", format: "TEXT", text: "Atualização {{2}}" },
      { type: "BODY", text: "Oi, pedido {{1}} está a caminho." },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Acompanhar" }] }
    ];
    expect(textVariables(components)).toEqual([1, 2]);
    expect(renderTemplateMessage(components, { 1: "CL-2048", 2: "CookLily" })).toEqual([
      "Atualização CookLily",
      "Oi, pedido CL-2048 está a caminho.",
      "[Acompanhar]"
    ]);
  });

  it("rejeita JSON avançado com profundidade, lista ou assinatura inválida", () => {
    expect(validateComponents([{ text: "faltou tipo" }])).toBeNull();
    let nested: unknown = true;
    for (let level = 0; level < 10; level += 1) nested = { value: nested };
    expect(validateComponents([{ type: "BODY", nested }])).toBeNull();
    expect(validateComponents([{ type: "BODY", text: "válido" }])).toEqual([{ type: "BODY", text: "válido" }]);
  });

  it("monta componentes Meta próprios para autenticação e simula o código local", () => {
    let components = createAuthenticationComponents();
    expect(components).toEqual([
      { type: "BODY" },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] }
    ]);
    expect(renderTemplateMessage(components, {})).toEqual([
      "123456 é seu código de verificação.",
      "[Copiar código]"
    ]);
    components = setAuthenticationSecurityRecommendation(components, true);
    components = setAuthenticationExpiration(components, true, 10);
    components = setOtpType(components, "ONE_TAP");
    expect(components).toEqual([
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 10 },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "ONE_TAP" }] }
    ]);
    expect(renderTemplateMessage(components, {})).toEqual([
      "123456 é seu código de verificação.",
      "[Preencher código]"
    ]);
  });
});
