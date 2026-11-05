import { describe, expect, it } from "vitest";
import { parseResponse } from "./api";

describe("mensagens de erro de API", () => {
  it("mostra referência de suporte para erros de pagamento em JSON", async () => {
    await expect(parseResponse(new Response(JSON.stringify({
      error: "O Mercado Pago recusou a tentativa de cartão.",
      requestId: "req-42"
    }), { status: 502, headers: { "Content-Type": "application/json" } })))
      .rejects.toThrow("O Mercado Pago recusou a tentativa de cartão. (referência req-42)");
  });

  it("oferece orientação segura se uma resposta 502 não trouxer JSON", async () => {
    await expect(parseResponse(new Response("upstream error", {
      status: 502,
      headers: { "x-request-id": "req-43" }
    }))).rejects.toThrow("O serviço de pagamento não confirmou a solicitação. O pedido permanece aguardando pagamento. (referência req-43)");
  });
});
