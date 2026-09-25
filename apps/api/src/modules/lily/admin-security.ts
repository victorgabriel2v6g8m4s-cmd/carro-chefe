import type { FastifyRequest } from "fastify";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "./auth";

export async function requireLilyStaff(request: FastifyRequest, requireCsrf = false) {
  const context = await requireLilySession(request);
  if (context.user.role !== "staff" && context.user.role !== "admin") {
    throw new ApiError(403, "Acesso restrito à equipe CookLily.", { code: "LILY_STAFF_REQUIRED" });
  }
  if (context.user.staffPasswordUpgradeRequired) {
    throw new ApiError(403, "Atualize sua senha antes de acessar funções administrativas.", {
      code: "LILY_STAFF_PASSWORD_UPGRADE_REQUIRED"
    });
  }
  if (requireCsrf) requireLilyCsrf(request, context);
  return context;
}

export async function auditLilyAdmin(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  payload?: unknown
) {
  await lilyPrisma.lilyAdminAudit.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId: entityId ?? null,
      payloadJson: payload === undefined ? null : JSON.stringify(payload).slice(0, 12000)
    }
  });
}


export async function requireLilyAdmin(request: FastifyRequest, requireCsrf = false) {
  const context = await requireLilyStaff(request, requireCsrf);
  if (context.user.role !== "admin") {
    throw new ApiError(403, "Esta ação exige perfil admin CookLily.", { code: "LILY_ADMIN_REQUIRED" });
  }
  return context;
}
