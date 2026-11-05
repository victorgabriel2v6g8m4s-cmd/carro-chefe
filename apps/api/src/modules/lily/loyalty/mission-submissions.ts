import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../../lib/errors";
import { auditLilyAdmin, requireLilyStaff } from "../admin-security";
import { requireLilyCsrf, requireLilySession } from "../auth";
import { awardReachedLevelCoins, lilyMissionPeriodKey, loyaltySnapshot, progressPointsForUser } from "./service";

const uploadRoot = () => path.resolve(process.env.LILY_UPLOAD_DIR ?? path.resolve(process.cwd(), ".runtime/lily-acai/uploads"), "mission-evidence");
const imageExtensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const reviewSchema = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).nullable().optional() }).strict();
const fieldValue = (field: unknown) => typeof field === "object" && field !== null && "value" in field && typeof field.value === "string" ? field.value : "";
const currentMissionWindow = (cadence: string, now = new Date()) => {
  if (cadence === "daily") return `day:${now.toISOString().slice(0, 10)}`;
  if (cadence === "weekly") {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    return `week:${day.toISOString().slice(0, 10)}`;
  }
  if (cadence === "monthly") return `month:${now.toISOString().slice(0, 7)}`;
  return "once";
};

function hasImageSignature(mime: string, bytes: Buffer) {
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

async function requireMissionAudience(mission: { audienceJson: string }, userId: string) {
  const audience = z.object({ mode: z.string().default("all"), levels: z.array(z.string()).default([]), users: z.array(z.string()).default([]) }).passthrough().parse(JSON.parse(mission.audienceJson));
  if (audience.mode === "manual" && !audience.users.includes(userId)) throw new ApiError(404, "Missão não encontrada.");
  const membership = audience.mode === "vip" || audience.mode === "standard"
    ? await lilyPrisma.lilyVipMembership.findUnique({ where: { userId }, select: { status: true } })
    : null;
  if (audience.mode === "vip" && membership?.status !== "active" || audience.mode === "standard" && membership?.status === "active") throw new ApiError(404, "Missão não encontrada.");
  if (audience.levels.length) {
    const points = await progressPointsForUser(userId);
    const level = await lilyPrisma.lilyLevel.findFirst({ where: { active: true, requiredPoints: { lte: points } }, orderBy: { requiredPoints: "desc" }, select: { id: true } });
    if (!level || !audience.levels.includes(level.id)) throw new ApiError(404, "Missão não encontrada.");
  }
}

export async function lilyMissionSubmissionRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/customer/missions/:id/submissions", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const missionId = z.string().trim().min(1).max(80).parse((request.params as { id: string }).id);
    const mission = await lilyPrisma.lilyMission.findFirst({ where: { id: missionId, status: "published", approvalMode: "manual" } });
    if (!mission) throw new ApiError(404, "Missão manual não encontrada.");
    await requireMissionAudience(mission, context.user.id);
    const prerequisites = z.array(z.string().trim().min(1).max(120)).default([]).parse(JSON.parse(mission.prerequisiteJson));
    if (prerequisites.length) {
      const [pointClaims, coinClaims, completions] = await Promise.all([
        lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId: context.user.id, sourceKey: { startsWith: "mission:" } }, select: { sourceKey: true } }),
        lilyPrisma.lilyCoinEvent.findMany({ where: { userId: context.user.id, kind: "mission" }, select: { sourceKey: true } }),
        lilyPrisma.lilyMissionSubmission.findMany({ where: { userId: context.user.id, status: "approved", missionId: { in: prerequisites } }, select: { missionId: true } })
      ]);
      const claimed = new Set([...pointClaims, ...coinClaims].flatMap(({ sourceKey }) => { const match = sourceKey?.match(/^mission:([^:]+):user:/); return match ? [match[1]] : []; }));
      for (const completed of completions) claimed.add(completed.missionId);
      if (!prerequisites.every((requiredId) => claimed.has(requiredId))) throw new ApiError(409, "Conclua as missões anteriores para desbloquear esta missão.", { code: "LILY_MISSION_LOCKED" });
    }
    const part = await request.file({ limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 } });
    if (!part) throw new ApiError(400, "Anexe uma imagem para comprovar a missão.");
    const extension = imageExtensions[part.mimetype];
    if (!extension) throw new ApiError(400, "Anexe uma imagem JPEG, PNG ou WebP.");
    const username = fieldValue(part.fields.username).trim().replace(/^@/, "").slice(0, 80) || null;
    const evidenceText = fieldValue(part.fields.evidenceText).trim().slice(0, 1000) || null;
    if (!username && !evidenceText) throw new ApiError(400, "Informe seu usuário ou descreva onde a equipe pode verificar a comprovação.");
    const bytes = await part.toBuffer();
    if (!bytes.length || !hasImageSignature(part.mimetype, bytes)) throw new ApiError(400, "O arquivo não corresponde ao formato de imagem informado.");
    const periodKey = lilyMissionPeriodKey(mission.cadence);
    const [periodCount, allTimeCount, dayCount, weekCount, monthCount] = await Promise.all([
      lilyPrisma.lilyMissionSubmission.count({ where: { missionId, userId: context.user.id, periodKey, status: { in: ["pending", "approved"] } } }),
      mission.cadence === "perpetual" ? lilyPrisma.lilyMissionSubmission.count({ where: { missionId, userId: context.user.id, status: { in: ["pending", "approved"] } } }) : Promise.resolve(0),
      lilyPrisma.lilyMissionSubmission.count({ where: { missionId, userId: context.user.id, periodKey: currentMissionWindow("daily"), status: { in: ["pending", "approved"] } } }),
      lilyPrisma.lilyMissionSubmission.count({ where: { missionId, userId: context.user.id, periodKey: currentMissionWindow("weekly"), status: { in: ["pending", "approved"] } } }),
      lilyPrisma.lilyMissionSubmission.count({ where: { missionId, userId: context.user.id, periodKey: currentMissionWindow("monthly"), status: { in: ["pending", "approved"] } } })
    ]);
    if (mission.cadence === "perpetual" && allTimeCount || mission.cadence !== "perpetual" && periodCount) throw new ApiError(409, "Esta missão já foi enviada neste período.", { code: "LILY_MISSION_SUBMISSION_EXISTS" });
    if (mission.dailyLimit != null && dayCount >= mission.dailyLimit || mission.weeklyLimit != null && weekCount >= mission.weeklyLimit || mission.monthlyLimit != null && monthCount >= mission.monthlyLimit) throw new ApiError(429, "Você atingiu o limite de envios desta missão neste período.", { code: "LILY_MISSION_SUBMISSION_LIMIT" });
    const priorSubmission = await lilyPrisma.lilyMissionSubmission.findFirst({ where: { missionId, userId: context.user.id, periodKey, status: { in: ["pending", "approved"] } }, select: { id: true, status: true } });
    if (priorSubmission) throw new ApiError(409, priorSubmission.status === "pending" ? "Sua comprovação já está aguardando análise." : "Esta missão já foi aprovada neste período.", { code: "LILY_MISSION_SUBMISSION_EXISTS" });
    const storageName = `${crypto.randomUUID()}${extension}`;
    const root = uploadRoot();
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, storageName), bytes, { flag: "wx", mode: 0o600 });
    try {
      const submission = await lilyPrisma.lilyMissionSubmission.create({ data: {
        id: crypto.randomUUID(), missionId, userId: context.user.id, periodKey, username, evidenceText,
        storageName, originalName: path.basename(part.filename || `comprovacao${extension}`).slice(0, 120), mime: part.mimetype, size: bytes.length
      }, select: { id: true, status: true, submittedAt: true } });
      return reply.code(201).send({ submission });
    } catch (error) {
      await fs.unlink(path.join(root, storageName)).catch(() => undefined);
      throw error;
    }
  });

  app.get("/api/v1/lily/admin/missions/submissions", async (request) => {
    await requireLilyStaff(request);
    const query = z.object({ status: z.enum(["pending", "approved", "rejected"]).default("pending"), limit: z.coerce.number().int().min(1).max(100).default(30), offset: z.coerce.number().int().min(0).max(100_000).default(0) }).parse(request.query);
    const [rows, total] = await Promise.all([
      lilyPrisma.lilyMissionSubmission.findMany({ where: { status: query.status }, orderBy: { submittedAt: "asc" }, take: query.limit, skip: query.offset, include: { mission: { select: { id: true, title: true, points: true, lilyCoins: true, cadence: true } }, user: { select: { id: true, displayName: true } } } }),
      lilyPrisma.lilyMissionSubmission.count({ where: { status: query.status } })
    ]);
    return { submissions: rows.map(({ storageName: _storage, mime: _mime, size, ...row }) => ({ ...row, evidenceUrl: `/api/v1/lily/admin/missions/submissions/${row.id}/evidence`, size })), total, limit: query.limit, offset: query.offset };
  });

  app.get("/api/v1/lily/admin/missions/submissions/:id/evidence", async (request, reply) => {
    await requireLilyStaff(request);
    const id = z.string().trim().min(1).max(80).parse((request.params as { id: string }).id);
    const submission = await lilyPrisma.lilyMissionSubmission.findUnique({ where: { id }, select: { storageName: true, originalName: true, mime: true } });
    if (!submission || path.basename(submission.storageName) !== submission.storageName) throw new ApiError(404, "Comprovação não encontrada.");
    let bytes: Buffer;
    try { bytes = await fs.readFile(path.join(uploadRoot(), submission.storageName)); }
    catch { throw new ApiError(404, "Arquivo da comprovação não encontrado."); }
    return reply.type(submission.mime).header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "default-src 'none'; sandbox").header("Content-Disposition", `inline; filename="${submission.originalName.replace(/[\"\r\n]/g, "_")}"`).send(bytes);
  });

  app.patch("/api/v1/lily/admin/missions/submissions/:id", async (request) => {
    const actor = await requireLilyStaff(request, true);
    const id = z.string().trim().min(1).max(80).parse((request.params as { id: string }).id);
    const input = reviewSchema.parse(request.body);
    const submission = await lilyPrisma.lilyMissionSubmission.findUnique({ where: { id }, include: { mission: true } });
    if (!submission) throw new ApiError(404, "Comprovação não encontrada.");
    if (submission.status !== "pending") throw new ApiError(409, "Esta comprovação já foi analisada.", { code: "LILY_MISSION_SUBMISSION_REVIEWED" });
    if (input.decision === "approved") {
      const existingApproval = await lilyPrisma.lilyMissionSubmission.findFirst({ where: { id: { not: id }, missionId: submission.missionId, userId: submission.userId, periodKey: submission.periodKey, status: "approved" }, select: { id: true } });
      if (existingApproval) throw new ApiError(409, "Já existe uma comprovação aprovada para esta missão neste período.", { code: "LILY_MISSION_SUBMISSION_ALREADY_APPROVED" });
    }
    const now = new Date();
    const priorPoints = input.decision === "approved" ? await progressPointsForUser(submission.userId) : 0;
    const result = await lilyPrisma.$transaction(async (tx) => {
      const updated = await tx.lilyMissionSubmission.updateMany({ where: { id, status: "pending" }, data: {
        status: input.decision, reviewNote: input.note ?? null, reviewedByUserId: actor.user.id, reviewedAt: now
      } });
      if (updated.count !== 1) throw new ApiError(409, "Esta comprovação foi analisada em outra sessão.", { code: "LILY_MISSION_SUBMISSION_REVIEWED" });
      if (input.decision === "approved") {
        const sourceKey = `mission:${submission.missionId}:user:${submission.userId}:period:${submission.periodKey}`;
        if (submission.mission.points > 0) await tx.lilyLoyaltyEvent.upsert({ where: { sourceKey }, update: {}, create: { userId: submission.userId, type: "mission_reward", points: submission.mission.points, sourceKey, metadataJson: JSON.stringify({ missionId: submission.missionId, periodKey: submission.periodKey, submissionId: id }) } });
        if (submission.mission.lilyCoins > 0) await tx.lilyCoinEvent.upsert({ where: { sourceKey }, update: {}, create: { id: crypto.randomUUID(), userId: submission.userId, amount: submission.mission.lilyCoins, kind: "mission", sourceKey, metadataJson: JSON.stringify({ missionId: submission.missionId, periodKey: submission.periodKey, submissionId: id }) } });
        if (submission.mission.points > 0) await awardReachedLevelCoins(submission.userId, priorPoints, priorPoints + submission.mission.points, tx);
      }
      await tx.lilyCustomerNotification.create({ data: {
        userId: submission.userId, sourceKey: `mission-submission:${id}:reviewed`, type: "mission",
        title: input.decision === "approved" ? "Missão aprovada" : "Comprovação analisada",
        body: input.decision === "approved" ? `Você concluiu a missão ${submission.mission.title}.` : `A equipe analisou a missão ${submission.mission.title}.` ,
        metadataJson: JSON.stringify({ missionId: submission.missionId, submissionId: id, decision: input.decision, reviewNote: input.note ?? null })
      } });
      return tx.lilyMissionSubmission.findUnique({ where: { id }, select: { id: true, status: true, reviewNote: true, reviewedAt: true } });
    }, { isolationLevel: "Serializable" });
    await auditLilyAdmin(actor.user.id, "review", "mission-submission", id, { missionId: submission.missionId, userId: submission.userId, decision: input.decision });
    return { submission: result, ...(input.decision === "approved" ? { loyalty: await loyaltySnapshot(submission.userId) } : {}) };
  });
}
