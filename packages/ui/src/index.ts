export const statusLabels: Record<string, string> = {
  backlog: "Backlog", ready: "Pronta", in_progress: "Em andamento", blocked: "Bloqueada",
  review: "Em revisão", done: "Concluída", cancelled: "Cancelada", queued: "Na fila",
  running: "Executando", waiting_input: "Aguardando resposta", succeeded: "Concluída",
  failed: "Falhou", pending: "Pendente", completed: "Concluído", acknowledged: "Recebida pelo agente",
  answered: "Respondida", open: "Aberta", monitoring: "Monitoramento", planned: "Planejada", researching: "Pesquisando",
  validating: "Validando"
};

export const formatDate = (value?: string | Date | null) => value
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" }).format(new Date(value))
  : "—";

export const priority = (task: { impact: number; urgency: number }) => task.impact * task.urgency;
