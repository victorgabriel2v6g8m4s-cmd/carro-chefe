import { Codex, type ModelReasoningEffort, type ThreadEvent } from "@openai/codex-sdk";
import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "../config";
import { holdWorkerPort } from "./singleton";
import { shouldWriteFallbackReport } from "./agent-runtime-contract";
import { buildRunPrompt, makeRuntimeInput } from "./runtime-prompt";
import { runtimeApi as api } from "./runtime-api";

const codex = new Codex();
const workerLock = await holdWorkerPort(4174, "Bridge Codex");
if (!workerLock) process.exit(0);
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

function compactTitle(title?: string) {
  if (!title) return undefined;
  return title.length <= 500 ? title : `${title.slice(0, 476)}… [${title.length} caracteres]`;
}

async function writeLog(runId: string, channel: "activity" | "terminal" | "system" | "error", eventType: string, content = "", title?: string) {
  const chunks = content ? content.match(/[\s\S]{1,45000}/g) ?? [""] : [""];
  for (const [index, chunk] of chunks.entries()) {
    await api(`/agent-runs/${runId}/logs`, "POST", { channel, eventType, title: index ? undefined : compactTitle(title), content: chunk });
  }
}

async function observe(runId: string, channel: "activity" | "terminal" | "system" | "error", eventType: string, content = "", title?: string) {
  try { await writeLog(runId, channel, eventType, content, title); }
  catch (error) { console.error(`[telemetria ${runId}] ${error instanceof Error ? error.message : String(error)}`); }
}

async function communicate(runId: string, sourceId: string, targetId: string, kind: "coordination" | "handoff" | "result" | "update", summary: string, intentId?: string | null) {
  await api(`/agent-runs/${runId}/communications`, "POST", { sourceId, targetId, kind, status: "delivered", summary, intentId: intentId ?? undefined, metadata: {} });
}

function safeJson(value: unknown) {
  try { return JSON.stringify(value, null, 2); }
  catch { return String(value); }
}

async function prepareArtifactHelpers(workingDirectory: string, runId: string) {
  const helper = "%~dp0..\\..\\..\\tools\\agent-runtime.mjs";
  await Promise.all([
    fs.writeFile(path.join(workingDirectory, "send.cmd"), `@echo off\r\nnode "${helper}" send ${runId} %*\r\n`, "utf8"),
    fs.writeFile(path.join(workingDirectory, "ask.cmd"), `@echo off\r\nnode "${helper}" question ${runId} %*\r\n`, "utf8"),
    fs.writeFile(path.join(workingDirectory, "artifact.cmd"), `@echo off\r\nnode "${helper}" artifact ${runId} %*\r\n`, "utf8")
  ]);
}

async function recordItem(runId: string, event: Extract<ThreadEvent, { type: "item.started" | "item.updated" | "item.completed" }>, commandOutputs: Map<string, string>) {
  const item = event.item;
  if (item.type === "command_execution") {
    if (event.type === "item.started") await observe(runId, "terminal", "command.started", `$ ${item.command}\n`, item.command);
    const previous = commandOutputs.get(item.id) ?? "";
    const current = item.aggregated_output ?? "";
    const delta = current.startsWith(previous) ? current.slice(previous.length) : current;
    if (delta) await observe(runId, "terminal", "command.output", delta, item.command);
    commandOutputs.set(item.id, current);
    if (event.type === "item.completed") {
      await observe(runId, item.status === "failed" ? "error" : "terminal", "command.completed", `\n[processo encerrado com código ${item.exit_code ?? "desconhecido"}]\n`, item.command);
      commandOutputs.delete(item.id);
    }
    return;
  }
  if (event.type !== "item.completed" && !(event.type === "item.started" && ["web_search", "mcp_tool_call"].includes(item.type))) return;
  if (item.type === "reasoning" && item.text) await observe(runId, "activity", "reasoning.completed", item.text, "Raciocínio resumido pelo Codex");
  if (item.type === "web_search") await observe(runId, "activity", event.type === "item.started" ? "web_search.started" : "web_search.completed", item.query, "Pesquisa na web");
  if (item.type === "file_change") await observe(runId, item.status === "failed" ? "error" : "activity", "file_change.completed", item.changes.map((change) => `${change.kind}: ${change.path}`).join("\n"), "Arquivos alterados");
  if (item.type === "mcp_tool_call") {
    const details = event.type === "item.started" ? safeJson(item.arguments) : item.error?.message ?? safeJson(item.result?.structured_content ?? item.result?.content ?? "Concluído");
    await observe(runId, item.status === "failed" ? "error" : "activity", event.type === "item.started" ? "tool.started" : "tool.completed", details, `${item.server} · ${item.tool}`);
  }
  if (item.type === "error") await observe(runId, "error", "item.error", item.message, "Erro do runtime");
}

