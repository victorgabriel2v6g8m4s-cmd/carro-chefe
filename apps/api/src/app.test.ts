import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildRuntimeContract, shouldWriteFallbackReport } from "./workers/agent-runtime-contract";

const root = path.resolve(import.meta.dirname, "../../..");
const databasePath = path.join(root, ".runtime", `test-${process.pid}.db`);
const databaseUrl = `file:./.runtime/test-${process.pid}.db`;
let app: Awaited<ReturnType<typeof import("./app")["buildApp"]>>;
const uploadedStorageNames: string[] = [];

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = databaseUrl;
  process.env.WEBHOOK_SECRET = "integration-test-secret";
  const migrationsRoot = path.join(root, "packages", "database", "prisma", "migrations");
  const migration = readdirSync(migrationsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => readFileSync(path.join(migrationsRoot, entry.name, "migration.sql"), "utf8")).join("\n");
  const sqlite = new Database(databasePath);
  sqlite.exec(migration);
  sqlite.close();
  execFileSync(process.execPath, ["--import", "tsx", "packages/database/src/seed.ts"], { cwd: root, env: process.env, stdio: "ignore" });
  const module = await import("./app");
  app = await module.buildApp();
});

afterAll(async () => {
  await app?.close();
  const { prisma } = await import("@carro-chefe/database");
  await prisma.$disconnect();
  for (const storageName of uploadedStorageNames) {
    const uploaded = path.join(root, ".runtime", "uploads", storageName);
    if (uploaded.startsWith(path.join(root, ".runtime", "uploads")) && existsSync(uploaded)) rmSync(uploaded);
  }
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const target = `${databasePath}${suffix}`;
    if (target.startsWith(path.join(root, ".runtime")) && existsSync(target)) rmSync(target);
  }
});

