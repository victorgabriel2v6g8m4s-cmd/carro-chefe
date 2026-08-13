export function buildRuntimeContract(apiBase: string, runId: string, agentId: string) {
  const runBase = `${apiBase}/agent-runs/${runId}`;
  return `
Contrato operacional da Central (use diretamente; não procure o schema no código):
- Passo: POST ${runBase}/steps com {"order":1,"title":"...","description":"...","status":"pending|in_progress|completed|failed","procedure":"...","result":"..."}. Não existe campo evidence no passo.
- Atualização: POST ${runBase}/messages com {"sender":"${agentId}","kind":"update|decision|error","content":"..."}.
- Pergunta: POST ${runBase}/questions com {"question":"...","context":"...","recommendation":"...","options":[],"blocking":true,"askedBy":"${agentId}"}.
- Relatório: POST ${runBase}/report com {"outcome":"succeeded|partial|failed|waiting_input|cancelled","summary":"...","diagnosis":null,"successes":[],"failures":[],"recommendations":[],"evidence":[],"generatedBy":"${agentId}"}.
- Comunicação: POST ${runBase}/communications com {"sourceId":"${agentId}","targetId":"AG-GESTAO|PROPRIETARIO|outro agente","kind":"coordination|handoff|result|update","status":"delivered","summary":"...","metadata":{}}.
- O bridge registra consumo e estado terminal; não envie usage e não altere o status final da execução.
- Em PowerShell 5.1, envie JSON como bytes UTF-8 (Encoding.UTF8.GetBytes) ou use Node/fetch; não passe texto Unicode cru em -Body, pois o Content-Length pode ficar incorreto.
- Se a API rejeitar um campo, leia details na resposta e corrija somente o payload. Não vasculhe o repositório para redescobrir este contrato.`;
}

export function shouldWriteFallbackReport(run: { report?: { derived?: boolean } | null }) {
  return !run.report || run.report.derived === true;
}
