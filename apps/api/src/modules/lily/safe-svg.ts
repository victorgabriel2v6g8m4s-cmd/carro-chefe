const allowedElements = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask"
]);

const allowedAttributes = new Set([
  "xmlns", "viewBox", "width", "height", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity", "transform", "d", "cx", "cy", "r", "rx",
  "ry", "x", "y", "x1", "y1", "x2", "y2", "points", "offset", "stop-color", "stop-opacity", "gradientUnits",
  "gradientTransform", "id", "clip-path", "mask", "preserveAspectRatio", "version"
]);

const numericOrGeometryAttributes = new Set([
  "width", "height", "stroke-width", "opacity", "fill-opacity", "stroke-opacity", "cx", "cy", "r", "rx", "ry",
  "x", "y", "x1", "y1", "x2", "y2", "offset", "stop-opacity"
]);

/** Accepts only static, self-contained vector artwork. Active SVG/XML features are rejected. */
export function sanitizeLilySvg(source: string): string {
  if (Buffer.byteLength(source, "utf8") > 1024 * 1024) throw new Error("SVG acima do limite de 1 MB.");
  if (/<!|<\?|&(?:#\d+|#x[\da-f]+|[a-z][\w.-]*);/i.test(source)) throw new Error("SVG contém declarações ou entidades não permitidas.");

  const tokens = source.match(/<[^>]*>|[^<]+/g) ?? [];
  if (tokens.join("") !== source) throw new Error("SVG inválido.");
  const stack: string[] = [];
  const ids = new Set<string>();
  const references: string[] = [];
  const output: string[] = [];
  let rootSeen = false;
  let rootClosed = false;

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      if (token.trim()) throw new Error("SVG com texto não vetorial não é permitido.");
      continue;
    }
    if (rootClosed) throw new Error("SVG contém conteúdo após o elemento raiz.");

    const closing = token.match(/^<\/([A-Za-z][\w:-]*)\s*>$/);
    if (closing) {
      const name = closing[1]!;
      if (stack.pop() !== name) throw new Error("SVG possui elementos fora de ordem.");
      output.push(`</${name}>`);
      if (!stack.length) rootClosed = true;
      continue;
    }

    const opening = token.match(/^<([A-Za-z][\w:-]*)([\s\S]*?)\s*(\/?)>$/);
    if (!opening) throw new Error("SVG possui marcação inválida.");
    const [, name, rawAttributes, selfClosing] = opening;
    if (!allowedElements.has(name!)) throw new Error(`Elemento SVG não permitido: ${name}.`);
    if (!rootSeen && name !== "svg") throw new Error("O elemento raiz do arquivo deve ser <svg>.");
    if (rootSeen && !stack.length) throw new Error("SVG contém mais de um elemento raiz.");
    rootSeen = true;

    const attrs: string[] = [];
    const rest = rawAttributes!;
    let cursor = 0;
    const attrPattern = /([A-Za-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gy;
    while (cursor < rest.length) {
      const whitespace = rest.slice(cursor).match(/^\s+/)?.[0].length ?? 0;
      cursor += whitespace;
      if (cursor >= rest.length) break;
      if (/^\s*$/.test(rest.slice(cursor))) break;
      attrPattern.lastIndex = cursor;
      const match = attrPattern.exec(rest);
      if (!match) throw new Error("Atributo SVG inválido.");
      cursor = attrPattern.lastIndex;
      const [, attr, doubleQuoted, singleQuoted] = match;
      const value = doubleQuoted ?? singleQuoted ?? "";
      if (!allowedAttributes.has(attr!)) throw new Error(`Atributo SVG não permitido: ${attr}.`);
      if (attr === "xmlns" && value !== "http://www.w3.org/2000/svg") throw new Error("Namespace SVG inválido.");
      if (attrs.some((item) => item.startsWith(`${attr}=`))) throw new Error(`Atributo SVG duplicado: ${attr}.`);
      if (/url\s*\(/i.test(value) && !/^url\(#[A-Za-z_][\w.-]*\)$/.test(value)) throw new Error("Referências externas em SVG não são permitidas.");
      if ((attr === "fill" || attr === "stroke" || attr === "clip-path" || attr === "mask") && value.startsWith("url(#")) {
        references.push(value.slice(5, -1));
      }
      if (attr === "id") {
        if (!/^[A-Za-z_][\w.-]{0,63}$/.test(value) || ids.has(value)) throw new Error("Identificador SVG inválido.");
        ids.add(value);
      }
      if (numericOrGeometryAttributes.has(attr!) && !/^(?:-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|%)?)(?:\s+-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|%)?)*$/.test(value)) {
        throw new Error(`Valor vetorial inválido em ${attr}.`);
      }
      if (["fill", "stroke", "stop-color"].includes(attr!) && !/^(?:none|currentColor|#[\da-f]{3,8}|[a-z]{1,24}|url\(#[A-Za-z_][\w.-]*\))$/i.test(value)) {
        throw new Error(`Cor SVG inválida em ${attr}.`);
      }
      attrs.push(`${attr}="${value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;")}"`);
    }

    const tag = `<${name}${attrs.length ? ` ${attrs.join(" ")}` : ""}${selfClosing ? "/" : ""}>`;
    output.push(tag);
    if (!selfClosing) stack.push(name!);
    else if (!stack.length) rootClosed = true;
  }

  if (!rootSeen || !rootClosed || stack.length || references.some((id) => !ids.has(id))) throw new Error("SVG incompleto ou com referências inválidas.");
  return output.join("");
}
