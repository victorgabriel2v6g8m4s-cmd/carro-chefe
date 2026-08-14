export function buildRuntimeContract(apiBase: string, runId: string, agentId: string) {
  const runBase = `${apiBase}/agent-runs/${runId}`;
  return `
Contrato operacional da Central (use diretamente; não procure o schema no código):
- Passo: POST ${runBase}/steps com {"order":1,"title":"...","description":"...","status":"pending|in_progress|completed|failed","procedure":"...","result":"..."}. Não existe campo evidence no passo.
- Atualização: POST ${runBase}/messages com {"sender":"${agentId}","kind":"update|decision|error","content":"..."}.
- Pergunta: POST ${runBase}/questions com {"question":"...","context":"...","recommendation":"...","options":[],"blocking":true,"askedBy":"${agentId}"}.
- Relatório: POST ${runBase}/report com {"outcome":"succeeded|partial|failed|waiting_input|cancelled","summary":"...","diagnosis":null,"successes":[],"failures":[],"recommendations":[],"evidence":[],"generatedBy":"${agentId}"}.
- Comunicação: POST ${runBase}/communications com {"sourceId":"${agentId}","targetId":"AG-GESTAO|PROPRIETARIO|outro agente","kind":"coordination|handoff|result|update","status":"delivered","summary":"...","metadata":{}}.
- Navegador integrado: POST ${runBase}/browser-navigations com {"actor":"${agentId}","targetType":"url|file|upload","target":"...","title":"...","reason":"..."}. Use para levar o proprietário à página ou arquivo exato que você validou; arquivos precisam estar dentro do projeto e URLs devem ser HTTP(S).
- Artefato final: grave somente em output/ e registre com POST ${runBase}/artifacts usando {"path":"output/...","title":"..."}. A resposta traz uploadId, contentUrl e viewerRoute; use contentUrl como evidência no relatório.
- Ver navegador: GET ${runBase}/browser-state retorna URL, título, texto visível e controles. Controlar: POST ${runBase}/browser-actions com {"action":"click_text|type|scroll|back|reload","text":"...","selector":"...","deltaY":600}. Leia o estado novamente depois de agir; não use a sessão pessoal do usuário.
- O bridge registra consumo e estado terminal; não envie usage e não altere o status final da execução.
- Em PowerShell 5.1, converta o JSON com [Text.Encoding]::UTF8.GetBytes e use Content-Type application/json; charset=utf-8. Nunca canalize código Unicode com @'...'@ | node -, porque o pipeline legado troca acentos por interrogações. A API rejeita texto corrompido em vez de salvá-lo.
- Se a API rejeitar um campo, leia details na resposta e corrija somente o payload. Não vasculhe o repositório para redescobrir este contrato.

Economia de contexto (obrigatória):
- Use a tarefa, o critério de aceite e este contrato como fonte inicial. Não faça inventário geral do repositório.
- Consulte o terminal somente quando o objetivo exigir arquivos ou código. Agentes diferentes do AG-DEV não usam terminal para programar.
- Antes de cada leitura, formule qual informação faltante ela responde. Prefira uma única busca dirigida com rg e leia somente o trecho correspondente.
- Não releia arquivos, status, logs ou schemas já presentes no prompt. Reutilize resultados e handoffs registrados.
- Para pesquisa de negócio, use fontes oficiais/web e registre o resultado; não leia o código da Central.
- Faça validação proporcional ao risco. Evite dumps extensos de arquivos, banco ou logs; abra apenas o trecho necessário e resuma saídas grandes.
- Não crie plano detalhado para tarefa rotineira. Registre apenas passos que produzam decisão, evidência ou entrega.
- Se o contexto fornecido bastar, execute diretamente e finalize o relatório.`;
}

export function shouldWriteFallbackReport(run: { report?: { derived?: boolean } | null }) {
  return !run.report || run.report.derived === true;
}
