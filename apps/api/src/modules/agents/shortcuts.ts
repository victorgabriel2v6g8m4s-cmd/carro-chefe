import { parseJson } from "../../lib/errors";

export type ExecutionShortcut = {
  id: "create_task" | "delegate_agents" | "save_information" | "open_knowledge";
  label: string;
  description: string;
  route: string;
  emphasis: "primary" | "secondary";
};

export function buildExecutionShortcuts(run: any): ExecutionShortcut[] {
  if (run.agentId !== "AG-GESTAO" || !run.report) return [];
  const recommendations = parseJson<string[]>(run.report.recommendationsJson, []);
  const text = `${run.report.summary ?? ""} ${run.report.diagnosis ?? ""} ${recommendations.join(" ")}`;
  const shortcuts: ExecutionShortcut[] = [];
  const actionable = recommendations.length > 0 || /pr[oó]ximo passo|implementar|criar|corrigir|acompanhar|providenciar|contratar/iu.test(text);
  const reusableInformation = /endere[cç]o|decis[aã]o|definid|erp|fornecedor|equipamento|capacidade|equipe|contato|prazo|or[cç]amento|requisito/iu.test(text);
  const specialistWork = /deleg|agente|especialista|pesquis|validar|verificar|marketing|opera[cç][aã]o|finan[cç]as|desenvolvimento|dados/iu.test(text);

  if (actionable) shortcuts.push({ id: "create_task", label: "Criar tarefa", description: "Transformar o próximo passo em trabalho rastreável.",
    route: `/gestao/tarefas?createFromRun=${encodeURIComponent(run.id)}`, emphasis: "primary" });
  if (run.taskId && specialistWork) shortcuts.push({ id: "delegate_agents", label: "Delegar agentes", description: "Abrir a delegação já vinculada à tarefa.",
    route: `/gestao/agentes?taskId=${encodeURIComponent(run.taskId)}#delegar`, emphasis: "secondary" });
  if (reusableInformation) shortcuts.push({ id: "save_information", label: "Salvar informações", description: "Revisar e registrar este resultado na memória operacional.",
    route: `/gestao/conhecimento?createFromRun=${encodeURIComponent(run.id)}`, emphasis: "secondary" });
  if (reusableInformation) shortcuts.push({ id: "open_knowledge", label: "Abrir árvore", description: "Consultar os ramos já estruturados.",
    route: "/gestao/conhecimento", emphasis: "secondary" });
  return shortcuts;
}
