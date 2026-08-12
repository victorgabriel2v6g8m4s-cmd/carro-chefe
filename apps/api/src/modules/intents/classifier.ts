type RoutingRule = {
  id: string;
  subject: string;
  keywords: RegExp;
  agents: string[];
  preferredTasks?: Record<string, string>;
};

const rules: RoutingRule[] = [
  { id: "erp", subject: "ERP, finanças e integração", keywords: /\b(erp|pdv|adquirente|fiscal|nota fiscal|contabilidade|concilia(?:ção|r)|meio de pagamento)\b/i, agents: ["AG-FINANCAS", "AG-DEV"], preferredTasks: { "AG-FINANCAS": "TASK-ERP-001", "AG-DEV": "TASK-DEV-002" } },
  { id: "development", subject: "Tecnologia e dados", keywords: /\b(site|sistema|software|api|integra(?:ção|r)|webhook|banco de dados|analytics|evento|totem)\b/i, agents: ["AG-DEV"], preferredTasks: { "AG-DEV": "TASK-DAT-001" } },
  { id: "finance", subject: "Finanças", keywords: /\b(custo|orçamento|margem|cmv|preço|precifica(?:ção|r)|caixa|financeir)\b/i, agents: ["AG-FINANCAS"], preferredTasks: { "AG-FINANCAS": "TASK-FIN-001" } },
  { id: "procurement", subject: "Pesquisa e compras", keywords: /\b(comprar|compra|fornecedor|equipamento|assinatura|insumo|cotação|mais em conta|avalia(?:ção|do)|garantia)\b/i, agents: ["AG-COMPRAS"] },
  { id: "operations", subject: "Operações e qualidade", keywords: /\b(opera(?:ção|cional)|fluxo|parrill|cozinha|higiene|sanit|limpeza|estoque|fila|atendimento|receita|gramatura|alerg)\b/i, agents: ["AG-OPERACOES"] },
  { id: "marketing", subject: "Marketing e crescimento", keywords: /\b(marketing|tráfego|anúncio|campanha|promoção|crm|cliente|conversão|cac|roas)\b/i, agents: ["AG-MARKETING"] },
  { id: "media", subject: "Mídias e conteúdo", keywords: /\b(instagram|rede social|foto|vídeo|reels|story|conteúdo|copy|legenda|publica(?:ção|r))\b/i, agents: ["AG-MIDIAS", "AG-MARKETING"] },
  { id: "brand", subject: "Marca e experiência", keywords: /\b(marca|logo|identidade|embalagem|etiqueta|quiosque|ambiente|design|fachada|decoração)\b/i, agents: ["AG-MARCA"] },
  { id: "management", subject: "Gestão e governança", keywords: /\b(decidir|decisão|licença|alvará|prazo|responsável|prioridade|planejamento|gestão)\b/i, agents: ["AG-GESTAO"] }
];

function selectedErp(prompt: string) {
  const match = prompt.match(/\berp\s+(?:vai\s+ser|será|escolhido\s+(?:é|foi)|utilizado\s+(?:é|será))\s+(?:o\s+)?["“]?([^,.;”]+?)(?=\s+(?:mas|porém|e\s+(?:verifique|confirme|valide))\b|[,.;]|$)/i);
  return match?.[1]?.trim().replace(/["”]$/, "") || null;
}

export function classifyIntent(prompt: string) {
  const matched = rules.filter((rule) => rule.keywords.test(prompt));
  const active = matched.length ? matched : [{ id: "management", subject: "Gestão e triagem", agents: ["AG-GESTAO"] } as RoutingRule];
  const agentIds = [...new Set(active.flatMap((rule) => rule.agents))];
  const preferredTasks = Object.assign({}, ...active.map((rule) => rule.preferredTasks ?? {}));
  const erp = selectedErp(prompt);
  return {
    subject: active.map((rule) => rule.subject).filter((value, index, list) => list.indexOf(value) === index).join(" + "),
    summary: erp ? `Registrar ${erp} como ERP informado e verificar aderência aos requisitos.` : `Analisar e executar: ${prompt.slice(0, 180)}${prompt.length > 180 ? "…" : ""}`,
    domains: active.map((rule) => rule.id),
    agentIds,
    preferredTasks,
    facts: erp ? [{ key: "erp.selected", value: erp, verificationStatus: "pending_verification" }] : []
  };
}
