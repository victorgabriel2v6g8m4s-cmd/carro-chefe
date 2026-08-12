import { existsSync } from "node:fs";
import path from "node:path";
import { Codex, type ThreadEvent, type UserInput } from "@openai/codex-sdk";
import { config } from "../config";
import { holdWorkerPort } from "./singleton";

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
  if (!response.ok) throw new Error(data.error ?? `API ${response.status}`);
  return data as T;
}

async function writeLog(runId: string, channel: "activity" | "terminal" | "system" | "error", eventType: string, content = "", title?: string) {
  const chunks = content ? content.match(/[\s\S]{1,45000}/g) ?? [""] : [""];
  for (const [index, chunk] of chunks.entries()) {
    await api(`/agent-runs/${runId}/logs`, "POST", { channel, eventType, title: index ? undefined : title, content: chunk });
  }
}

function safeJson(value: unknown) {
  try { return JSON.stringify(value, null, 2); }
  catch { return String(value); }
}

async function recordItem(runId: string, event: Extract<ThreadEvent, { type: "item.started" | "item.updated" | "item.completed" }>, commandOutputs: Map<string, string>) {
  const item = event.item;
  if (item.type === "command_execution") {
    if (event.type === "item.started") await writeLog(runId, "terminal", "command.started", `$ ${item.command}\n`, item.command);
    const previous = commandOutputs.get(item.id) ?? "";
    const current = item.aggregated_output ?? "";
    const delta = current.startsWith(previous) ? current.slice(previous.length) : current;
    if (delta) await writeLog(runId, "terminal", "command.output", delta, item.command);
    commandOutputs.set(item.id, current);
    if (event.type === "item.completed") {
      await writeLog(runId, item.status === "failed" ? "error" : "terminal", "command.completed", `\n[processo encerrado com código ${item.exit_code ?? "desconhecido"}]\n`, item.command);
      commandOutputs.delete(item.id);
    }
    return;
  }
  if (event.type !== "item.completed" && !(event.type === "item.started" && ["web_search", "mcp_tool_call"].includes(item.type))) return;
  if (item.type === "reasoning" && item.text) await writeLog(runId, "activity", "reasoning.completed", item.text, "Raciocínio resumido pelo Codex");
  if (item.type === "web_search") await writeLog(runId, "activity", event.type === "item.started" ? "web_search.started" : "web_search.completed", item.query, "Pesquisa na web");
  if (item.type === "file_change") await writeLog(runId, item.status === "failed" ? "error" : "activity", "file_change.completed", item.changes.map((change) => `${change.kind}: ${change.path}`).join("\n"), "Arquivos alterados");
  if (item.type === "mcp_tool_call") {
    const details = event.type === "item.started" ? safeJson(item.arguments) : item.error?.message ?? safeJson(item.result?.structured_content ?? item.result?.content ?? "Concluído");
    await writeLog(runId, item.status === "failed" ? "error" : "activity", event.type === "item.started" ? "tool.started" : "tool.completed", details, `${item.server} · ${item.tool}`);
  }
  if (item.type === "error") await writeLog(runId, "error", "item.error", item.message, "Erro do runtime");
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
  const latestAnswer = run.questions.find((question: any) => question.status === "answered" && !question.acknowledgedAt);
  const prompt = latestAnswer
    ? `O proprietário respondeu na Central Operacional à pergunta "${latestAnswer.question}": ${latestAnswer.answer}. Continue a tarefa do ponto em que parou. Registre passos, atualizações e novas perguntas na API da Central.`
    : `Você é ${run.agent.name} (${run.agent.id}) no projeto Carro Chefe. Objetivo: ${run.objective}\nTarefa: ${run.task.id} — ${run.task.title}.\nUse a Central Operacional em ${apiBase} para registrar passos, mensagens, consumo e perguntas. Se precisar de decisão humana, POSTe em /agent-runs/${run.id}/questions e encerre o turno aguardando resposta. Não compre, publique, faça deploy ou altere serviços externos sem autorização explícita. Execute o trabalho, valide e mantenha o escopo desta tarefa.`;

  const commandOutputs = new Map<string, string>();
  try {
    await writeLog(runId, "system", "run.connected", "Bridge local conectado ao runtime do Codex.", "Execução iniciada");
    const streamed = await thread.runStreamed(makeInput(run, prompt));
    for await (const event of streamed.events) {
      await api(`/agent-runs/${runId}/heartbeat`, "POST", {});
      if (event.type === "thread.started") await api(`/agent-runs/${runId}`, "PATCH", { status: "running", currentStep: "Codex conectado à execução", externalThreadId: event.thread_id });
      if (event.type === "turn.started") await writeLog(runId, "system", "turn.started", "O Codex começou a processar o objetivo.", "Turno iniciado");
      if (["item.started", "item.updated", "item.completed"].includes(event.type)) await recordItem(runId, event as Extract<ThreadEvent, { type: "item.started" | "item.updated" | "item.completed" }>, commandOutputs);
      if (event.type === "item.completed" && event.item.type === "todo_list") {
        for (const [index, item] of event.item.items.entries()) await api(`/agent-runs/${runId}/steps`, "POST", { order: index + 1, title: item.text, status: item.completed ? "completed" : "pending" });
        await writeLog(runId, "activity", "todo.updated", event.item.items.map((item) => `${item.completed ? "✓" : "○"} ${item.text}`).join("\n"), "Plano de trabalho");
      }
      if (event.type === "item.completed" && event.item.type === "agent_message") await api(`/agent-runs/${runId}/messages`, "POST", { sender: run.agent.id, kind: "update", content: event.item.text });
      if (event.type === "turn.completed") {
        await api(`/agent-runs/${runId}/usage`, "POST", { source: "runtime", inputTokens: event.usage.input_tokens, cachedInputTokens: event.usage.cached_input_tokens, outputTokens: event.usage.output_tokens, totalTokens: event.usage.input_tokens + event.usage.output_tokens });
        await writeLog(runId, "system", "turn.completed", "O runtime encerrou o turno e reportou o consumo.", "Turno concluído");
      }
      if (event.type === "turn.failed" || event.type === "error") throw new Error(event.type === "error" ? event.message : event.error.message);
    }
    if (latestAnswer) await api(`/agent-questions/${latestAnswer.id}/acknowledge`, "POST", {});
    run = await api<any>(`/agent-runs/${runId}`);
    const pending = run.questions.some((question: any) => question.status === "pending");
    await api(`/agent-runs/${runId}`, "PATCH", { status: pending ? "waiting_input" : "succeeded", currentStep: pending ? "Aguardando resposta do proprietário" : "Execução concluída" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeLog(runId, "error", "run.failed", message, "Falha da execução").catch(() => undefined);
    await api(`/agent-runs/${runId}/messages`, "POST", { sender: "BRIDGE-CODEX", kind: "error", content: message }).catch(() => undefined);
    await api(`/agent-runs/${runId}`, "PATCH", { status: "failed", currentStep: "Falha registrada pelo bridge" }).catch(() => undefined);
  }
}

console.log("Bridge Codex conectado à Central Operacional. Ctrl+C para encerrar.");
const activeRunIds = new Set<string>();
const activeRuns = new Set<Promise<void>>();
while (!stopping) {
  if (activeRuns.size < config.maxAgentConcurrency) {
    const queued = await api<any[]>("/agent-runs?status=queued").catch(() => []);
    for (const next of queued.filter((run) => run.provider === "codex-local" && !activeRunIds.has(run.id)).slice(0, config.maxAgentConcurrency - activeRuns.size)) {
      activeRunIds.add(next.id);
      const work = handleRun(next.id).finally(() => { activeRunIds.delete(next.id); activeRuns.delete(work); });
      activeRuns.add(work);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, activeRuns.size ? 800 : 2500));
}
await Promise.allSettled(activeRuns);
workerLock.close();