describe("Central Operacional API", () => {
  it("entrega ao agente um contrato compacto e preserva relatórios explícitos", () => {
    const contract = buildRuntimeContract("http://127.0.0.1:4173/api/v1", "RUN-001", "AG-DEV");
    expect(contract).toContain('/steps com {"order":1');
    expect(contract).toContain("Não existe campo evidence no passo");
    expect(contract).toContain("bytes UTF-8");
    expect(contract).toContain("não envie usage");
    expect(shouldWriteFallbackReport({})).toBe(true);
    expect(shouldWriteFallbackReport({ report: { derived: true } })).toBe(true);
    expect(shouldWriteFallbackReport({ report: { derived: false } })).toBe(false);
  });

  it("não transforma erro HTTP do parser em falha interna", async () => {
    const malformed = await app.inject({ method: "POST", url: "/api/v1/agent-runs", headers: { "content-type": "application/json", "content-length": "999" }, payload: "{}" });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toMatchObject({ code: "FST_ERR_CTP_INVALID_CONTENT_LENGTH" });
  });

  it("inicializa o plano normalizado e informa a saúde", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", storage: "prisma-sqlite" });
    const bootstrap = await app.inject({ method: "GET", url: "/api/v1/bootstrap" });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json().tasks).toHaveLength(29);
    expect(bootstrap.json().project.agents).toHaveLength(9);
    expect(bootstrap.json().project.agents).toEqual(expect.arrayContaining([expect.objectContaining({ id: "AG-DADOS", name: "Dados & Analytics" })]));
  });

  it("exige justificativa, controla versão e registra transição", async () => {
    const current = (await app.inject({ method: "GET", url: "/api/v1/tasks/TASK-GES-001" })).json();
    const invalid = await app.inject({ method: "POST", url: "/api/v1/tasks/TASK-GES-001/status-transitions", payload: { toStatus: "in_progress", justification: "curta", actor: "teste", expectedVersion: current.version, evidence: [] } });
    expect(invalid.statusCode, invalid.body).toBe(400);
    const nextStatus = current.status === "in_progress" ? "review" : "in_progress";
    const valid = await app.inject({ method: "POST", url: "/api/v1/tasks/TASK-GES-001/status-transitions", payload: { toStatus: nextStatus, justification: "Validação automatizada da justificativa e da auditoria.", actor: "teste-ci", expectedVersion: current.version, evidence: [] } });
    expect(valid.statusCode).toBe(200);
    expect(valid.json().transition).toMatchObject({ fromStatus: current.status, toStatus: nextStatus, actor: "teste-ci" });
    const conflict = await app.inject({ method: "POST", url: "/api/v1/tasks/TASK-GES-001/status-transitions", payload: { toStatus: "review", justification: "Tentativa usando uma versão antiga da mesma tarefa.", actor: "teste-ci", expectedVersion: current.version, evidence: [] } });
    expect(conflict.statusCode).toBe(409);
  });

  it("salva a página, filtros e posição para continuar após recarregar", async () => {
    const payload = { route: "/gestao/tarefas/TASK-GES-001", search: "?aba=timeline", hash: "#historico", scrollY: 840, sidebarOpen: false, selectedTaskId: "TASK-GES-001", filters: { status: "ready" } };
    expect((await app.inject({ method: "PUT", url: "/api/v1/me/ui-state/gestao", payload })).statusCode).toBe(200);
    const state = await app.inject({ method: "GET", url: "/api/v1/me/ui-state/gestao" });
    expect(state.json()).toMatchObject(payload);
  });

  it("mantém pergunta e resposta ligadas à execução do agente", async () => {
    const created = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-GES-001", agentId: "AG-GESTAO", title: "Execução de teste", objective: "Validar o canal de perguntas em runtime.", provider: "manual", requestedBy: "teste-ci" } });
    expect(created.statusCode, created.body).toBe(201);
    const run = created.json();
    const logged = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/logs`, payload: { channel: "terminal", eventType: "command.output", title: "npm test", content: "5 testes aprovados\n" } });
    expect(logged.statusCode, logged.body).toBe(201);
    const runWithLogs = await app.inject({ method: "GET", url: `/api/v1/agent-runs/${run.id}` });
    expect(runWithLogs.json().logs).toEqual(expect.arrayContaining([expect.objectContaining({ sequence: 1, channel: "terminal", content: "5 testes aprovados\n" })]));
    const asked = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/questions`, payload: { askedBy: "AG-GESTAO", question: "Qual alternativa devemos usar?", context: "A escolha altera o procedimento de validação.", recommendation: "Usar a alternativa A.", options: ["Alternativa A", "Alternativa B"], blocking: true } });
    expect(asked.statusCode).toBe(201);
    const answer = await app.inject({ method: "POST", url: `/api/v1/agent-questions/${asked.json().id}/answer`, payload: { answer: "Alternativa A, conforme recomendado.", answeredBy: "proprietario" } });
    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({ status: "answered", answeredBy: "proprietario" });
    const claimed = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/claim`, payload: {} });
    expect(claimed.statusCode).toBe(200);
    const acknowledged = await app.inject({ method: "POST", url: `/api/v1/agent-questions/${asked.json().id}/acknowledge`, payload: {} });
    expect(acknowledged.json().status).toBe("acknowledged");
  });

  it("explica sucesso parcial, reconstrói a jornada e registra o fluxo entre agentes", async () => {
    const created = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-GES-001", agentId: "AG-GESTAO", title: "Diagnóstico operacional", objective: "Validar relatório detalhado e comunicação direcional entre os agentes.", provider: "manual", requestedBy: "proprietario" } });
    expect(created.statusCode, created.body).toBe(201);
    const run = created.json();
    const longTitle = `powershell -Command ${"verificar-campo ".repeat(45)}`;
    expect(longTitle.length).toBeGreaterThan(500);
    const command = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/logs`, payload: { channel: "terminal", eventType: "command.completed", title: longTitle, content: "[processo encerrado com código 0]" } });
    expect(command.statusCode, command.body).toBe(201);
    expect(command.json().title).toHaveLength(500);
    const failed = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/logs`, payload: { channel: "error", eventType: "run.failed", title: "Falha da execução", content: "Entrada inválida." } });
    expect(failed.statusCode).toBe(201);
    await app.inject({ method: "PATCH", url: `/api/v1/agent-runs/${run.id}`, payload: { status: "failed", currentStep: "Falha registrada pelo bridge" } });
    const communication = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/communications`, payload: { sourceId: "AG-GESTAO", targetId: "AG-DEV", kind: "handoff", status: "delivered", summary: "Validar o contrato que rejeitou o registro.", metadata: { reason: "api-contract" } } });
    expect(communication.statusCode, communication.body).toBe(201);
    const detail = await app.inject({ method: "GET", url: `/api/v1/agent-runs/${run.id}` });
    expect(detail.json().report).toMatchObject({ outcome: "partial", diagnosis: expect.stringContaining("contrato da API"), derived: true });
    expect(detail.json().report.successes).toEqual(expect.arrayContaining([expect.stringContaining("código de saída 0")]));
    expect(detail.json().journey).toEqual(expect.arrayContaining([expect.objectContaining({ status: "completed" }), expect.objectContaining({ status: "failed" })]));
    expect(detail.json().communications).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: "proprietario", targetId: "AG-GESTAO", kind: "delegation" }), expect.objectContaining({ sourceId: "AG-GESTAO", targetId: "AG-DEV", kind: "handoff" })]));
  });

  it("distingue falha total de sucesso parcial", async () => {
    const created = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-DEV-001", agentId: "AG-DEV", title: "Runtime incompatível", objective: "Validar a classificação de uma execução sem passo concluído.", provider: "manual", requestedBy: "teste-ci" } });
    const run = created.json();
    await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/logs`, payload: { channel: "error", eventType: "run.failed", title: "Falha da execução", content: "gpt-5.6-sol requires a newer version of Codex" } });
    await app.inject({ method: "PATCH", url: `/api/v1/agent-runs/${run.id}`, payload: { status: "failed", currentStep: "Runtime incompatível" } });
    const detail = await app.inject({ method: "GET", url: `/api/v1/agent-runs/${run.id}` });
    expect(detail.json().report).toMatchObject({ outcome: "failed", diagnosis: expect.stringContaining("mais antigo") });
    expect(detail.json().report.recommendations).toEqual(expect.arrayContaining([expect.stringContaining("Atualizar o Codex")]));
  });

  it("persiste o output estruturado produzido pelo runtime", async () => {
    const created = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-DEV-001", agentId: "AG-DEV", title: "Relatório do runtime", objective: "Validar o relatório final com sucessos, falhas e recomendações.", provider: "manual", requestedBy: "teste-ci" } });
    const run = created.json();
    const report = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/report`, payload: { outcome: "partial", summary: "A análise terminou parcialmente.", diagnosis: "Um endpoint externo ficou indisponível.", successes: ["Contrato local validado."], failures: ["Consulta externa falhou."], recommendations: ["Repetir a consulta externa."], evidence: ["Log 42."], generatedBy: "AG-DEV" } });
    expect(report.statusCode, report.body).toBe(200);
    expect(report.json()).toMatchObject({ outcome: "partial", successes: ["Contrato local validado."], failures: ["Consulta externa falhou."], recommendations: ["Repetir a consulta externa."] });
    const detail = await app.inject({ method: "GET", url: `/api/v1/agent-runs/${run.id}` });
    expect(detail.json().report).toMatchObject({ generatedBy: "AG-DEV" });
    expect(detail.json().report).not.toHaveProperty("derived");
  });

  it("conclui a tarefa, fixa o relatório e notifica quando a execução termina com sucesso", async () => {
    const created = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-MAR-001", agentId: "AG-MARCA", title: "Concluir identidade", objective: "Validar a conclusão automática da tarefa a partir do relatório do agente.", provider: "manual", requestedBy: "teste-ci" } });
    expect(created.statusCode, created.body).toBe(201);
    const run = created.json();
    const report = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/report`, payload: { outcome: "succeeded", summary: "Critério atendido e arquivos docs/MARCA.md e https://carrochefe.com validados.", successes: ["Critério de aceite validado."], failures: [], recommendations: ["Revisar a evidência antes de publicar."], evidence: [`/gestao/agentes/execucoes/${run.id}`], generatedBy: "AG-MARCA" } });
    expect(report.statusCode, report.body).toBe(200);
    const finished = await app.inject({ method: "PATCH", url: `/api/v1/agent-runs/${run.id}`, payload: { status: "succeeded", currentStep: "Execução concluída" } });
    expect(finished.statusCode, finished.body).toBe(200);
    const task = await app.inject({ method: "GET", url: "/api/v1/tasks/TASK-MAR-001" });
    expect(task.json()).toMatchObject({ status: "done", statusChangedBy: "AG-MARCA" });
    expect(task.json().runs[0]).toMatchObject({ id: run.id, report: { outcome: "succeeded", generatedBy: "AG-MARCA" } });
    expect(task.json().runs[0].communications).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: "AG-MARCA", targetId: "PROPRIETARIO", kind: "result" })]));
    const notifications = await app.inject({ method: "GET", url: "/api/v1/notifications?unread=true" });
    expect(notifications.json()).toEqual(expect.arrayContaining([expect.objectContaining({ runId: run.id, taskId: "TASK-MAR-001", type: "success", route: "/gestao/tarefas/TASK-MAR-001" })]));
    expect(notifications.json()).toEqual(expect.arrayContaining([expect.objectContaining({ type: "next_step", title: "Próximo passo sugerido", route: expect.stringMatching(/^\/gestao\/tarefas\//) })]));
  });

  it("preserva contexto, anexo e auditoria de uma decisão", async () => {
    const bootstrap = (await app.inject({ method: "GET", url: "/api/v1/bootstrap" })).json();
    const decisionId = bootstrap.decisions[0].id;
    const context = await app.inject({ method: "POST", url: `/api/v1/decisions/${decisionId}/context`, payload: { actor: "teste-ci", content: "Parecer técnico adicional para antecipar a decisão.", sourceUrl: "https://example.com/fonte" } });
    expect(context.statusCode, context.body).toBe(201);
    const detail = await app.inject({ method: "GET", url: `/api/v1/decisions/${decisionId}` });
    expect(detail.json().contexts).toEqual(expect.arrayContaining([expect.objectContaining({ content: expect.stringContaining("Parecer técnico") })]));
    expect(detail.json().auditEvents).toEqual(expect.arrayContaining([expect.objectContaining({ action: "decision_context_added" })]));
  });

  it("registra navegação assistida e calcula métricas do agente", async () => {
    const created = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-DEV-002", agentId: "AG-DEV", title: "Inspeção visual", objective: "Abrir a página local no navegador integrado para revisão visual.", provider: "manual", requestedBy: "teste-ci" } });
    const run = created.json();
    const navigation = await app.inject({ method: "POST", url: `/api/v1/agent-runs/${run.id}/browser-navigations`, payload: { actor: "AG-DEV", targetType: "url", target: "http://127.0.0.1:4173/gestao/tarefas", title: "Lista de tarefas", reason: "Validar a busca." } });
    expect(navigation.statusCode, navigation.body).toBe(201);
    const history = await app.inject({ method: "GET", url: `/api/v1/browser-navigations?runId=${run.id}` });
    expect(history.json()).toEqual(expect.arrayContaining([expect.objectContaining({ targetType: "url", status: "requested" })]));
    const stats = await app.inject({ method: "GET", url: "/api/v1/agents/AG-DEV/stats" });
    expect(stats.statusCode, stats.body).toBe(200);
    expect(stats.json()).toMatchObject({ agent: { id: "AG-DEV", browserEnabled: true }, interactions: expect.any(Number), performance: expect.any(String) });
  });

  it("recebe evidência permitida e mantém o vínculo com a tarefa", async () => {
    const boundary = `----carrochefe${Date.now()}`;
    const body = Buffer.from([`--${boundary}\r\nContent-Disposition: form-data; name="taskId"\r\n\r\nTASK-GES-001\r\n`, `--${boundary}\r\nContent-Disposition: form-data; name="actor"\r\n\r\nteste-ci\r\n`, `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="evidencia.txt"\r\nContent-Type: text/plain\r\n\r\nValidação da evidência.\r\n`, `--${boundary}--\r\n`].join(""));
    const uploaded = await app.inject({ method: "POST", url: "/api/v1/uploads", payload: body, headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": String(body.length) } });
    expect(uploaded.statusCode, uploaded.body).toBe(201);
    uploadedStorageNames.push(uploaded.json().storageName);
    expect(uploaded.json()).toMatchObject({ taskId: "TASK-GES-001", actor: "teste-ci", originalName: "evidencia.txt", mimeType: "text/plain" });
    const content = await app.inject({ method: "GET", url: `/api/v1/uploads/${uploaded.json().id}/content` });
    expect(content.statusCode).toBe(200);
    expect(content.body).toContain("Validação da evidência");
  });

  it("transforma uma orientação sobre ERP em despacho multiagente e notificação", async () => {
    const boundary = `----carrochefe-intent-${Date.now()}`;
    const body = Buffer.from([`--${boundary}\r\nContent-Disposition: form-data; name="purpose"\r\n\r\nintent-draft\r\n`, `--${boundary}\r\nContent-Disposition: form-data; name="actor"\r\n\r\nproprietario\r\n`, `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="requisitos-erp.txt"\r\nContent-Type: text/plain\r\n\r\nRequisitos de integracao do ERP.\r\n`, `--${boundary}--\r\n`].join(""));
    const draft = await app.inject({ method: "POST", url: "/api/v1/uploads", payload: body, headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "content-length": String(body.length) } });
    expect(draft.statusCode, draft.body).toBe(201);
    uploadedStorageNames.push(draft.json().storageName);
    const created = await app.inject({ method: "POST", url: "/api/v1/intents", payload: { prompt: "O ERP vai ser o Bling, mas verifique se ele atende aos requisitos do Carro Chefe.", submittedBy: "proprietario", attachmentIds: [draft.json().id] } });
    expect(created.statusCode, created.body).toBe(201);
    const intent = created.json();
    expect(intent.uploads).toEqual(expect.arrayContaining([expect.objectContaining({ id: draft.json().id, originalName: "requisitos-erp.txt" })]));
    expect(intent.facts).toEqual(expect.arrayContaining([expect.objectContaining({ key: "erp.selected", value: "Bling", verificationStatus: "pending_verification" })]));
    expect(intent.runs.map((run: any) => run.agentId).sort()).toEqual(["AG-FINANCAS", "AG-GESTAO"]);
    expect(intent.runs.find((run: any) => run.agentId === "AG-GESTAO")).toMatchObject({ purpose: "management_review" });
    for (const run of intent.runs) {
      const finished = await app.inject({ method: "PATCH", url: `/api/v1/agent-runs/${run.id}`, payload: { status: "succeeded", currentStep: "Requisitos verificados no teste." } });
      expect(finished.statusCode).toBe(200);
    }
    const completed = await app.inject({ method: "GET", url: `/api/v1/intents/${intent.id}` });
    expect(completed.json()).toMatchObject({ status: "completed", notification: { type: "completed", title: "Tarefa concluída" } });
    expect(completed.json().facts[0].verificationStatus).toBe("reviewed");
    const notifications = await app.inject({ method: "GET", url: "/api/v1/notifications?unread=true" });
    expect(notifications.json()).toEqual(expect.arrayContaining([expect.objectContaining({ intentId: intent.id, route: `/gestao/comandos/${intent.id}` })]));
  });

  it("pagina e filtra a auditoria no banco", async () => {
    const first = await app.inject({ method: "GET", url: "/api/v1/audit?page=1&pageSize=10&q=tarefa" });
    expect(first.statusCode, first.body).toBe(200);
    expect(first.json()).toMatchObject({ page: 1, pageSize: 10, total: expect.any(Number), pageCount: expect.any(Number) });
    expect(first.json().items.length).toBeLessThanOrEqual(10);
  });

  it("impede programação por agente de negócio e escolhe perfil adaptativo", async () => {
    const rejected = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-GES-001", agentId: "AG-GESTAO", title: "Implementar API", objective: "Editar código TypeScript e criar endpoint novo.", provider: "manual", requestedBy: "teste-ci" } });
    expect(rejected.statusCode).toBe(422);
    const accepted = await app.inject({ method: "POST", url: "/api/v1/agent-runs", payload: { taskId: "TASK-DEV-001", agentId: "AG-DEV", title: "Implementar API", objective: "Editar código TypeScript e criar endpoint novo com testes.", provider: "manual", requestedBy: "teste-ci", complexity: "complex" } });
    expect(accepted.statusCode, accepted.body).toBe(201);
    expect(accepted.json()).toMatchObject({ selectedModel: "gpt-5.6-sol", selectedReasoningEffort: "medium", complexity: "complex" });
  });

  it("valida assinatura e idempotência dos webhooks", async () => {
    const body = JSON.stringify({ id: "evt-001", type: "catalog.updated", source: "erp-test" });
    const unsigned = await app.inject({ method: "POST", url: "/api/v1/integrations/erp/webhook", payload: body, headers: { "content-type": "application/json" } });
    expect(unsigned.statusCode).toBe(401);
    const signature = `sha256=${crypto.createHmac("sha256", "integration-test-secret").update(body).digest("hex")}`;
    const headers = { "content-type": "application/json", "x-carrochefe-signature": signature, "x-idempotency-key": "evt-001", "x-event-type": "catalog.updated" };
    const accepted = await app.inject({ method: "POST", url: "/api/v1/integrations/erp/webhook", payload: body, headers });
    expect(accepted.statusCode).toBe(202);
    const duplicate = await app.inject({ method: "POST", url: "/api/v1/integrations/erp/webhook", payload: body, headers });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().duplicate).toBe(true);
  });
});
