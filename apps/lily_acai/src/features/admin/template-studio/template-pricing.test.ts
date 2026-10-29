import { describe, expect, it } from "vitest";
import { defaultPricing, quoteMessages } from "./template-pricing";

describe("cotação do simulador WhatsApp", () => {
  it("usa uma mensagem de cada categoria e converte pelo câmbio configurado", () => {
    const quote = quoteMessages([{ category: "marketing", windowOpen: false }, { category: "utility", windowOpen: true }, { category: "authentication", windowOpen: true }], defaultPricing);
    expect(quote.usd).toBeCloseTo(0.0761);
    expect(quote.brl).toBeCloseTo(0.4088);
    expect(quote.byCategory.utility.count).toBe(1);
    expect(quote.byCategory.utility.usd).toBe(defaultPricing.usd.utility);
  });

  it("aplica a franquia configurada somente às mensagens de serviço após cliente iniciar", () => {
    const config = { ...defaultPricing, freeServiceMessages: 1 };
    const quote = quoteMessages([{ category: "service", windowOpen: true }, { category: "service", windowOpen: true }, { category: "utility", windowOpen: true }], config);
    expect(quote.freeServiceUsed).toBe(1);
    expect(quote.usd).toBeCloseTo(0.0136);
  });

  it("cobra template de utilidade durante a janela de atendimento aberta", () => {
    const quote = quoteMessages([{ category: "utility", windowOpen: true }, { category: "marketing", windowOpen: true }], defaultPricing);
    expect(quote.usd).toBe(defaultPricing.usd.utility + defaultPricing.usd.marketing);
  });

  it("bloqueia serviço fora da janela e aplica a franquia após a resposta do cliente", () => {
    const quote = quoteMessages([{ category: "service", windowOpen: false }, { category: "service", windowOpen: true }], { ...defaultPricing, freeServiceMessages: 1000 });
    expect(quote.blockedService).toBe(1);
    expect(quote.freeServiceUsed).toBe(1);
    expect(quote.usd).toBe(0);
  });
});
