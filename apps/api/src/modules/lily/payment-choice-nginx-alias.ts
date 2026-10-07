import type { FastifyInstance } from "fastify";

const FORWARDED_HEADERS = [
  "cookie",
  "origin",
  "referer",
  "host",
  "user-agent",
  "x-forwarded-proto",
  "x-lily-order-token",
  "x-lily-homologation",
  "x-lily-csrf",
  "idempotency-key"
] as const;

function paymentChoiceHeaders(headers: Record<string, unknown>) {
  const forwarded: Record<string, string> = { "content-type": "application/json" };
  for (const name of FORWARDED_HEADERS) {
    const value = headers[name];
    if (typeof value === "string" && value) forwarded[name] = value;
  }
  return forwarded;
}

/**
 * Alias de transporte para produção.
 *
 * O Nginx da CookLily mantém `/api/` fail-closed e já permite o prefixo
 * `/api/v1/lily/payments/`. A primeira versão da escolha de pagamento publicou
 * o POST em `/api/v1/lily/payment-options`, fora desse prefixo. Este alias
 * mantém a regra de negócio no handler original e expõe um caminho compatível
 * com a superfície já liberada pelo proxy, sem ampliar o Nginx.
 */
export async function lilyPaymentChoiceNginxAliasRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/payments/options", async (request, reply) => {
    const forwarded = await app.inject({
      method: "POST",
      url: "/api/v1/lily/payment-options",
      headers: paymentChoiceHeaders(request.headers as Record<string, unknown>),
      payload: request.body ?? {}
    });

    const contentType = forwarded.headers["content-type"];
    if (contentType) reply.header("content-type", contentType);
    return reply.code(forwarded.statusCode).send(forwarded.body);
  });
}
