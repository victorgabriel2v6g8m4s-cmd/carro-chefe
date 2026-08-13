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
