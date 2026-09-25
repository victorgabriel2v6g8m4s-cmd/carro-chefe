import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin } from "./admin-security";
import { normalizeLilyPhone } from "./auth";

const idSchema = z.string().trim().min(1).max(120);
const roleSchema = z.enum(["customer", "staff", "admin"]);
const staffRoleSchema = z.enum(["staff", "admin"]);

const promoteSchema = z.object({
  phone: z.string().trim().min(8).max(40),
  role: staffRoleSchema.default("staff")
}).strict();

const memberPatchSchema = z.object({
  role: roleSchema.optional(),
  status: z.enum(["active", "suspended"]).optional()
}).strict().refine((value) => value.role !== undefined || value.status !== undefined, {
  message: "Informe papel ou status."
});

async function ensureAnotherActiveAdmin(targetUserId: string) {
  const count = await lilyPrisma.lilyUser.count({
    where: {
      id: { not: targetUserId },
      role: "admin",
      status: "active"
    }
  });
  if (count < 1) {
    throw new ApiError(409, "A equipe precisa manter pelo menos um admin ativo.", {
      code: "LILY_LAST_ADMIN_REQUIRED"
    });
  }
}

function serializeMember(user: any) {
  return {
    id: user.id,
    phone: user.phoneNormalized,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    staffPasswordUpgradeRequired: user.staffPasswordUpgradeRequired,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    activeSessions: Array.isArray(user.sessions) ? user.sessions.length : 0
  };
}

export async function lilyTeamRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/team", async (request) => {
    await requireLilyAdmin(request);
    const query = z.object({
      q: z.string().trim().max(80).optional(),
      includeCustomers: z.enum(["true", "false"]).optional().transform((value) => value === "true")
    }).parse(request.query);

    const where: any = query.includeCustomers ? {} : { role: { in: ["staff", "admin"] } };
    if (query.q) {
      const phone = normalizeLilyPhone(query.q);
      where.OR = [
        ...(phone ? [{ phoneNormalized: phone }] : []),
        { displayName: { contains: query.q } }
      ];
    }

    const members = await lilyPrisma.lilyUser.findMany({
      where,
      include: {
        sessions: { where: { revokedAt: null }, select: { id: true } }
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      take: 100
    });
    return { members: members.map(serializeMember) };
  });

  app.post("/api/v1/lily/admin/team/promote", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = promoteSchema.parse(request.body);
    const phone = normalizeLilyPhone(input.phone);
    if (!phone) throw new ApiError(400, "Telefone inválido.", { code: "LILY_INVALID_PHONE" });

    const target = await lilyPrisma.lilyUser.findUnique({ where: { phoneNormalized: phone } });
    if (!target) {
      throw new ApiError(404, "Crie primeiro a conta CookLily desse telefone.", {
        code: "LILY_TEAM_ACCOUNT_REQUIRED"
      });
    }
    if (target.status !== "active") {
      throw new ApiError(409, "A conta precisa estar ativa antes da promoção.", {
        code: "LILY_TEAM_ACCOUNT_INACTIVE"
      });
    }

    const updated = await lilyPrisma.lilyUser.update({
      where: { id: target.id },
      data: {
        role: input.role,
        staffPasswordUpgradeRequired: target.role === input.role
          ? target.staffPasswordUpgradeRequired
          : true
      },
      include: {
        sessions: { where: { revokedAt: null }, select: { id: true } }
      }
    });
    await auditLilyAdmin(context.user.id, "team.promote", "user", target.id, {
      fromRole: target.role,
      toRole: input.role,
      phone
    });
    return serializeMember(updated);
  });

  app.patch("/api/v1/lily/admin/team/:id", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const { id } = z.object({ id: idSchema }).parse(request.params);
    const input = memberPatchSchema.parse(request.body);
    const target = await lilyPrisma.lilyUser.findUnique({ where: { id } });
    if (!target) throw new ApiError(404, "Usuário não encontrado.");

    if (target.id === context.user.id && (
      (input.role !== undefined && input.role !== "admin")
      || input.status === "suspended"
    )) {
      throw new ApiError(409, "Você não pode remover seu próprio acesso admin nesta sessão.", {
        code: "LILY_ADMIN_SELF_LOCKOUT"
      });
    }

    const nextRole = input.role ?? target.role;
    const nextStatus = input.status ?? target.status;
    if (target.role === "admin" && target.status === "active"
      && (nextRole !== "admin" || nextStatus !== "active")) {
      await ensureAnotherActiveAdmin(target.id);
    }

    const roleChangedToPrivileged = target.role !== nextRole && ["staff", "admin"].includes(nextRole);
    const updated = await lilyPrisma.$transaction(async (tx) => {
      const user = await tx.lilyUser.update({
        where: { id },
        data: {
          ...(input.role === undefined ? {} : { role: input.role }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.role === "customer" ? { staffPasswordUpgradeRequired: false } : {}),
          ...(roleChangedToPrivileged ? { staffPasswordUpgradeRequired: true } : {})
        },
        include: {
          sessions: { where: { revokedAt: null }, select: { id: true } }
        }
      });
      if (input.status === "suspended" || (input.role !== undefined && input.role === "customer")) {
        await tx.lilySession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }
      return user;
    });

    await auditLilyAdmin(context.user.id, "team.update", "user", id, {
      fromRole: target.role,
      toRole: nextRole,
      fromStatus: target.status,
      toStatus: nextStatus
    });
    return serializeMember(updated);
  });
}
