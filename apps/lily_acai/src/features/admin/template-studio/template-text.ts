const VARIABLE = /\{\{\s*(\d+)\s*\}\}/g;

export function normalizeVariableName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

type TextComponent = { type: string; text?: unknown };

export function ensureVariableNames(components: TextComponent[], names: string[]) {
  const max = Math.max(0, ...components.flatMap((component) => typeof component.text === "string"
    ? [...component.text.matchAll(VARIABLE)].map((match) => Number(match[1])) : []));
  return Array.from({ length: Math.max(max, names.length) }, (_, index) => names[index] || `variavel_${index + 1}`);
}

export function variableUsage(components: TextComponent[], number: number) {
  const matcher = new RegExp(`\\{\\{\\s*${number}\\s*\\}\\}`, "g");
  return components.reduce((count, component) => count + (typeof component.text === "string" ? [...component.text.matchAll(matcher)].length : 0), 0);
}

export function removeVariable(components: TextComponent[], names: string[], number: number) {
  const updated = components.map((component) => {
    if (typeof component.text !== "string") return component;
    const text = component.text.replace(VARIABLE, (match, rawNumber: string) => {
      const found = Number(rawNumber);
      return found === number ? "" : found > number ? `{{${found - 1}}}` : match;
    });
    return { ...component, text };
  });
  return { components: updated, variableNames: names.filter((_, index) => index !== number - 1) };
}

