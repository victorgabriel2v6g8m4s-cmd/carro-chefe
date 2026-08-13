type Complexity = "routine" | "standard" | "complex" | "critical";

const programmingSignals = /\b(código|programa(?:ção|r)|typescript|javascript|react|vite|prisma|api|endpoint|webhook|sqlite|banco de dados|ci|deploy|bug|refatora(?:ção|r)|site|software)\b/i;
const criticalSignals = /\b(segurança|produção|pagamento|fiscal|lgpd|migração|perda de dados|arquitetura|autenticação|vulnerabilidade)\b/i;
const complexSignals = /\b(integração|análise completa|comparar|homologar|investigar|diagnosticar|estratégia|conciliação|otimiza(?:ção|r))\b/i;
const routineSignals = /\b(resumir|registrar|revisar texto|organizar|listar|atualizar status|classificar|copy|legenda)\b/i;

export const nonProgrammingAgents = new Set(["AG-GESTAO", "AG-MARKETING", "AG-MIDIAS", "AG-COMPRAS", "AG-OPERACOES", "AG-FINANCAS", "AG-MARCA"]);

export function assessComplexity(text: string, impact = 3, urgency = 3): Complexity {
  if (criticalSignals.test(text) || impact * urgency >= 20) return "critical";
  if (complexSignals.test(text) || impact * urgency >= 15) return "complex";
  if (routineSignals.test(text) && impact * urgency < 12) return "routine";
  return "standard";
}

export function requiresProgramming(text: string) {
  return programmingSignals.test(text);
}

export function selectRuntimeProfile(agentId: string, complexity: Complexity, configuredModel?: string | null) {
  if (agentId === "AG-DEV") {
    if (complexity === "critical") return { model: "gpt-5.6-sol", effort: "high", reason: "implementação técnica crítica" };
    if (complexity === "complex") return { model: "gpt-5.6-sol", effort: "medium", reason: "implementação técnica complexa" };
    return { model: "gpt-5.6-terra", effort: complexity === "routine" ? "low" : "medium", reason: "implementação técnica com custo balanceado" };
  }
  if (complexity === "critical") return { model: configuredModel || "gpt-5.6-sol", effort: "high", reason: "decisão de alto impacto" };
  return { model: configuredModel || "gpt-5.6-terra", effort: complexity === "complex" ? "medium" : "low", reason: "trabalho especializado sem programação" };
}

export function assertAgentScope(agentId: string, objective: string) {
  if (nonProgrammingAgents.has(agentId) && requiresProgramming(objective)) {
    return { allowed: false, message: `${agentId} não executa programação. Encaminhe a implementação ao AG-DEV e mantenha este agente como especialista consultado.` };
  }
  if (agentId === "AG-DADOS" && /\b(editar|implementar|programar|codificar|alterar código)\b/i.test(objective)) {
    return { allowed: false, message: "AG-DADOS define e valida dados; alterações de código pertencem ao AG-DEV." };
  }
  return { allowed: true };
}
