import type { FastifyInstance } from "fastify";
import { lilyPrisma } from "@lily-acai/database";
import { z } from "zod";
import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { ApiError, parseJson } from "../../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "../admin-security";
import { requireLilyCsrf, requireLilySession } from "../auth";
import { questionAnswerIsPresent, normalizeDefinition, surveyDefinitionSchema, validateSurveyAnswers, visibleSurveyQuestions, type SurveyDefinition } from "./contracts";
import { MAX_QUESTION_TIME_MS, mergeQuestionTimes, questionMetricKey, questionAnswered, selectedSurveyOptions } from "./analytics";

const idSchema = z.string().trim().min(1).max(80);
const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).default(0) });
const answersSchema = z.record(z.string(), z.unknown()).refine((answers) => Object.keys(answers).length <= 100, "Máximo de 100 respostas.");
const questionTimesSchema = z.record(z.string().trim().min(1).max(80), z.number().int().min(0).max(MAX_QUESTION_TIME_MS)).refine((times) => Object.keys(times).length <= 100, "Máximo de 100 tempos por pergunta.");
const submitSchema = z.object({ participationId: idSchema, answers: answersSchema, questionTimesMs: questionTimesSchema.default({}), consentToLinkAnswers: z.boolean() }).strict();
const missionSchema = z.object({ title: z.string().trim().min(1).max(180), description: z.string().max(2000).optional().nullable(), points: z.number().int().min(0).max(100000), prerequisites: z.array(idSchema).max(100).default([]) }).strict();
const SURVEY_OPTION_MEDIA = new Map([["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"], ["video/mp4", ".mp4"], ["video/webm", ".webm"]]);
const MAX_SURVEY_OPTION_MEDIA_BYTES = 10 * 1024 * 1024;

function hasExpectedMediaSignature(mime: string, buffer: Buffer) {
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mime === "video/mp4") return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}

function definitionOf(row: { formJson: string; title: string; subtitle: string | null; description: string | null; prerequisitesJson: string; unlocksMissionsJson: string; pointsPerForm: number; pointsPerAnswer: number; showPoints: boolean; allowNavigation: boolean; mediaMimeTypesJson: string; mediaMaxBytes: number; estimatedMinutes: number }): SurveyDefinition {
  return surveyDefinitionSchema.parse({
    ...parseJson<Partial<SurveyDefinition>>(row.formJson, {}), title: row.title, subtitle: row.subtitle, description: row.description,
    prerequisites: parseJson(row.prerequisitesJson, []), unlocksMissions: parseJson(row.unlocksMissionsJson, []),
    pointsPerForm: row.pointsPerForm, pointsPerAnswer: row.pointsPerAnswer, showPoints: row.showPoints,
    allowNavigation: row.allowNavigation, mediaMimeTypes: parseJson(row.mediaMimeTypesJson, []), mediaMaxBytes: row.mediaMaxBytes,
    estimatedMinutes: row.estimatedMinutes
  });
}

function surveyData(definition: SurveyDefinition) {
  const safe = normalizeDefinition(definition);
  const { title, subtitle, description, prerequisites, unlocksMissions, pointsPerForm, pointsPerAnswer, showPoints, allowNavigation, mediaMimeTypes, mediaMaxBytes, estimatedMinutes, questions } = safe;
  return {
    title, subtitle: subtitle || null, description: description || null, prerequisitesJson: JSON.stringify(prerequisites),
    unlocksMissionsJson: JSON.stringify(unlocksMissions), pointsPerForm, pointsPerAnswer, showPoints,
    allowNavigation, mediaMimeTypesJson: JSON.stringify(mediaMimeTypes), mediaMaxBytes, estimatedMinutes,
    formJson: JSON.stringify({ questions })
  };
}

async function findSurveyByPublicReference(reference: string) {
  return lilyPrisma.lilySurvey.findFirst({ where: { OR: [{ id: reference }, { publicToken: reference }] } });
}

async function completedSurveyIds(userId: string) {
  const completed = await lilyPrisma.lilySurveyParticipation.findMany({ where: { userId, status: "completed" }, select: { surveyId: true } });
  return new Set(completed.map((row) => row.surveyId));
}

function surveyUnlocked(prerequisitesJson: string, completed: Set<string>) {
  return parseJson<string[]>(prerequisitesJson, []).every((id) => completed.has(id));
}

