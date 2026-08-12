import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
  it("inicializa o plano normalizado e informa a saúde", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", storage: "prisma-sqlite" });
    const bootstrap = await app.inject({ method: "GET", url: "/api/v1/bootstrap" });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json().tasks).toHaveLength(29);
    expect(bootstrap.json().project.agents).toHaveLength(8);
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
    expect(intent.runs.map((run: any) => run.agentId).sort()).toEqual(["AG-DEV", "AG-FINANCAS"]);
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
