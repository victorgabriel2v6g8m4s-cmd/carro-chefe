export function buildRuntimeContract(apiBase: string, runId: string, agentId: string, commands?: { send: string; question: string; artifact: string; remember?: string; recall?: string }) {
  const send = commands?.send ?? `node tools/agent-runtime.mjs send ${runId}`;
  const question = commands?.question ?? `node tools/agent-runtime.mjs question ${runId}`;
  const artifact = commands?.artifact ?? `node tools/agent-runtime.mjs artifact ${runId}`;
  const remember = commands?.remember ?? `node tools/agent-runtime.mjs remember ${runId}`;
  const recall = commands?.recall ?? `node tools/agent-runtime.mjs recall ${runId}`;
  return `
Protocolo operacional compacto (a Central completa vínculos, contexto, auditoria e lote):
- Progresso, terminal, passos derivados do plano, mensagem final, consumo e relatório de contingência são registrados automaticamente pelo bridge. Não monte JSON nem faça POST manual para esses registros.
- Consultar outro agente: ${send} AG-ALVO "mensagem curta" --data "ponteiro opcional" --depends "TASK-X,DEC-Y" --unlock "TASK-Z". Acrescente --required somente se a resposta for indispensável para continuar. Solicitações opcionais ficam acumuladas e a Central cria uma única execução por agente de destino.
- Perguntar ao proprietário: ${question} "pergunta" --context "por que a decisão é necessária" --recommend "recomendação" --options "A,B". Use apenas quando a resposta humana bloquear o trabalho.
- Registrar artefato: ${artifact} "caminho/dentro/do/workspace" --title "nome legível".
- Salvar informação reutilizável: ${remember} "ramo/subramo/nome" "valor objetivo" --name "nome legível" --type "text|address|decision|contact|url|number|list". Use quando o prompt ou a análise trouxer um fato que outro agente precisará consultar.
- Consultar um fato específico: ${recall} "estabelecimento/endereco". Consulte por caminho; nunca carregue a árvore inteira.
- Navegador integrado: POST ${apiBase}/agent-runs/${runId}/browser-navigations apenas quando precisar levar o proprietário ao resultado visual. Para inspecionar/controlar, use browser-state e browser-actions descritos no contexto da execução.
- O agente atual é ${agentId}. O helper identifica a execução; não repita tarefa, intenção, ator, timestamp ou metadados no payload.

Economia de contexto (obrigatória):
- Comece pelo contexto já entregue. Não inventarie o repositório, não releia arquivos e não consulte schema/log/status já presentes no prompt.
- A cápsula de política já foi validada por hash. Se você for AG-DEV e alterar o projeto, execute npm run policy:preflight -- --scope <caminho-alvo> antes da primeira edição; leia somente a cadeia de fontes indicada. Agentes de negócio não executam esse fluxo técnico nem programam.
- Use terminal somente quando a entrega exigir arquivo ou código. Agentes não técnicos não programam e escrevem apenas no workspace isolado informado.
- Prefira uma busca dirigida e um trecho pequeno. Evite dumps de arquivos, banco, rede ou logs.
- Para pesquisa de negócio, use fontes primárias e devolva apenas fatos, links e ressalvas relevantes.
- Ao final, escreva uma única resposta conclusiva. O bridge a exibirá logo abaixo do prompt e produzirá o relatório operacional.
- Nunca publique, compre, faça deploy ou altere serviço externo sem autorização explícita.`;
}

export function shouldWriteFallbackReport(run: { report?: { derived?: boolean; generatedBy?: string } | null }) {
  return !run.report || run.report.derived === true || run.report.generatedBy === "BRIDGE-CODEX";
}
