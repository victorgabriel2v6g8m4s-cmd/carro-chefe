import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { uiStateSchema } from "@carro-chefe/contracts";
import { config } from "../../config";

export async function uiStateRoutes(app: FastifyInstance) {
  app.get("/api/v1/me/ui-state/:scope", async (request) => {
    const { scope } = request.params as { scope: string };
    const state = await prisma.uiState.findUnique({ where: { userId_scope: { userId: config.defaultUserId, scope } } });
    return state ? { ...state, filters: JSON.parse(state.filtersJson) } : null;
  });
  app.put("/api/v1/me/ui-state/:scope", async (request) => {
    const { scope } = request.params as { scope: string };
    const input = uiStateSchema.parse(request.body);
    const data = { ...input, selectedTaskId: input.selectedTaskId ?? null, filtersJson: JSON.stringify(input.filters), filters: undefined } as any;
    return prisma.uiState.upsert({ where: { userId_scope: { userId: config.defaultUserId, scope } },
      update: { ...data, version: { increment: 1 } }, create: { userId: config.defaultUserId, scope, ...data } });
  });
}