async function currentPoints(userId: string) {
  const events = await lilyPrisma.lilyLoyaltyEvent.findMany({ where: { userId }, select: { points: true } });
  return events.reduce((total, event) => total + event.points, 0);
}

function serializePublicSurvey(row: { id: string; title: string; subtitle: string | null; description: string | null; formJson: string; showPoints: boolean; pointsPerForm: number; pointsPerAnswer: number; allowNavigation: boolean; version: number; estimatedMinutes: number }, definition: SurveyDefinition) {
  return {
    id: row.id, title: row.title, subtitle: row.subtitle, description: row.description,
    questions: definition.questions, showPoints: row.showPoints,
    pointsPerForm: row.showPoints ? row.pointsPerForm : null,
    pointsPerAnswer: row.showPoints ? row.pointsPerAnswer : null,
    allowNavigation: row.allowNavigation, estimatedMinutes: row.estimatedMinutes,
    rewardPoints: row.showPoints ? row.pointsPerForm + row.pointsPerAnswer * definition.questions.length : null,
    version: row.version
  };
}

function serializeSurveyPreview(row: { title: string; subtitle: string | null; description: string | null; showPoints: boolean; pointsPerForm: number; pointsPerAnswer: number; estimatedMinutes: number }, questionCount: number) {
  return { title: row.title, subtitle: row.subtitle, description: row.description, estimatedMinutes: row.estimatedMinutes, questionCount, points: row.showPoints ? row.pointsPerForm + row.pointsPerAnswer * questionCount : null, showPoints: row.showPoints };
}

