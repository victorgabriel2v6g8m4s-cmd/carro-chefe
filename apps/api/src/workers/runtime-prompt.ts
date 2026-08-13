import { existsSync } from "node:fs";
import path from "node:path";
import type { UserInput } from "@openai/codex-sdk";
import { config } from "../config";
import { buildRuntimeContract } from "./agent-runtime-contract";
import { runtimeApiBase } from "./runtime-api";

const uploadRoot = path.join(config.projectRoot, ".runtime", "uploads");

export function makeRuntimeInput(run: any, prompt: string): string | UserInput[] {
  const uploads = run.intent?.uploads ?? []; if (!uploads.length) return prompt;
  const images: UserInput[] = [], files: string[] = [];
  for (const upload of uploads) { const local = path.join(uploadRoot, upload.storageName); if (!local.startsWith(uploadRoot) || !existsSync(local)) continue; if (["image/png", "image/jpeg", "image/webp"].includes(upload.mimeType)) images.push({ type: "local_image", path: local }); else files.push(`- ${upload.originalName}: ${local}`); }
  return [{ type: "text", text: `${prompt}${files.length ? `\nArquivos anexados:\n${files.join("\n")}` : ""}` }, ...images];
}

export function buildRunPrompt(run: any, handoffs: string[], latestAnswer: any) {
  const contract = buildRuntimeContract(runtimeApiBase, run.id, run.agent.id);
  if (latestAnswer) return `Resposta do proprietário para “${latestAnswer.question}”: ${latestAnswer.answer}. Continue do ponto salvo e registre somente novidades.${contract}`;
  return `Agente: ${run.agent.name} (${run.agent.id}). Missão exclusiva: ${run.agent.mission}\nObjetivo: ${run.objective}\nTarefa ${run.task.id}: ${run.task.title}\nStatus: ${run.task.status}${run.task.statusJustification ? ` — ${run.task.statusJustification}` : ""}\nAceite: ${run.task.acceptance}${handoffs.length ? `\nHandoffs relevantes:\n${handoffs.join("\n")}` : ""}\nPerfil: complexidade ${run.complexity}; ${run.routingReason || "política adaptativa"}.\nNão trabalhe fora da sua especialidade. Agentes não técnicos não editam código; programação pertence ao AG-DEV. AG-GESTAO monitora, prioriza e decide, sem repetir especialistas. Não compre, publique, faça deploy ou altere serviços externos sem autorização. Use o mínimo de leituras e chamadas.${contract}`;
}
