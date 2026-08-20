export const common = {
  actions: {
    close: "Fechar",
    open: "Abrir",
    view: "Ver",
    remove: "Remover",
    retry: "Tentar novamente",
  },
  states: {
    loading: "Carregando…",
    loadingData: "Carregando dados…",
    unavailable: "Indisponível",
    noUpdates: "Sem atualizações.",
    noFiles: "Nenhum arquivo anexado.",
  },
  references: {
    attachedFile: "Arquivo anexado",
    attachFiles: "Anexar imagens e documentos",
    removeFile: "Remover arquivo",
    search: "Digite @ para buscar tarefas, decisões, riscos e arquivos do escopo.",
    noMatches: "Nenhuma referência encontrada para este termo.",
    openReference: "Abrir referência",
    removeReference: "Remover referência",
  },
} as const;
