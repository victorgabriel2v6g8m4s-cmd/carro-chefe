import { assessComplexity } from "../agents/model-policy";

type RoutingRule = {
  id: string;
  subject: string;
  keywords: RegExp;
  agent: string;
  preferredTask?: string;
};

const rules: RoutingRule[] = [
  { id: "erp", subject: "Finanças e ERP", keywords: /\b(erp|pdv|adquirente|fiscal|nota fiscal|contabilidade|concilia(?:ção|r)|meio de pagamento)\b/i, agent: "AG-FINANCAS", preferredTask: "TASK-ERP-001" },
  { id: "development", subject: "Desenvolvimento", keywords: /\b(site|sistema|software|código|programa(?:ção|r)|api|webhook|frontend|backend|react|vite|prisma|deploy|ci|bug)\b/i, agent: "AG-DEV", preferredTask: "TASK-DEV-001" },
  { id: "data", subject: "Dados e analytics", keywords: /\b(dados|analytics|evento|telemetria|métrica|dashboard|painel|dicionário|retenção|pii|lgpd|reconciliação)\b/i, agent: "AG-DADOS", preferredTask: "TASK-DAT-001" },
  { id: "finance", subject: "Finanças", keywords: /\b(custo|orçamento|margem|cmv|preço|precifica(?:ção|r)|caixa|financeir)\b/i, agent: "AG-FINANCAS", preferredTask: "TASK-FIN-001" },
  { id: "procurement", subject: "Pesquisa e compras", keywords: /\b(comprar|compra|fornecedor|equipamento|assinatura|insumo|cotação|mais em conta|avalia(?:ção|do)|garantia)\b/i, agent: "AG-COMPRAS" },
  { id: "operations", subject: "Operações e qualidade", keywords: /\b(opera(?:ção|cional)|fluxo|parrill|cozinha|higiene|sanit|limpeza|estoque|fila|atendimento|receita|gramatura|alerg)\b/i, agent: "AG-OPERACOES" },
  { id: "marketing", subject: "Marketing e crescimento", keywords: /\b(marketing|tráfego|anúncio|campanha|promoção|crm|cliente|conversão|cac|roas)\b/i, agent: "AG-MARKETING" },
  { id: "media", subject: "Mídias e conteúdo", keywords: /\b(instagram|rede social|foto|vídeo|reels|story|conteúdo|copy|legenda|publica(?:ção|r))\b/i, agent: "AG-MIDIAS" },
  { id: "brand", subject: "Marca e experiência", keywords: /\b(marca|logo|identidade|embalagem|etiqueta|quiosque|ambiente|design|fachada|decoração)\b/i, agent: "AG-MARCA" },
  { id: "management", subject: "Gestão e governança", keywords: /\b(decidir|decisão|licença|alvará|prazo|responsável|prioridade|planejamento|gestão|roteiro)\b/i, agent: "AG-GESTAO" }
];

function selectedErp(prompt: string) {
  const match = prompt.match(/\berp\s+(?:vai\s+ser|será|escolhido\s+(?:é|foi)|utilizado\s+(?:é|será))\s+(?:o\s+)?["“]?([^,.;”]+?)(?=\s+(?:mas|porém|e\s+(?:verifique|confirme|valide))\b|[,.;]|$)/i);
  return match?.[1]?.trim().replace(/["”]$/, "") || null;
}

export function classifyIntent(prompt: string) {
  const matched = rules.filter((rule) => rule.keywords.test(prompt));
  const active = matched.length ? matched : [rules.at(-1)!];
  const specialists = [...new Set(active.map((rule) => rule.agent))];
  const managementOnly = specialists.length === 1 && specialists[0] === "AG-GESTAO";
  const agentIds = managementOnly ? specialists : [...specialists, "AG-GESTAO"];
  const preferredTasks = Object.fromEntries(active.filter((rule) => rule.preferredTask).map((rule) => [rule.agent, rule.preferredTask]));
  const erp = selectedErp(prompt);
  return {
    subject: active.map((rule) => rule.subject).filter((value, index, list) => list.indexOf(value) === index).join(" + "),
    summary: erp ? `Registrar ${erp} como ERP informado e verificar aderência aos requisitos.` : `Analisar e executar: ${prompt.slice(0, 180)}${prompt.length > 180 ? "…" : ""}`,
    domains: active.map((rule) => rule.id), agentIds, specialistAgentIds: specialists.filter((id) => id !== "AG-GESTAO"), preferredTasks,
    complexity: assessComplexity(prompt),
    facts: erp ? [{ key: "erp.selected", value: erp, verificationStatus: "pending_verification" }] : []
  };
}
