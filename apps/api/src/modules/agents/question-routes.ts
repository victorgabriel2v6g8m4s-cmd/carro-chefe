import type { FastifyInstance } from "fastify";
import { prisma } from "@carro-chefe/database";
import { agentQuestionSchema, answerQuestionSchema } from "@carro-chefe/contracts";
import { ApiError, parseJson } from "../../lib/errors";
import { appendEvent, broadcastEvent } from "../../lib/outbox";
import { requireRun } from "./run-presenter";
import { resolveReferenceContext } from "../references/service";

function presentQuestion(question: any) {
  return { ...question, options: parseJson(question.optionsJson, []), answerReferences: parseJson(question.answerReferencesJson, []), optionsJson: undefined, answerReferencesJson: undefined };
}

export async function questionRoutes(app: FastifyInstance) {
  app.post("/api/v1/agent-runs/:runId/questions", async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = await requireRun(runId);
    if (!run.taskId) throw new ApiError(422, "Conversas com a Gestão usam a própria conversa para perguntas; não há tarefa vinculada.");
    const input = agentQuestionSchema.parse(request.body);
    const result = await prisma.$transaction(async (tx) => {
      const askedBy = input.askedBy ?? run.agentId;
      const question = await tx.agentQuestion.create({ data: { runId, taskId: run.taskId!, askedBy,
        question: input.question, context: input.context, recommendation: input.recommendation,
        optionsJson: JSON.stringify(input.options), blocking: input.blocking } });
      if (input.blocking) await tx.agentRun.update({ where: { id: runId }, data: { status: "waiting_input", lastHeartbeatAt: new Date() } });
      await tx.agentMessage.create({ data: { runId, sender: askedBy, kind: "question", content: input.question } });
      await tx.agentCommunication.create({ data: { runId, intentId: run.intentId, sourceId: askedBy, targetId: "PROPRIETARIO", kind: "question", status: "delivered", summary: input.question } });
      await tx.notification.create({ data: { userId: "owner", type: "question", title: "Um agente precisa de você", message: input.question, route: `/gestao/agentes/execucoes/${runId}` } });
      const event = await appendEvent(tx, "agent.question.asked", "agent_run", runId, question);
      return { question, event };
    });
    broadcastEvent(result.event);
    return reply.code(201).send(presentQuestion({ ...result.question, uploads: [] }));
  });

  app.get("/api/v1/agent-questions", async (request) => {
    const query = request.query as { status?: string; taskId?: string };
    const questions = await prisma.agentQuestion.findMany({ where: { status: query.status || undefined, taskId: query.taskId || undefined },
      include: { uploads: { orderBy: { createdAt: "asc" } }, task: { select: { id: true, title: true } }, run: { select: { id: true, title: true, agent: true } } }, orderBy: { createdAt: "desc" } });
    return questions.map(presentQuestion);
  });

  app.post("/api/v1/agent-questions/:questionId/answer", async (request) => {
    const { questionId } = request.params as { questionId: string };
    const input = answerQuestionSchema.parse(request.body);
    const current = await prisma.agentQuestion.findUnique({ where: { id: questionId } });
    if (!current) throw new ApiError(404, "Pergunta não encontrada.");
    if (current.status !== "pending") throw new ApiError(409, "Esta pergunta já foi respondida.");
    const references = await resolveReferenceContext(input.references.map((reference) => reference.id), current.taskId);
    if (references.length !== new Set(input.references.map((reference) => reference.id)).size) throw new ApiError(400, "Uma ou mais referências não pertencem ao escopo desta tarefa.");
    const result = await prisma.$transaction(async (tx) => {
      if (input.attachmentIds.length) {
        const uploads = await tx.upload.findMany({ where: { id: { in: input.attachmentIds } } });
        if (uploads.length !== new Set(input.attachmentIds).size) throw new ApiError(400, "Um ou mais anexos não existem.");
        const invalid = uploads.find((upload) => upload.questionId || upload.managementMessageId || upload.decisionId || (upload.runId && upload.runId !== current.runId));
        if (invalid) throw new ApiError(409, `O anexo ${invalid.originalName} já pertence a outro contexto.`);
      }
      const run = await tx.agentRun.findUniqueOrThrow({ where: { id: current.runId }, select: { intentId: true } });
      const question = await tx.agentQuestion.update({ where: { id: questionId }, data: { status: "answered", answer: input.answer,
        answerReferencesJson: JSON.stringify(references), answeredBy: input.answeredBy, answeredAt: new Date() } });
      if (input.attachmentIds.length) await tx.upload.updateMany({ where: { id: { in: input.attachmentIds } }, data: { questionId, taskId: current.taskId, runId: current.runId, intentId: run.intentId } });
      await tx.agentMessage.create({ data: { runId: current.runId, sender: input.answeredBy, kind: "answer", content: input.answer } });
      await tx.agentCommunication.create({ data: { runId: current.runId, intentId: run.intentId, sourceId: input.answeredBy, targetId: current.askedBy,
        kind: "answer", status: "delivered", summary: input.answer, metadataJson: JSON.stringify({ attachmentIds: input.attachmentIds, references }) } });
      await tx.agentRun.update({ where: { id: current.runId }, data: { status: "queued", lastHeartbeatAt: new Date() } });
      await tx.notification.updateMany({ where: { userId: "owner", type: "question", route: `/gestao/agentes/execucoes/${current.runId}`, readAt: null }, data: { readAt: new Date() } });
      await tx.auditEvent.create({ data: { taskId: current.taskId, actor: input.answeredBy, action: "agent_question_answered", entityType: "agent_question", entityId: questionId,
        summary: input.answer, afterJson: JSON.stringify({ attachmentIds: input.attachmentIds, references }) } });
      const event = await appendEvent(tx, "agent.answer.submitted", "agent_run", current.runId, question);
      return { event };
    });
    broadcastEvent(result.event);
    return presentQuestion(await prisma.agentQuestion.findUniqueOrThrow({ where: { id: questionId }, include: { uploads: { orderBy: { createdAt: "asc" } } } }));
  });

  app.post("/api/v1/agent-questions/:questionId/acknowledge", async (request) => {
    const { questionId } = request.params as { questionId: string };
    const current = await prisma.agentQuestion.findUnique({ where: { id: questionId } });
    if (!current) throw new ApiError(404, "Pergunta não encontrada.");
    if (current.status !== "answered") throw new ApiError(409, "A pergunta não está pronta para confirmação.");
    const question = await prisma.agentQuestion.update({ where: { id: questionId }, data: { status: "acknowledged", acknowledgedAt: new Date() } });
    const event = await prisma.outboxEvent.create({ data: { topic: "agent.answer.acknowledged", aggregateType: "agent_run", aggregateId: current.runId, payloadJson: JSON.stringify(question) } });
    broadcastEvent(event);
    return question;
  });
}
