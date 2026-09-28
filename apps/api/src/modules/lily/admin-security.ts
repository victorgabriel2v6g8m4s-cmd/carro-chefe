import type { FastifyRequest } from "fastify";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "./auth";


async function requirePrivilegedRole(
  request: FastifyRequest,
  allowedRoles: string[],
  roleError: { message: string; code: string },
  requireCsrf = false
) {
  const context = await requireLilySession(request);
  if (!allowedRoles.includes(context.user.role)) {
    throw new ApiError(403, roleError.message, { code: roleError.code });
  }
  if (context.user.staffPasswordUpgradeRequired) {
    throw new ApiError(403, "Atualize sua senha antes de acessar funções operacionais.", {
      code: "LILY_STAFF_PASSWORD_UPGRADE_REQUIRED"
    });
  }
  if (!context.user.mfaEnabled) {
    throw new ApiError(403, "Configure MFA antes de acessar funções operacionais.", {
      code: "LILY_STAFF_MFA_SETUP_REQUIRED"
    });
  }
  if (!context.session.mfaVerifiedAt) {
    throw new ApiError(403, "Confirme o segundo fator antes de acessar funções operacionais.", {
      code: "LILY_STAFF_MFA_REQUIRED"
    });
  }
  if (requireCsrf) requireLilyCsrf(request, context);
  return context;
}

export async function requireLilyStaff(request: FastifyRequest, requireCsrf = false) {
  return requirePrivilegedRole(
    request,
    ["staff", "admin"],
    { message: "Acesso restrito à equipe CookLily.", code: "LILY_STAFF_REQUIRED" },
    requireCsrf
  );
}

export async function requireLilyCourier(request: FastifyRequest, requireCsrf = false) {
  return requirePrivilegedRole(
    request,
    ["courier", "admin"],
    { message: "Acesso restrito aos entregadores CookLily.", code: "LILY_COURIER_REQUIRED" },
    requireCsrf
  );
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
