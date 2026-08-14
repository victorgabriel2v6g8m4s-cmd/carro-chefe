const replacements: Array<[string, string]> = [
  ["\u00c3\u0192\u00c2", "\u00c3"], ["\u00c3\u0192", "\u00c3"], ["\u00c2\u00a0", " "], ["\u00c2\u00b7", "·"], ["\u00c2\u00b0", "°"],
  ["\u00c3\u00a1", "á"], ["\u00c3\u00a0", "à"], ["\u00c3\u00a2", "â"], ["\u00c3\u00a3", "ã"], ["\u00c3\u00a4", "ä"],
  ["\u00c3\u00a7", "ç"], ["\u00c3\u00a9", "é"], ["\u00c3\u00aa", "ê"], ["\u00c3\u00ad", "í"], ["\u00c3\u00b3", "ó"],
  ["\u00c3\u00b4", "ô"], ["\u00c3\u00b5", "õ"], ["\u00c3\u00ba", "ú"], ["\u00c3\u00c1", "Á"], ["\u00c3\u0089", "É"], ["\u00c3\u0087", "Ç"],
  ["\u00e2\u20ac\u201c", "—"], ["\u00e2\u20ac\u2013", "–"], ["\u00e2\u20ac\u02dc", "‘"], ["\u00e2\u20ac\u2122", "’"],
  ["\u00e2\u20ac\u0153", "“"], ["\u00e2\u20ac\u009d", "”"], ["\u00e2\u20ac\u00a6", "…"], ["\u00e2\u2020\u2019", "→"],
  ["\u00e2\u0153\u201c", "✓"], ["\u00e2\u2014\u2039", "○"], ["\u00ef\u00bc\u2039", "＋"], ["\u00e2\u02dc\u00b0", "☰"], ["\u00e2\u20ac\u2018", "‑"]
];

/** Corrige sequências conhecidas na apresentação; o registro bruto permanece imutável. */
export function repairMojibake(value: string) {
  let next = value;
  for (let pass = 0; pass < 3; pass++) {
    const previous = next;
    for (const [broken, repaired] of replacements) next = next.replaceAll(broken, repaired);
    if (next === previous) break;
  }
  return next;
}

const lostEncodingWords: Array<[RegExp, string]> = [
  [/\bN\?o\b/g, "Não"], [/\bn\?o\b/g, "não"], [/\bPropriet\?rio\b/g, "Proprietário"], [/\bpropriet\?rio\b/g, "proprietário"],
  [/\bAn\?lise\b/g, "Análise"], [/\ban\?lise\b/g, "análise"], [/\bEvid\?ncias?\b/g, "Evidências"], [/\bevid\?ncias?\b/g, "evidências"],
  [/\bposs\?vel\b/g, "possível"], [/\bdispon\?veis\b/g, "disponíveis"], [/\bdispon\?vel\b/g, "disponível"], [/\bt\?cnicos\b/g, "técnicos"], [/\bt\?cnico\b/g, "técnico"], [/\bt\?cnicas\b/g, "técnicas"], [/\bt\?cnica\b/g, "técnica"],
  [/\bexecu\?\?o\b/g, "execução"], [/\bconfigura\?\?o\b/g, "configuração"], [/\bvalida\?\?o\b/g, "validação"], [/\bprodu\?\?o\b/g, "produção"],
  [/\bsolicita\?\?o\b/g, "solicitação"], [/\bcomunica\?\?o\b/g, "comunicação"], [/\batualiza\?\?o\b/g, "atualização"], [/\bopera\?\?o\b/g, "operação"],
  [/\bmedi\?\?es\b/g, "medições"], [/\bmedi\?\?o\b/g, "medição"], [/\bacess\?vel\b/g, "acessível"], [/\bor\?amento\b/g, "orçamento"],
  [/\bm\?dia\b/g, "mídia"], [/\bel\?tricos?\b/g, "elétricos"], [/\bel\?tricas?\b/g, "elétricas"], [/\bexaust\?o\b/g, "exaustão"],
  [/\bdecis\?es\b/g, "decisões"], [/\bdecis\?o\b/g, "decisão"], [/\bconclu\?das\b/g, "concluídas"], [/\bconclu\?da\b/g, "concluída"], [/\bRelat\?rio\b/g, "Relatório"], [/\brelat\?rio\b/g, "relatório"],
  [/\bc\?digo\b/g, "código"], [/\bpr\?ximo\b/g, "próximo"], [/\bap\?s\b/g, "após"], [/\bj\?\b/g, "já"], [/\b\?rea\b/g, "área"],
  [/\b\?rvore\b/g, "árvore"], [/\b\?gua\b/g, "água"], [/\bH\?\b/g, "Há"], [/\bh\?\b/g, "há"], [/\bs\?o\b/g, "são"], [/\best\?\b/g, "está"],
  [/\bp\?blicos\b/g, "públicos"], [/\bp\?blico\b/g, "público"], [/\bp\?blicas\b/g, "públicas"], [/\bp\?blica\b/g, "pública"], [/\baplic\?vel\b/g, "aplicável"], [/\brespons\?vel\b/g, "responsável"],
  [/\bobrigat\?rias\b/g, "obrigatórias"], [/\bobrigat\?ria\b/g, "obrigatória"], [/\bdepend\?ncias\b/g, "dependências"], [/\bdepend\?ncia\b/g, "dependência"], [/\brefer\?ncias\b/g, "referências"], [/\brefer\?ncia\b/g, "referência"], [/\bconte\?do\b/g, "conteúdo"],
  [/\blan\?amento\b/g, "lançamento"], [/\bfog\?o\b/g, "fogão"], [/\bbalc\?o\b/g, "balcão"], [/\bm\?os\b/g, "mãos"],
  [/\butens\?lios\b/g, "utensílios"], [/\bsa\?da\b/g, "saída"], [/\bg\?s\b/g, "gás"], [/\bfam\?lia\b/g, "família"],
  [/\bpe\?as\b/g, "peças"], [/\bM\?dias\b/g, "Mídias"], [/\bCard\?pio\b/g, "Cardápio"], [/\bcard\?pio\b/g, "cardápio"],
  [/\bCarro\?Chefe\b/g, "Carro-Chefe"]
];

/** Repara somente padrões portugueses inequívocos; interrogações legítimas permanecem intactas. */
export function repairLegacyEncodingLoss(value: string) {
  let next = repairMojibake(value);
  for (const [broken, repaired] of lostEncodingWords) next = next.replace(broken, repaired);
  return next;
}

export function containsLikelyEncodingLoss(value: unknown): boolean {
  if (typeof value === "string") return /(?:\bn\?o\b|propriet\?ri|execu\?\?o|an\?lise|evid\?ncia|t\?cnic|decis\?o|configura\?\?o|valida\?\?o|produ\?\?o|relat\?rio|or\?amento|card\?pio)/i.test(value);
  if (Array.isArray(value)) return value.some(containsLikelyEncodingLoss);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(containsLikelyEncodingLoss);
  return false;
}