async function handleRun(runId: string) {
  let run: any;
  try { run = await api<any>(`/agent-runs/${runId}/claim`, "POST", {}); }
  catch (error) { if (String(error).includes("fila")) return; throw error; }

  const allowedEfforts = new Set<ModelReasoningEffort>(["minimal", "low", "medium", "high", "xhigh"]);
  const selectedEffort = run.selectedReasoningEffort || run.agent.reasoningEffort;
  const reasoningEffort: ModelReasoningEffort = allowedEfforts.has(selectedEffort) ? selectedEffort : "medium";
  const workspaceMode = run.agent.id === "AG-DEV" ? "project" as const : run.agent.workspaceMode === "artifacts" ? "artifacts" as const : "read_only" as const;
  const workingDirectory = workspaceMode === "artifacts" ? path.join(config.projectRoot, "output", ".agent-workspaces", run.id) : config.projectRoot;
  if (workspaceMode === "artifacts") { await fs.mkdir(workingDirectory, { recursive: true }); await prepareArtifactHelpers(workingDirectory, run.id); }
  const needsLiveResearch = ["AG-COMPRAS", "AG-FINANCAS", "AG-MARKETING", "AG-MIDIAS"].includes(run.agent.id) || /\b(pesquis|verificar (?:site|fornecedor)|preço atual|requisito externo)\b/i.test(run.objective);
  const threadOptions = { workingDirectory, sandboxMode: workspaceMode === "read_only" ? "read-only" as const : "workspace-write" as const, approvalPolicy: "never" as const,
    networkAccessEnabled: needsLiveResearch, webSearchMode: needsLiveResearch ? "live" as const : "disabled" as const, model: run.selectedModel || run.agent.model || undefined, modelReasoningEffort: reasoningEffort };
  const thread = run.externalThreadId ? codex.resumeThread(run.externalThreadId, threadOptions) : codex.startThread(threadOptions);
  const context = run.intentId ? await api<any>(`/intents/${run.intentId}/runtime-context?runId=${run.id}`).catch(() => null) : null;
  const priorRuns = context?.priorRuns ?? [];
  const handoffs: string[] = [];
  for (const prior of priorRuns.slice(-4)) {
    const summary = prior.report?.summary || prior.messages?.at(-1)?.content;
    if (!summary) continue;
    handoffs.push(`${prior.agentId}: ${summary.slice(0, 1200)}`);
    await communicate(runId, prior.agentId, run.agent.id, "handoff", summary, run.intentId).catch(() => undefined);
  }
  const latestAnswer = run.questions.find((question: any) => question.status === "answered" && !question.acknowledgedAt);
  const ownerAnswers = context?.ownerAnswers ?? [];
  const prompt = buildRunPrompt(run, handoffs, latestAnswer, ownerAnswers, { mode: workspaceMode, workingDirectory, projectRoot: config.projectRoot });

  const commandOutputs = new Map<string, string>();
  let finalMessage = "";
  let lastHeartbeatAt = 0;
  try {
    await observe(runId, "system", "run.connected", "Bridge local conectado ao runtime do Codex.", "Execução iniciada");
    const streamed = await thread.runStreamed(makeRuntimeInput(run, prompt));
    for await (const event of streamed.events) {
      if (Date.now() - lastHeartbeatAt >= 5_000) {
        await api(`/agent-runs/${runId}/heartbeat`, "POST", {});
        lastHeartbeatAt = Date.now();
      }
      if (event.type === "thread.started") await api(`/agent-runs/${runId}`, "PATCH", { status: "running", currentStep: "Codex conectado à execução", externalThreadId: event.thread_id });
      if (event.type === "turn.started") await observe(runId, "system", "turn.started", "O Codex começou a processar o objetivo.", "Turno iniciado");
      if (["item.started", "item.updated", "item.completed"].includes(event.type)) await recordItem(runId, event as Extract<ThreadEvent, { type: "item.started" | "item.updated" | "item.completed" }>, commandOutputs);
      if (event.type === "item.completed" && event.item.type === "todo_list") {
        for (const [index, item] of event.item.items.entries()) await api(`/agent-runs/${runId}/steps`, "POST", { order: index + 1, title: item.text.slice(0, 180), status: item.completed ? "completed" : "pending" });
        await observe(runId, "activity", "todo.updated", event.item.items.map((item) => `${item.completed ? "✓" : "○"} ${item.text}`).join("\n"), "Plano de trabalho");
      }
      if (event.type === "item.completed" && event.item.type === "agent_message") {
        finalMessage = event.item.text;
        await api(`/agent-runs/${runId}/messages`, "POST", { sender: run.agent.id, kind: "update", content: event.item.text.slice(0, 8000) });
      }
      if (event.type === "turn.completed") {
        await api(`/agent-runs/${runId}/usage`, "POST", { source: "runtime", inputTokens: event.usage.input_tokens, cachedInputTokens: event.usage.cached_input_tokens, outputTokens: event.usage.output_tokens, totalTokens: event.usage.input_tokens + event.usage.output_tokens });
        await observe(runId, "system", "turn.completed", "O runtime encerrou o turno e reportou o consumo.", "Turno concluído");
      }
      if (event.type === "turn.failed" || event.type === "error") throw new Error(event.type === "error" ? event.message : event.error.message);
    }
    if (latestAnswer) await api(`/agent-questions/${latestAnswer.id}/acknowledge`, "POST", {});
    const dispatchFlush = await api<any>(`/agent-runs/${runId}/dispatches/flush`, "POST", {});
    run = await api<any>(`/agent-runs/${runId}`);
    const pending = run.questions.some((question: any) => question.status === "pending");
    const requiredPending = Boolean(dispatchFlush.requiredPending) || run.status === "waiting_dependency";
    const completedSteps = run.steps.filter((step: any) => step.status === "completed");
    const failedSteps = run.steps.filter((step: any) => step.status === "failed");
    if (shouldWriteFallbackReport(run)) await api(`/agent-runs/${runId}/report`, "POST", {
        outcome: pending || requiredPending ? "waiting_input" : failedSteps.length ? "partial" : "succeeded",
        summary: pending ? "O agente avançou até precisar de uma decisão do proprietário." : requiredPending ? "O agente consolidou as consultas e aguarda pareceres obrigatórios para continuar." : finalMessage.slice(0, 8000) || "O runtime encerrou a execução sem uma mensagem final detalhada.",
        diagnosis: failedSteps.length ? "Um ou mais passos estruturados foram marcados como falha." : null,
        successes: completedSteps.map((step: any) => step.result || `Passo concluído: ${step.title}`),
        failures: failedSteps.map((step: any) => step.result || `Falha no passo: ${step.title}`),
        recommendations: pending ? ["Responder à pergunta pendente para recolocar a execução na fila."] : requiredPending ? ["Aguardar os pareceres consolidados; a Central retomará esta mesma execução automaticamente."] : failedSteps.length ? ["Corrigir os passos que falharam e reiniciar a partir do último sucesso."] : ["Revisar as evidências e, se o critério de aceite foi atendido, encaminhar a tarefa para revisão."],
        evidence: [`${run.logs.length} evento(s) técnico(s) e ${run.steps.length} passo(s) preservados na Central.`],
        generatedBy: "BRIDGE-CODEX"
      });
    run = await api<any>(`/agent-runs/${runId}`);
    const alreadyReportedToOwner = run.communications.some((item: any) => item.sourceId === run.agent.id && ["PROPRIETARIO", "proprietario", "owner"].includes(item.targetId) && item.kind === "result");
    if (run.purpose !== "consultation" && !alreadyReportedToOwner) await communicate(runId, run.agent.id, "PROPRIETARIO", "result", pending ? "Execução aguardando resposta do proprietário." : requiredPending ? "Execução aguardando parecer obrigatório de outro agente." : finalMessage || "Execução encerrada; consulte o relatório detalhado.", run.intentId).catch(() => undefined);
    const reportedOutcome = run.report && !run.report.derived ? run.report.outcome : null;
    const finalStatus = requiredPending ? "waiting_dependency" : pending || reportedOutcome === "waiting_input" ? "waiting_input" : reportedOutcome === "cancelled" ? "cancelled" : failedSteps.length || ["partial", "failed"].includes(reportedOutcome) ? "failed" : "succeeded";
    if (run.managementConversationId && !["waiting_input", "waiting_dependency"].includes(finalStatus)) await api(`/management-conversations/${run.managementConversationId}/runtime-responses`, "POST", { runId, sender: run.agent.id, content: finalMessage || run.report?.summary || "A Gestão concluiu a análise; consulte o relatório da execução." });
    await api(`/agent-runs/${runId}`, "PATCH", { status: finalStatus, currentStep: finalStatus === "waiting_dependency" ? "Aguardando parecer obrigatório de outro agente" : finalStatus === "waiting_input" ? "Aguardando resposta do proprietário" : finalStatus === "failed" ? "Execução encerrada com resultados parciais ou falhas" : finalStatus === "cancelled" ? "Execução cancelada pelo runtime" : "Execução concluída" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await observe(runId, "error", "run.failed", message, "Falha da execução");
    const snapshot = await api<any>(`/agent-runs/${runId}`).catch(() => run);
    const completedSteps = snapshot?.steps?.filter((step: any) => step.status === "completed") ?? [];
    const failedSteps = snapshot?.steps?.filter((step: any) => step.status === "failed") ?? [];
    const commandSuccesses = snapshot?.logs?.filter((log: any) => log.eventType === "command.completed" && /código 0/i.test(log.content)).length ?? 0;
    await api(`/agent-runs/${runId}/report`, "POST", {
      outcome: completedSteps.length || commandSuccesses ? "partial" : "failed",
      summary: `A execução foi interrompida: ${message}`,
      diagnosis: message,
      successes: [...completedSteps.map((step: any) => step.result || `Passo concluído: ${step.title}`), ...(commandSuccesses ? [`${commandSuccesses} comando(s) terminaram com código 0 antes da falha.`] : [])],
      failures: [...failedSteps.map((step: any) => step.result || `Falha no passo: ${step.title}`), message],
      recommendations: ["Corrigir a causa informada abaixo.", "Reiniciar a execução a partir do último passo bem-sucedido, preservando este histórico."],
      evidence: [`${snapshot?.logs?.length ?? 0} evento(s) técnico(s) preservado(s) na Central.`],
      generatedBy: "BRIDGE-CODEX"
    }).catch(() => undefined);
    await communicate(runId, run?.agent?.id ?? "BRIDGE-CODEX", "PROPRIETARIO", "result", `Execução falhou: ${message}`, run?.intentId).catch(() => undefined);
    await api(`/agent-runs/${runId}/messages`, "POST", { sender: "BRIDGE-CODEX", kind: "error", content: message }).catch(() => undefined);
    if (run?.managementConversationId) await api(`/management-conversations/${run.managementConversationId}/runtime-responses`, "POST", { runId, sender: "AG-GESTAO", content: `Não consegui concluir esta resposta: ${message}` }).catch(() => undefined);
    await api(`/agent-runs/${runId}`, "PATCH", { status: "failed", currentStep: "Falha registrada pelo bridge" }).catch(() => undefined);
  }
}

console.log("Bridge Codex conectado à Central Operacional. Ctrl+C para encerrar.");
const activeRunIds = new Set<string>();
const activeIntentIds = new Set<string>();
const activeRuns = new Set<Promise<void>>();
while (!stopping) {
  if (activeRuns.size < config.maxAgentConcurrency) {
    const queued = await api<any[]>(`/agent-run-queue?status=queued&limit=${config.maxAgentConcurrency * 4}`).catch(() => []);
    const candidates = queued.filter((run) => run.provider === "codex-local" && !activeRunIds.has(run.id));
    const pendingSpecialistIntents = new Set(candidates.filter((run) => run.purpose !== "management_review" && run.intentId).map((run) => run.intentId));
    const selected: any[] = [];
    const selectedIntentIds = new Set<string>();
    for (const next of candidates) {
      if (selected.length >= config.maxAgentConcurrency - activeRuns.size) break;
      if (next.purpose === "management_review" && next.intentId && pendingSpecialistIntents.has(next.intentId)) continue;
      if (next.intentId && (activeIntentIds.has(next.intentId) || selectedIntentIds.has(next.intentId))) continue;
      selected.push(next);
      if (next.intentId) selectedIntentIds.add(next.intentId);
    }
    for (const next of selected) {
      activeRunIds.add(next.id);
      if (next.intentId) activeIntentIds.add(next.intentId);
      const work = handleRun(next.id).finally(() => { activeRunIds.delete(next.id); if (next.intentId) activeIntentIds.delete(next.intentId); activeRuns.delete(work); });
      activeRuns.add(work);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, activeRuns.size ? 800 : 2500));
}
await Promise.allSettled(activeRuns);
workerLock.close();
