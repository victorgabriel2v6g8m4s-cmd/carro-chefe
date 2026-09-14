import type { FastifyInstance } from "fastify";
import { browserFileRoutes } from "./file-routes";
import { browserNavigationRoutes } from "./navigation-routes";
import { browserSessionRoutes } from "./session-routes";

export async function browserRoutes(app: FastifyInstance) {
  await app.register(browserSessionRoutes);
  await app.register(browserFileRoutes);
  await app.register(browserNavigationRoutes);
}
