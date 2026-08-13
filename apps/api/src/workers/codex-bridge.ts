import { existsSync } from "node:fs";
import path from "node:path";
import { Codex, type ThreadEvent, type UserInput } from "@openai/codex-sdk";
import { config } from "../config";
import { holdWorkerPort } from "./singleton";
import { buildRuntimeContract, shouldWriteFallbackReport } from "./agent-runtime-contract";

const codex = new Codex();
const apiBase = `http://127.0.0.1:${config.port}/api/v1`;
const uploadRoot = path.join(config.projectRoot, ".runtime", "uploads");
const workerLock = await holdWorkerPort(4174, "Bridge Codex");
if (!workerLock) process.exit(0);
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

async function api<T>(route: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${route}`, {
    method,
    headers: { "Content-Type": "application/json", ...(config.agentApiKey ? { "X-Agent-Key": config.agentApiKey } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details) ? data.details.map((item: any) => `${item.path?.join(".") || "campo"}: ${item.message}`).join("; ") : data.details ? safeJson(data.details) : "";
    throw new Error([data.error ?? `API ${response.status}`, details].filter(Boolean).join(" — "));
  }
  return data as T;
}

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

function makeInput(run: any, prompt: string): string | UserInput[] {
  const uploads = run.intent?.uploads ?? [];
  if (!uploads.length) return prompt;
  const imageInputs: UserInput[] = [];
  const fileLines: string[] = [];
  for (const upload of uploads) {
    const localPath = path.join(uploadRoot, upload.storageName);
    if (!localPath.startsWith(uploadRoot) || !existsSync(localPath)) continue;
    if (["image/png", "image/jpeg", "image/webp"].includes(upload.mimeType)) imageInputs.push({ type: "local_image", path: localPath });
    else fileLines.push(`- ${upload.originalName} (${upload.mimeType}): ${localPath}`);
  }
  const attachmentContext = fileLines.length ? `\n\nArquivos anexados disponíveis no workspace:\n${fileLines.join("\n")}` : "";
  return [{ type: "text", text: `${prompt}${attachmentContext}` }, ...imageInputs];
}

async function handleRun(runId: string) {
  let run: any;
  try { run = await api<any>(`/agent-runs/${runId}/claim`, "POST", {}); }
  catch (error) { if (String(error).includes("fila")) return; throw error; }

  const thread = run.externalThreadId
    ? codex.resumeThread(run.externalThreadId, { workingDirectory: config.projectRoot, sandboxMode: "workspace-write", approvalPolicy: "never", networkAccessEnabled: true })
    : codex.startThread({ workingDirectory: config.projectRoot, sandboxMode: "workspace-write", approvalPolicy: "never", networkAccessEnabled: true, modelReasoningEffort: "high" });
  const intent = run.intentId ? await api<any>(`/intents/${run.intentId}`).catch(() => null) : null;
  const priorRuns = intent?.runs?.filter((item: any) => item.id !== run.id && ["succeeded", "failed"].includes(item.status)) ?? [];
  const handoffs: string[] = [];
  for (const prior of priorRuns) {
    const summary = prior.report?.summary || prior.messages?.at(-1)?.content;
    if (!summary) continue;
    handoffs.push(`${prior.agent.name} (${prior.agentId}): ${summary}`);
    await communicate(runId, prior.agentId, run.agent.id, "handoff", summary, run.intentId).catch(() => undefined);
  }
  const latestAnswer = run.questions.find((question: any) => question.status === "answered" && !question.acknowledgedAt);
  const runtimeContract = buildRuntimeContract(apiBase, run.id, run.agent.id);
  const prompt = latestAnswer
    ? `O proprietário respondeu na Central Operacional à pergunta "${latestAnswer.question}": ${latestAnswer.answer}. Continue a tarefa do ponto em que parou. Registre passos, atualizações e novas perguntas na API da Central.${runtimeContract}`
    : `Você é ${run.agent.name} (${run.agent.id}) no projeto Carro Chefe. Objetivo: ${run.objective}\nTarefa: ${run.task.id} — ${run.task.title}.${handoffs.length ? `\n\nResultados recebidos de outros agentes envolvidos:\n${handoffs.join("\n")}` : ""}\nUse a Central Operacional em ${apiBase} para registrar passos, mensagens, relatório final e perguntas. Se precisar de decisão humana, registre a pergunta e encerre o turno aguardando resposta. Não compre, publique, faça deploy ou altere serviços externos sem autorização explícita. Execute o trabalho, valide e mantenha o escopo desta tarefa.${runtimeContract}`;

  const commandOutputs = new Map<string, string>();
  let finalMessage = "";
  try {
    await observe(runId, "system", "run.connected", "Bridge local conectado ao runtime do Codex.", "Execução iniciada");
    const streamed = await thread.runStreamed(makeInput(run, prompt));
    for await (const event of streamed.events) {
      await api(`/agent-runs/${runId}/heartbeat`, "POST", {});
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
    run = await api<any>(`/agent-runs/${runId}`);
    const pending = run.questions.some((question: any) => question.status === "pending");
    const completedSteps = run.steps.filter((step: any) => step.status === "completed");
    const failedSteps = run.steps.filter((step: any) => step.status === "failed");
    if (shouldWriteFallbackReport(run)) await api(`/agent-runs/${runId}/report`, "POST", {
        outcome: pending ? "waiting_input" : failedSteps.length ? "partial" : "succeeded",
        summary: pending ? "O agente avançou até precisar de uma decisão do proprietário." : finalMessage.slice(0, 8000) || "O runtime encerrou a execução sem uma mensagem final detalhada.",
        diagnosis: failedSteps.length ? "Um ou mais passos estruturados foram marcados como falha." : null,
        successes: completedSteps.map((step: any) => step.result || `Passo concluído: ${step.title}`),
        failures: failedSteps.map((step: any) => step.result || `Falha no passo: ${step.title}`),
        recommendations: pending ? ["Responder à pergunta pendente para recolocar a execução na fila."] : failedSteps.length ? ["Corrigir os passos que falharam e reiniciar a partir do último sucesso."] : ["Revisar as evidências e, se o critério de aceite foi atendido, encaminhar a tarefa para revisão."],
        evidence: [`${run.logs.length} evento(s) técnico(s) e ${run.steps.length} passo(s) preservados na Central.`],
        generatedBy: run.agent.id
      });
    const alreadyReportedToOwner = run.communications.some((item: any) => item.sourceId === run.agent.id && ["PROPRIETARIO", "proprietario", "owner"].includes(item.targetId) && item.kind === "result");
    if (!alreadyReportedToOwner) await communicate(runId, run.agent.id, "PROPRIETARIO", "result", pending ? "Execução aguardando resposta do proprietário." : finalMessage || "Execução encerrada; consulte o relatório detalhado.", run.intentId).catch(() => undefined);
    const reportedOutcome = run.report && !run.report.derived ? run.report.outcome : null;
    const finalStatus = pending || reportedOutcome === "waiting_input" ? "waiting_input" : reportedOutcome === "cancelled" ? "cancelled" : failedSteps.length || ["partial", "failed"].includes(reportedOutcome) ? "failed" : "succeeded";
    await api(`/agent-runs/${runId}`, "PATCH", { status: finalStatus, currentStep: finalStatus === "waiting_input" ? "Aguardando resposta do proprietário" : finalStatus === "failed" ? "Execução encerrada com resultados parciais ou falhas" : finalStatus === "cancelled" ? "Execução cancelada pelo runtime" : "Execução concluída" });
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
    await api(`/agent-runs/${runId}`, "PATCH", { status: "failed", currentStep: "Falha registrada pelo bridge" }).catch(() => undefined);
  }
}

console.log("Bridge Codex conectado à Central Operacional. Ctrl+C para encerrar.");
const activeRunIds = new Set<string>();
const activeIntentIds = new Set<string>();
const activeRuns = new Set<Promise<void>>();
while (!stopping) {
  if (activeRuns.size < config.maxAgentConcurrency) {
    const queued = await api<any[]>("/agent-runs?status=queued").catch(() => []);
    const candidates = queued.filter((run) => run.provider === "codex-local" && !activeRunIds.has(run.id));
    const selected: any[] = [];
    const selectedIntentIds = new Set<string>();
    for (const next of candidates) {
      if (selected.length >= config.maxAgentConcurrency - activeRuns.size) break;
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
