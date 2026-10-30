const STOP_COMMAND = /^(sair|parar|cancelar mensagens|não quero mais mensagens|nao quero mais mensagens)$/iu;
const HUMAN_REQUEST = /\b(atendente|pessoa real|humano|falar com alguém|falar com alguem)\b/iu;
const SENSITIVE_TOPIC = /\b(alergia|alérg|alerg|contaminação|contaminacao|estorno|reembolso|cobrança indevida|cobranca indevida|cancelar pedido|cancelamento|pagamento não|pagamento nao|pix não|pix nao)\b/iu;
const PRIVATE_ORDER_QUESTION = /\b(meu pedido|pedido #|pedido número|pedido numero|onde está|onde esta|status do pedido|endereço de entrega|endereco de entrega)\b/iu;
const INJECTION_ATTEMPT = /\b(ignore|desconsidere|revele|mostre|imprima).{0,80}\b(system prompt|instruções internas|instrucoes internas|segredo|token|senha)\b/iu;

export type InboundDecision = "opt_out" | "human" | "private_data" | "answer";

export function classifyInboundMessage(text: string): InboundDecision {
  const normalized = text.normalize("NFKC").trim().slice(0, 4096);
  if (STOP_COMMAND.test(normalized)) return "opt_out";
  if (HUMAN_REQUEST.test(normalized) || SENSITIVE_TOPIC.test(normalized)) return "human";
  if (PRIVATE_ORDER_QUESTION.test(normalized)) return "private_data";
  // Injection attempts remain untrusted input; an answer may use only retrieved public facts.
  if (INJECTION_ATTEMPT.test(normalized)) return "human";
  return "answer";
}

export function validateAssistantReply(text: string) {
  const normalized = text.normalize("NFKC").trim();
  if (!normalized || normalized.length > 1400) return null;
  if (/\b(?:pagamento|pix|pedido|estorno|reembolso).{0,40}\b(?:confirmad[oa]s?|aprovad[oa]s?|concluíd[oa]s?|realizad[oa]s?|cancelad[oa]s?)\b|\b(?:já\s+)?(?:criei|cancelei|estornei|paguei|aprovei|reembolsei)\b/iu.test(normalized)) return null;
  if (/https?:\/\/|www\./iu.test(normalized)) return null;
  return normalized;
}

