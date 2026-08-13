import { parseJson } from "../../lib/errors";

type RunLike = {
  status: string;
  steps?: Array<{ title: string; status: string; result?: string | null }>;
  messages?: Array<{ kind: string; content: string }>;
  logs?: Array<{ sequence?: number; channel: string; eventType: string; title?: string | null; content: string; createdAt?: Date | string }>;
  report?: any;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function friendlyFailure(raw: string) {
  if (/requires a newer version of Codex/i.test(raw)) return { cause: "O runtime do Codex instalado era mais antigo que a versão exigida pelo modelo selecionado.", recommendation: "Atualizar o Codex e reiniciar o Supervisor antes de repetir a execução." };
  if (/entrada inv[aá]lida/i.test(raw)) return { cause: "A Central rejeitou um registro enviado pelo bridge porque um campo não respeitou o contrato da API.", recommendation: "Repetir a execução após validar os campos do bridge; a telemetria não deve interromper a tarefa." };
  if (/rate|429|muitas solicita/i.test(raw)) return { cause: "A execução excedeu temporariamente um limite de requisições.", recommendation: "Aguardar a janela indicada e repetir a partir do último passo concluído." };
  if (/network|fetch failed|ECONN|socket|conex/i.test(raw)) return { cause: "Houve perda de comunicação entre o bridge e um serviço necessário.", recommendation: "Confirmar o estado verde do Supervisor e repetir a partir do último passo concluído." };
  return { cause: raw || "O runtime encerrou a execução sem fornecer uma causa específica.", recommendation: "Abrir o último evento técnico, corrigir a causa indicada e reiniciar a execução preservando os passos concluídos." };
}

export function presentReport(report: any) {
  if (!report) return null;
  return { ...report, successes: parseJson<string[]>(report.successesJson, []), failures: parseJson<string[]>(report.failuresJson, []), recommendations: parseJson<string[]>(report.recommendationsJson, []), evidence: parseJson<string[]>(report.evidenceJson, []), successesJson: undefined, failuresJson: undefined, recommendationsJson: undefined, evidenceJson: undefined };
}

export function deriveRunReport(run: RunLike) {
  if (run.report) return presentReport(run.report);
  const steps = run.steps ?? [];
  const messages = run.messages ?? [];
  const logs = run.logs ?? [];
  const commandSuccesses = logs.filter((log) => log.eventType === "command.completed" && /c[oó]digo 0/i.test(log.content));
  const failures = unique([
    ...steps.filter((step) => step.status === "failed").map((step) => step.result || `Falha no passo: ${step.title}`),
    ...messages.filter((message) => message.kind === "error").map((message) => message.content),
    ...logs.filter((log) => log.channel === "error" || log.eventType.includes("failed")).map((log) => log.content || log.title)
  ]);
  const primary = friendlyFailure(failures.at(-1) ?? "");
  const successes = unique([
    ...steps.filter((step) => step.status === "completed").map((step) => step.result || `Passo concluído: ${step.title}`),
    commandSuccesses.length ? `${commandSuccesses.length} comando(s) terminaram com código de saída 0 antes do encerramento.` : null,
    messages.some((message) => message.kind === "update") ? "O agente registrou atualizações de contexto e progresso na Central." : null
  ]);
  const active = ["queued", "running", "waiting_input"].includes(run.status);
  const substantiveSuccesses = steps.some((step) => step.status === "completed") || commandSuccesses.length > 0;
  const outcome = run.status === "succeeded" ? "succeeded" : run.status === "failed" && substantiveSuccesses ? "partial" : run.status;
  return {
    outcome,
    summary: active ? `A execução está ${run.status === "waiting_input" ? "aguardando uma resposta" : "em andamento"}. O relatório final será consolidado ao encerrar.` : run.status === "succeeded" ? "A execução foi encerrada com sucesso pelo runtime." : `A execução foi interrompida após ${successes.length} resultado(s) bem-sucedido(s) e ${failures.length || 1} falha(s).`,
    diagnosis: run.status === "failed" ? primary.cause : null,
    successes,
    failures: failures.length ? failures : run.status === "failed" ? [primary.cause] : [],
    recommendations: run.status === "failed" ? [primary.recommendation, "Reiniciar a partir do último passo concluído; não apagar o histórico anterior."] : [],
    evidence: unique([steps.length ? `${steps.length} passo(s) estruturado(s) registrado(s).` : null, logs.length ? `${logs.length} evento(s) técnico(s) preservado(s) no log.` : null]),
    generatedBy: "diagnóstico automático",
    derived: true
  };
}

export function deriveJourney(run: RunLike) {
  const steps = run.steps ?? [];
  if (steps.length) return steps.map((step, index) => ({ id: `step-${index + 1}`, order: index + 1, title: step.title, status: step.status, detail: step.result ?? null }));
  const logs = [...(run.logs ?? [])].sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0));
  const journey = logs.filter((log) => ["run.connected", "turn.started", "command.completed", "file_change.completed", "tool.completed", "web_search.completed", "run.failed", "turn.completed"].includes(log.eventType)).map((log, index) => {
    const command = log.eventType === "command.completed";
    const failed = log.channel === "error" || /failed|c[oó]digo (?!0)/i.test(`${log.eventType} ${log.content}`);
    const compactTitle = command ? `Comando ${index + 1} executado` : log.title || log.eventType;
    const detail = command ? `${(log.title || "Comando do agente").slice(0, 220)} — ${log.content.trim() || "encerrado"}` : log.content;
    return { id: `log-${log.sequence ?? index}`, order: index + 1, title: compactTitle, status: failed ? "failed" : log.eventType === "run.connected" || log.eventType === "turn.started" ? "in_progress" : "completed", detail, createdAt: log.createdAt };
  });
  return journey.slice(-40);
}
