import type { FastifyInstance } from "fastify";
import { webhookEndpointRoutes } from "./endpoint-routes";
import { inboundWebhookRoutes } from "./inbound-routes";

export async function webhookRoutes(app: FastifyInstance) {
  await app.register(webhookEndpointRoutes);
  await app.register(inboundWebhookRoutes);
}