export async function lilySurveyRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/public/surveys/:token/preview", async (request, reply) => {
    const token = idSchema.parse((request.params as { token: string }).token);
    const survey = await lilyPrisma.lilySurvey.findFirst({ where: { publicToken: token, status: "published" } });
    if (!survey) throw new ApiError(404, "Pesquisa não encontrada.");
    const definition = definitionOf(survey);
    reply.header("Cache-Control", "private, no-store");
    return { survey: serializeSurveyPreview(survey, definition.questions.length) };
  });
  app.post("/api/v1/lily/admin/survey-option-media", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const context = await requireLilyStaff(request, true);
    const part = await request.file();
    if (!part) throw new ApiError(400, "Selecione uma imagem ou vídeo para a opção.");
    const extension = SURVEY_OPTION_MEDIA.get(part.mimetype);
    if (!extension) throw new ApiError(400, "Use uma imagem JPEG, PNG, WebP ou um vídeo MP4/WebM.");
    const buffer = await part.toBuffer();
    if (!buffer.length || buffer.length > MAX_SURVEY_OPTION_MEDIA_BYTES) throw new ApiError(400, "A mídia está vazia ou ultrapassa o limite de 10 MB.");
    if (!hasExpectedMediaSignature(part.mimetype, buffer)) throw new ApiError(400, "O conteúdo do arquivo não corresponde ao tipo de mídia selecionado.");
    const mediaId = crypto.randomUUID();
    const root = path.resolve(process.env.LILY_UPLOAD_DIR ?? path.resolve(process.cwd(), ".runtime/lily-acai/uploads"), "survey-options");
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, `${mediaId}${extension}`), buffer, { flag: "wx" });
    await auditLilyAdmin(context.user.id, "upload", "survey_option_media", mediaId, { mime: part.mimetype, size: buffer.length });
    return reply.code(201).send({ url: `/api/v1/lily/survey-option-media/${mediaId}${extension}`, type: part.mimetype.startsWith("video/") ? "video" : "image", mime: part.mimetype, size: buffer.length });
  });

  app.get("/api/v1/lily/survey-option-media/:mediaFile", async (request, reply) => {
    await requireLilySession(request);
    const mediaFile = z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$/i).parse((request.params as { mediaFile: string }).mediaFile);
    const extension = path.extname(mediaFile).toLowerCase();
    const mime = [...SURVEY_OPTION_MEDIA.entries()].find(([, allowedExtension]) => allowedExtension === extension)?.[0];
    if (!mime) throw new ApiError(404, "Mídia da opção não encontrada.");
    const root = path.resolve(process.env.LILY_UPLOAD_DIR ?? path.resolve(process.cwd(), ".runtime/lily-acai/uploads"), "survey-options");
    let buffer: Buffer;
    try { buffer = await fs.readFile(path.join(root, mediaFile)); }
    catch { throw new ApiError(404, "Mídia da opção não encontrada."); }
    return reply.type(mime).header("Cache-Control", "private, max-age=86400").header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "default-src 'none'; sandbox").header("Content-Disposition", "inline").send(buffer);
  });

  app.post("/api/v1/lily/surveys/:id/uploads", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const reference = idSchema.parse((request.params as { id: string }).id);
    const part = await request.file();
    if (!part) throw new ApiError(400, "Selecione um arquivo para anexar.");
    const maxAllowed = Math.min(Number(process.env.LILY_SURVEY_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024), 10 * 1024 * 1024);
    const allowed = new Set((process.env.LILY_SURVEY_UPLOAD_MIME_TYPES ?? "image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/mp4,video/mp4").split(",").map((mime) => mime.trim()).filter(Boolean));
    if (!allowed.has(part.mimetype)) throw new ApiError(400, "Este tipo de arquivo não é permitido.");
    const buffer = await part.toBuffer();
    if (!buffer.length || buffer.length > maxAllowed) throw new ApiError(400, "Arquivo vazio ou acima do limite permitido.");
    const survey = await findSurveyByPublicReference(reference);
    const id = survey?.id ?? reference;
    const participation = await lilyPrisma.lilySurveyParticipation.findFirst({ where: { userId: context.user.id, surveyId: id, status: "in_progress" } });
    if (!survey || !["published", "paused"].includes(survey.status) || !participation) throw new ApiError(404, "Sessão da pesquisa não encontrada.");
    const definition = definitionOf(survey);
    const questionId = String((part.fields.questionId as { value?: string } | undefined)?.value ?? "");
    const question = definition.questions.find((item) => item.id === questionId);
    const config = question?.media;
    if (!question || !["media", "free_text"].includes(question.type) || !config || !config.mimeTypes.includes(part.mimetype) || !definition.mediaMimeTypes.includes(part.mimetype) || buffer.length > config.maxBytes || buffer.length > definition.mediaMaxBytes) throw new ApiError(400, "O arquivo não corresponde às regras desta pergunta.");
    const idToken = crypto.randomUUID();
    const storageName = `${idToken}${path.extname(part.filename || "").toLowerCase().slice(0, 8)}`;
    const root = path.resolve(process.env.LILY_UPLOAD_DIR ?? path.resolve(process.cwd(), ".runtime/lily-acai/uploads"), "surveys");
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, storageName), buffer, { flag: "wx" });
    const upload = await lilyPrisma.lilySurveyUpload.create({ data: { id: idToken, participationId: participation.id, userId: context.user.id, questionId, storageName, originalName: path.basename(part.filename || "anexo"), mime: part.mimetype, size: buffer.length } });
    return reply.code(201).send({ uploadId: upload.id, name: upload.originalName, mime: upload.mime, size: upload.size });
  });

  app.get("/api/v1/lily/surveys", async (request) => {
    const context = await requireLilySession(request);
    const completed = await completedSurveyIds(context.user.id);
    const rows = await lilyPrisma.lilySurvey.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 100 });
    const surveys = rows.filter((row) => !completed.has(row.id) && surveyUnlocked(row.prerequisitesJson, completed)).map((row) => {
      const definition = definitionOf(row);
      return { id: row.publicToken ?? row.id, title: row.title, subtitle: row.subtitle, description: row.description, questionCount: definition.questions.length, estimatedMinutes: row.estimatedMinutes, showPoints: row.showPoints, points: row.showPoints ? row.pointsPerForm + row.pointsPerAnswer * definition.questions.length : null };
    });
    const points = await currentPoints(context.user.id);
    return { surveys, points };
  });

  app.post("/api/v1/lily/surveys/:id/start", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const reference = idSchema.parse((request.params as { id: string }).id);
    const { viewId: requestedViewId } = z.object({ viewId: z.string().uuid().optional() }).strict().parse(request.body ?? {});
    const survey = await findSurveyByPublicReference(reference);
    if (!survey || survey.status !== "published") throw new ApiError(404, "Pesquisa não encontrada.");
    const id = survey.id;
    const completed = await completedSurveyIds(context.user.id);
    if (!surveyUnlocked(survey.prerequisitesJson, completed)) throw new ApiError(403, "Conclua as pesquisas anteriores para desbloquear esta.");
    const definition = definitionOf(survey);
    const existing = await lilyPrisma.lilySurveyParticipation.findUnique({ where: { userId_surveyId_surveyVersion: { userId: context.user.id, surveyId: survey.id, surveyVersion: survey.version } } });
    if (existing?.status === "completed") throw new ApiError(409, "Esta pesquisa já foi respondida.");
    const participation = existing ?? await lilyPrisma.lilySurveyParticipation.create({ data: { userId: context.user.id, surveyId: survey.id, surveyVersion: survey.version } });
    const viewId = requestedViewId ?? crypto.randomUUID();
    await lilyPrisma.lilySurveyView.upsert({ where: { surveyId_viewId: { surveyId: survey.id, viewId } }, update: {}, create: { id: crypto.randomUUID(), surveyId: survey.id, viewId } });
    return { participationId: participation.id, currentPoints: await currentPoints(context.user.id), survey: serializePublicSurvey(survey, definition), questionTimesMs: parseJson<Record<string, number>>(participation.questionTimesJson, {}), progressTarget: null };
  });

  app.get("/api/v1/lily/notifications", async (request) => {
    const context = await requireLilySession(request);
    const { limit, offset } = pageSchema.parse(request.query);
    const [rows, unreadCount] = await Promise.all([
      lilyPrisma.lilyCustomerNotification.findMany({ where: { userId: context.user.id }, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      lilyPrisma.lilyCustomerNotification.count({ where: { userId: context.user.id, readAt: null } })
    ]);
    return { notifications: rows.map((row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, metadata: parseJson(row.metadataJson, {}), readAt: row.readAt, createdAt: row.createdAt })), unreadCount, limit, offset };
  });

  app.post("/api/v1/lily/notifications/:id/read", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const id = idSchema.parse((request.params as { id: string }).id);
    await lilyPrisma.lilyCustomerNotification.updateMany({ where: { id, userId: context.user.id, readAt: null }, data: { readAt: new Date() } });
    return { read: true };
  });

  app.post("/api/v1/lily/surveys/:id/progress", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const reference = idSchema.parse((request.params as { id: string }).id);
    const body = z.object({ participationId: idSchema, answers: answersSchema, questionTimesMs: questionTimesSchema.default({}) }).strict().parse(request.body);
    const survey = await findSurveyByPublicReference(reference);
    const id = survey?.id ?? reference;
    const participation = await lilyPrisma.lilySurveyParticipation.findFirst({ where: { id: body.participationId, userId: context.user.id, surveyId: id, status: "in_progress" } });
    if (!survey || !participation) throw new ApiError(404, "Sessão da pesquisa não encontrada.");
    const definition = definitionOf(survey);
    const visibleQuestions = visibleSurveyQuestions(definition, body.answers);
    const answered = visibleQuestions.filter((question) => questionAnswerIsPresent(question, body.answers[question.id])).length;
    const progressPercent = Math.round(answered / visibleQuestions.length * 100);
    const questionTimesMs = mergeQuestionTimes(definition, parseJson(participation.questionTimesJson, {}), body.questionTimesMs);
    await lilyPrisma.lilySurveyParticipation.update({ where: { id: participation.id }, data: { progressPercent, questionTimesJson: JSON.stringify(questionTimesMs) } });
    return { progressPercent, questionTimesMs };
  });

  app.post("/api/v1/lily/surveys/:id/submit", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const reference = idSchema.parse((request.params as { id: string }).id);
    const input = submitSchema.parse(request.body);
    const survey = await findSurveyByPublicReference(reference);
    const id = survey?.id ?? reference;
    const participation = await lilyPrisma.lilySurveyParticipation.findFirst({ where: { id: input.participationId, userId: context.user.id, surveyId: id, status: "in_progress" } });
    if (!survey || !["published", "paused"].includes(survey.status) || !participation || survey.version !== participation.surveyVersion) throw new ApiError(409, "A pesquisa mudou ou foi encerrada. Atualize a página e tente novamente.");
    const definition = definitionOf(survey);
    const invalidQuestionId = validateSurveyAnswers(definition, input.answers);
    if (invalidQuestionId) throw new ApiError(400, "Revise as respostas obrigatórias da pesquisa.", { questionId: invalidQuestionId });
    const visibleQuestions = visibleSurveyQuestions(definition, input.answers);
    const answeredCount = visibleQuestions.filter((question) => questionAnswerIsPresent(question, input.answers[question.id])).length;
    const answerPoints = Math.max(0, answeredCount * survey.pointsPerAnswer);
    const awarded = answerPoints + survey.pointsPerForm;
    const sourceKey = `survey:${survey.id}:v${survey.version}:user:${context.user.id}`;
    const now = new Date();
    const visibleIds = new Set(visibleQuestions.map(({ id: questionId }) => questionId));
    const safeAnswers = Object.fromEntries(Object.entries(input.answers).filter(([key]) => visibleIds.has(key)));
    const questionTimesMs = mergeQuestionTimes(definition, parseJson(participation.questionTimesJson, {}), input.questionTimesMs);
    const uploadIds = visibleQuestions.flatMap((question) => {
      const answer = safeAnswers[question.id];
      if (question.type === "media" && answer && typeof answer === "object" && !Array.isArray(answer) && typeof (answer as Record<string, unknown>).uploadId === "string") return [{ id: (answer as Record<string, string>).uploadId, questionId: question.id }];
      if (question.type === "free_text" && question.media && answer && typeof answer === "object" && !Array.isArray(answer)) {
        const upload = (answer as Record<string, unknown>).upload as Record<string, unknown> | undefined;
        if (typeof upload?.uploadId === "string") return [{ id: upload.uploadId, questionId: question.id }];
      }
      return [];
    });
    for (const upload of uploadIds) {
      const saved = await lilyPrisma.lilySurveyUpload.findFirst({ where: { id: upload.id, participationId: participation.id, userId: context.user.id, questionId: upload.questionId } });
      if (!saved) throw new ApiError(400, "Um anexo não corresponde a esta sessão da pesquisa.");
    }
    await lilyPrisma.$transaction(async (tx) => {
      const claimed = await tx.lilySurveyParticipation.updateMany({ where: { id: participation.id, userId: context.user.id, status: "in_progress", surveyVersion: survey.version }, data: { status: "completed", progressPercent: 100, pointsAwarded: awarded, completedAt: now, questionTimesJson: JSON.stringify(questionTimesMs) } });
      if (claimed.count !== 1) throw new ApiError(409, "Esta pesquisa já foi concluída nesta sessão.");
      if (input.consentToLinkAnswers) {
        await tx.lilyConsentRecord.create({ data: { userId: context.user.id, purpose: "survey_answers", version: "survey-answers-v1", granted: true, source: "survey_submit", recordedAt: now } });
      }
      await tx.lilySurveyResponse.create({ data: { surveyId: survey.id, surveyVersion: survey.version, respondentUserId: input.consentToLinkAnswers ? context.user.id : null, respondentConsented: input.consentToLinkAnswers, answersJson: JSON.stringify(safeAnswers), submittedAt: now } });
      for (const question of visibleQuestions) {
        const answer = safeAnswers[question.id];
        if (!questionAnswered(question, answer)) continue;
        const time = questionTimesMs[question.id] ?? 0;
        const baseMetric = { surveyId: survey.id, surveyVersion: survey.version, questionId: question.id };
        await tx.lilySurveyQuestionMetric.upsert({
          where: { surveyId_surveyVersion_questionId_optionKey: { ...baseMetric, optionKey: "question:answered" } },
          create: { id: crypto.randomUUID(), ...baseMetric, optionKey: "question:answered", optionLabel: "", selectedCount: 1, timeTotalMs: time, timeSamples: time > 0 ? 1 : 0 },
          update: { selectedCount: { increment: 1 }, timeTotalMs: { increment: time }, ...(time > 0 ? { timeSamples: { increment: 1 } } : {}) }
        });
        for (const option of new Set(selectedSurveyOptions(question, answer))) {
          const optionKey = questionMetricKey(option);
          await tx.lilySurveyQuestionMetric.upsert({
            where: { surveyId_surveyVersion_questionId_optionKey: { ...baseMetric, optionKey } },
            create: { id: crypto.randomUUID(), ...baseMetric, optionKey, optionLabel: option, selectedCount: 1 },
            update: { selectedCount: { increment: 1 } }
          });
        }
      }
      if (awarded > 0) {
        await tx.lilyLoyaltyEvent.upsert({ where: { sourceKey }, update: {}, create: { userId: context.user.id, type: "survey_reward", points: awarded, sourceKey, metadataJson: JSON.stringify({ surveyId: survey.id, version: survey.version }) } });
      }
    });
    const unlockedMissions = await lilyPrisma.lilyMission.findMany({ where: { id: { in: definition.unlocksMissions }, status: "published" }, select: { id: true, title: true, description: true, points: true } });
    return { completed: true, pointsAwarded: awarded, currentPoints: await currentPoints(context.user.id), unlockedMissions };
  });

  app.get("/api/v1/lily/admin/surveys", async (request) => {
    await requireLilyStaff(request);
    const { limit, offset } = pageSchema.parse(request.query);
    const [rows, total] = await Promise.all([
      lilyPrisma.lilySurvey.findMany({ orderBy: { updatedAt: "desc" }, take: limit, skip: offset, include: { _count: { select: { views: true, responses: true } } } }),
      lilyPrisma.lilySurvey.count()
    ]);
    return { surveys: rows.map(({ _count, ...row }) => ({ id: row.id, publicToken: row.publicToken, title: row.title, subtitle: row.subtitle, description: row.description, status: row.status, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt, publishedAt: row.publishedAt, viewCount: _count.views, responseCount: _count.responses, definition: definitionOf(row) })), total, limit, offset };
  });

  app.get("/api/v1/lily/admin/surveys/:id/analytics", async (request) => {
    await requireLilyStaff(request);
    const id = idSchema.parse((request.params as { id: string }).id);
    const survey = await lilyPrisma.lilySurvey.findUnique({ where: { id } });
    if (!survey) throw new ApiError(404, "Pesquisa não encontrada.");
    const [views, responses, metrics] = await Promise.all([
      lilyPrisma.lilySurveyView.count({ where: { surveyId: id } }),
      lilyPrisma.lilySurveyResponse.count({ where: { surveyId: id } }),
      lilyPrisma.lilySurveyQuestionMetric.findMany({ where: { surveyId: id }, orderBy: [{ questionId: "asc" }, { optionLabel: "asc" }] })
    ]);
    const definition = definitionOf(survey);
    return {
      surveyId: id,
      survey: { id: survey.id, title: survey.title, status: survey.status, definition },
      views,
      responses,
      questions: definition.questions.map((question) => {
        const questionMetrics = metrics.filter((metric) => metric.questionId === question.id);
        const answered = questionMetrics.find((metric) => metric.optionKey === "question:answered");
        return {
          questionId: question.id,
          answered: answered?.selectedCount ?? 0,
          averageTimeMs: answered?.timeSamples ? Math.round(answered.timeTotalMs / answered.timeSamples) : null,
          options: questionMetrics.filter((metric) => metric.optionKey.startsWith("option:")).map(({ optionLabel, selectedCount }) => ({ label: optionLabel, count: selectedCount }))
        };
      })
    };
  });

  app.post("/api/v1/lily/admin/surveys", async (request) => {
    const context = await requireLilyStaff(request, true);
    const input = surveyDefinitionSchema.parse(request.body);
    const row = await lilyPrisma.lilySurvey.create({ data: { ...surveyData(input), publicToken: crypto.randomBytes(32).toString("base64url"), createdByUserId: context.user.id } });
    await auditLilyAdmin(context.user.id, "create", "survey", row.id, { version: row.version });
    return { survey: row };
  });

  app.put("/api/v1/lily/admin/surveys/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const id = idSchema.parse((request.params as { id: string }).id);
    const input = surveyDefinitionSchema.parse(request.body);
    const current = await lilyPrisma.lilySurvey.findUnique({ where: { id } });
    if (!current || !["draft", "paused"].includes(current.status)) throw new ApiError(409, "Para editar uma pesquisa publicada, pause-a primeiro. Pesquisas canceladas não podem ser editadas.");
    if (current.status === "paused") {
      const activeParticipations = await lilyPrisma.lilySurveyParticipation.count({ where: { surveyId: id, surveyVersion: current.version, status: "in_progress" } });
      if (activeParticipations > 0) throw new ApiError(409, `Ainda há ${activeParticipations} resposta(s) em andamento. Aguarde a conclusão antes de editar a pesquisa pausada.`);
    }
    const updated = await lilyPrisma.lilySurvey.updateMany({ where: { id, status: current.status, version: current.version }, data: { ...surveyData(input), version: { increment: 1 } } });
    if (updated.count !== 1) throw new ApiError(409, "A pesquisa mudou durante a edição. Atualize o painel e tente novamente.");
    const survey = await lilyPrisma.lilySurvey.findUniqueOrThrow({ where: { id } });
    await auditLilyAdmin(context.user.id, "update", "survey", id, { version: survey.version });
    return { survey };
  });

  app.post("/api/v1/lily/admin/surveys/:id/pause", async (request) => {
    const context = await requireLilyStaff(request, true);
    const id = idSchema.parse((request.params as { id: string }).id);
    const changed = await lilyPrisma.lilySurvey.updateMany({ where: { id, status: "published" }, data: { status: "paused" } });
    if (changed.count !== 1) throw new ApiError(409, "Somente pesquisas publicadas podem ser pausadas.");
    const survey = await lilyPrisma.lilySurvey.findUniqueOrThrow({ where: { id } });
    await auditLilyAdmin(context.user.id, "pause", "survey", id, { version: survey.version });
    return { survey };
  });

  app.post("/api/v1/lily/admin/surveys/:id/resume", async (request) => {
    const context = await requireLilyStaff(request, true);
    const id = idSchema.parse((request.params as { id: string }).id);
    const changed = await lilyPrisma.lilySurvey.updateMany({ where: { id, status: "paused" }, data: { status: "published", publishedAt: new Date() } });
    if (changed.count !== 1) throw new ApiError(409, "Somente pesquisas pausadas podem ser retomadas.");
    const survey = await lilyPrisma.lilySurvey.findUniqueOrThrow({ where: { id } });
    await auditLilyAdmin(context.user.id, "resume", "survey", id, { version: survey.version });
    return { survey };
  });

  app.delete("/api/v1/lily/admin/surveys/:id", async (request) => {
    const context = await requireLilyStaff(request, true);
    const id = idSchema.parse((request.params as { id: string }).id);
    const survey = await lilyPrisma.$transaction(async (tx) => {
      const changed = await tx.lilySurvey.updateMany({ where: { id, status: { in: ["draft", "published", "paused"] } }, data: { status: "cancelled" } });
      if (changed.count !== 1) throw new ApiError(409, "Esta pesquisa já foi excluída ou não pode ser excluída.");
      await tx.lilySurveyParticipation.updateMany({ where: { surveyId: id, status: "in_progress" }, data: { status: "cancelled" } });
      return tx.lilySurvey.findUniqueOrThrow({ where: { id } });
    });
    await auditLilyAdmin(context.user.id, "cancel", "survey", id, { version: survey.version });
    return { survey };
  });

  app.post("/api/v1/lily/admin/surveys/:id/publish", async (request) => {
    const context = await requireLilyStaff(request, true);
    const id = idSchema.parse((request.params as { id: string }).id);
    const survey = await lilyPrisma.lilySurvey.findUnique({ where: { id } });
    if (!survey) throw new ApiError(404, "Pesquisa não encontrada.");
    const definition = definitionOf(survey);
    const missingMission = definition.unlocksMissions.length ? await lilyPrisma.lilyMission.count({ where: { id: { in: definition.unlocksMissions } } }) !== definition.unlocksMissions.length : false;
    if (missingMission) throw new ApiError(400, "Uma missão configurada para desbloqueio não existe.");
    const now = new Date();
    const points = survey.showPoints ? survey.pointsPerForm + survey.pointsPerAnswer * definition.questions.length : null;
    const published = await lilyPrisma.$transaction(async (tx) => {
      const claimed = await tx.lilySurvey.updateMany({ where: { id, status: "draft" }, data: { status: "published", publishedAt: now } });
      if (claimed.count !== 1) throw new ApiError(409, "Esta pesquisa já foi publicada ou não pode ser publicada.");
      const customers = await tx.lilyUser.findMany({ where: { role: "customer", status: "active" }, select: { id: true } });
      const sourceKey = `survey-published:${survey.id}:v${survey.version}`;
      const title = "Temos uma nova pesquisa para você!";
      const pointText = points && points > 0 ? ` Ela pode render ${points.toLocaleString("pt-BR")} pontos.` : "";
      const body = `Responda “${survey.title}” em cerca de ${survey.estimatedMinutes} min.${pointText}`;
      for (let offset = 0; offset < customers.length; offset += 80) {
        await tx.lilyCustomerNotification.createMany({ data: customers.slice(offset, offset + 80).map(({ id: userId }) => ({ userId, sourceKey, type: "survey_available", title, body, metadataJson: JSON.stringify({ surveyId: survey.publicToken ?? survey.id, surveyTitle: survey.title, estimatedMinutes: survey.estimatedMinutes, questionCount: definition.questions.length, points }) })) });
      }
      return tx.lilySurvey.findUniqueOrThrow({ where: { id } });
    });
    await auditLilyAdmin(context.user.id, "publish", "survey", id, { version: published.version });
    return { survey: published };
  });

  app.get("/api/v1/lily/admin/surveys/:id/responses", async (request) => {
    await requireLilyStaff(request);
    const id = idSchema.parse((request.params as { id: string }).id);
    const { limit, offset } = pageSchema.parse(request.query);
    const [rows, total] = await Promise.all([
      lilyPrisma.lilySurveyResponse.findMany({ where: { surveyId: id }, orderBy: { submittedAt: "desc" }, take: limit, skip: offset, include: { respondent: { select: { id: true, displayName: true, phoneNormalized: true } } } }),
      lilyPrisma.lilySurveyResponse.count({ where: { surveyId: id } })
    ]);
    return { responses: rows.map((row) => ({ id: row.id, submittedAt: row.submittedAt, surveyVersion: row.surveyVersion, consented: row.respondentConsented, respondent: row.respondentConsented ? row.respondent : null, answers: parseJson(row.answersJson, {}) })), total, limit, offset };
  });

  app.get("/api/v1/lily/admin/missions", async (request) => {
    await requireLilyStaff(request);
    const { limit, offset } = pageSchema.parse(request.query);
    const [missions, total] = await Promise.all([lilyPrisma.lilyMission.findMany({ orderBy: { createdAt: "desc" }, take: limit, skip: offset }), lilyPrisma.lilyMission.count()]);
    return { missions: missions.map((mission) => ({ ...mission, prerequisites: parseJson(mission.prerequisiteJson, []) })), total };
  });

  app.post("/api/v1/lily/admin/missions", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = missionSchema.parse(request.body);
    const mission = await lilyPrisma.lilyMission.create({ data: { id: crypto.randomUUID(), title: input.title, description: input.description, points: input.points, prerequisiteJson: JSON.stringify(input.prerequisites), status: "published" } });
    await auditLilyAdmin(context.user.id, "create", "mission", mission.id, { points: mission.points });
    return { mission };
  });

  app.get("/api/v1/lily/admin/survey-uploads/:uploadId", async (request, reply) => {
    await requireLilyStaff(request);
    const uploadId = idSchema.parse((request.params as { uploadId: string }).uploadId);
    const root = path.resolve(process.env.LILY_UPLOAD_DIR ?? path.resolve(process.cwd(), ".runtime/lily-acai/uploads"), "surveys");
    const upload = await lilyPrisma.lilySurveyUpload.findUnique({ where: { id: uploadId } });
    if (!upload || path.basename(upload.storageName) !== upload.storageName) throw new ApiError(404, "Anexo não encontrado.");
    return reply.type(upload.mime).header("Cache-Control", "private, no-store").header("X-Content-Type-Options", "nosniff").header("Content-Disposition", `attachment; filename="${upload.originalName.replace(/[\"\r\n]/g, "_")}"`).send(await fs.readFile(path.join(root, upload.storageName)));
  });

  app.get("/api/v1/lily/missions", async (request) => {
    const context = await requireLilySession(request);
    const completed = await completedSurveyIds(context.user.id);
    const rows = await lilyPrisma.lilyMission.findMany({ where: { status: "published" }, orderBy: { createdAt: "desc" }, take: 100 });
    const surveys = completed.size ? await lilyPrisma.lilySurvey.findMany({ where: { id: { in: [...completed] } }, select: { unlocksMissionsJson: true } }) : [];
    const unlockedBySurvey = new Set(surveys.flatMap((survey) => parseJson<string[]>(survey.unlocksMissionsJson, [])));
    return { missions: rows.filter((mission) => unlockedBySurvey.has(mission.id) || parseJson<string[]>(mission.prerequisiteJson, []).every((id) => completed.has(id))).map(({ id, title, description, points }) => ({ id, title, description, points })) };
  });
}
