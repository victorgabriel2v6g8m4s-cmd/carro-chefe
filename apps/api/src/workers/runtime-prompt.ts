import { existsSync } from "node:fs";
import path from "node:path";
import type { UserInput } from "@openai/codex-sdk";
import { config } from "../config";
import { buildRuntimeContract } from "./agent-runtime-contract";
import { runtimeApiBase } from "./runtime-api";

const uploadRoot = path.join(config.projectRoot, ".runtime", "uploads");

export function makeRuntimeInput(run: any, prompt: string): string | UserInput[] {
  const uploads = [...new Map([...(run.intent?.uploads ?? []), ...(run.uploads ?? [])].map((upload: any) => [upload.id, upload])).values()] as any[];
  if (!uploads.length) return prompt;
  const images: UserInput[] = [], files: string[] = [];
  for (const upload of uploads) {
    const local = path.join(uploadRoot, upload.storageName);
    if (!local.startsWith(uploadRoot) || !existsSync(local)) continue;
    if (["image/png", "image/jpeg", "image/webp"].includes(upload.mimeType)) images.push({ type: "local_image", path: local });
    else files.push(`- ${upload.originalName}: ${local}`);
  }
  return [{ type: "text", text: `${prompt}${files.length ? `\nArquivos anexados:\n${files.join("\n")}` : ""}` }, ...images];
}

export type RuntimeWorkspace = { mode: "read_only" | "artifacts" | "project"; workingDirectory: string; projectRoot: string };

export function buildRunPrompt(run: any, handoffs: string[], latestAnswer: any, ownerAnswers: Array<{ question: string; answer: string }> = [], workspace: RuntimeWorkspace) {
  const commands = workspace.mode === "artifacts"
    ? { send: ".\\send", question: ".\\ask", artifact: ".\\artifact" }
    : { send: `node tools/agent-runtime.mjs send ${run.id}`, question: `node tools/agent-runtime.mjs question ${run.id}`, artifact: `node tools/agent-runtime.mjs artifact ${run.id}` };
  const contract = buildRuntimeContract(runtimeApiBase, run.id, run.agent.id, commands);
  const decisions = ownerAnswers.length ? `\nDecisões já fornecidas pelo proprietário (não pergunte novamente):\n${ownerAnswers.map((item) => `- ${item.question}: ${item.answer}`).join("\n")}` : "";
  const workspaceRule = workspace.mode === "project"
    ? `\nWorkspace técnico: ${workspace.workingDirectory}. Você pode alterar o projeto porque esta execução pertence ao AG-DEV.`
    : workspace.mode === "artifacts"
      ? `\nWorkspace isolado gravável: ${workspace.workingDirectory}. Você pode criar, editar e excluir arquivos/pastas somente dentro dele. O projeto em ${workspace.projectRoot} é referência somente leitura; não altere código, configuração ou documentação do projeto.`
      : `\nAmbiente somente leitura em ${workspace.projectRoot}. Se precisar produzir um arquivo, peça que a Gestão abra uma execução com capacidade de artefatos.`;
  const dispatchResults = (run.dispatchesSent ?? []).filter((item: any) => item.resultRun).map((item: any) => `${item.targetAgent?.id ?? item.targetAgentId}: ${item.resultRun.report?.summary ?? item.resultRun.messages?.[0]?.content ?? item.status}`);

  if (latestAnswer) {
    const answerContext = `${latestAnswer.answer}${latestAnswer.answerReferences?.length ? `\nReferências selecionadas: ${latestAnswer.answerReferences.map((item: any) => `@${item.id} (${item.label})`).join(", ")}` : ""}${latestAnswer.uploads?.length ? `\nAnexos da resposta: ${latestAnswer.uploads.map((item: any) => item.originalName).join(", ")}` : ""}`;
    return `Resposta do proprietário para “${latestAnswer.question}”: ${answerContext}. Continue do ponto salvo e registre somente novidades.${decisions}${dispatchResults.length ? `\nPareceres recebidos:\n${dispatchResults.join("\n")}` : ""}${workspaceRule}${contract}`;
  }

  const chatHistory = run.purpose === "management_chat" && !run.externalThreadId
    ? (run.managementConversation?.messages ?? []).slice(-12, -1).map((message: any) => `${message.sender}: ${message.content.slice(0, 1500)}`).join("\n")
    : "";
  if (run.purpose === "management_chat") return `Você é ${run.agent.name} (${run.agent.id}), responsável pela coordenação central. Responda ao proprietário sem criar uma tarefa.\nMensagem: ${run.objective}${chatHistory ? `\nContexto recente da conversa:\n${chatHistory}` : ""}\nVocê pode consultar especialistas com o comando send. Marque --required apenas quando depender da resposta; as demais consultas serão acumuladas e despachadas em lote para manter o contexto e economizar tokens.${decisions}${workspaceRule}${contract}`;

  const taskContext = run.task ? `\nTarefa ${run.task.id}: ${run.task.title}\nStatus: ${run.task.status}${run.task.statusJustification ? ` — ${run.task.statusJustification}` : ""}\nAceite: ${run.task.acceptance}` : "";
  return `Agente: ${run.agent.name} (${run.agent.id}). Missão exclusiva: ${run.agent.mission}\nObjetivo: ${run.objective}${taskContext}${handoffs.length ? `\nHandoffs relevantes:\n${handoffs.join("\n")}` : ""}${dispatchResults.length ? `\nPareceres consolidados recebidos:\n${dispatchResults.join("\n")}` : ""}${decisions}\nPerfil: complexidade ${run.complexity}; ${run.routingReason || "política adaptativa"}.\nNão trabalhe fora da sua especialidade. Agentes não técnicos não editam código; programação pertence ao AG-DEV. AG-GESTAO monitora, prioriza e decide, sem repetir especialistas. Use o mínimo de leituras e chamadas.${workspaceRule}${contract}`;
}
