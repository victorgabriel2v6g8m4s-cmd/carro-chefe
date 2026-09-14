import type { FastifyInstance } from "fastify";
import { requireTrustedRequest } from "../../security";
import { validateWebhookDestination } from "./destination-policy";
import { presentWebhookEndpoint } from "./presenter";
import { createWebhookEndpoint, listWebhookEndpoints } from "./repository";
import { webhookEndpointSchema } from "./schemas";

export async function webhookEndpointRoutes(app: FastifyInstance) {
  app.get("/api/v1/webhooks", { preHandler: requireTrustedRequest }, async () => {
    const endpoints = await listWebhookEndpoints();
    return endpoints.map(presentWebhookEndpoint);
  });

  app.post("/api/v1/webhooks", async (request, reply) => {
    const input = webhookEndpointSchema.parse(request.body);
    const url = await validateWebhookDestination(input.url);
    const endpoint = await createWebhookEndpoint({ ...input, url, events: [...new Set(input.events)] });
    return reply.code(201).send(presentWebhookEndpoint(endpoint));
  });
}
