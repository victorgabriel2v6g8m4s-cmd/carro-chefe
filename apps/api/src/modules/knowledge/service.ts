import { prisma, type Prisma } from "@carro-chefe/database";
import { parseJson } from "../../lib/errors";

export type KnowledgeSource = {
  actor: string;
  sourceType: "prompt" | "agent_output" | "manual" | "runtime";
  sourceId?: string | null;
  sourceRunId?: string | null;
  sourceIntentId?: string | null;
  attachmentIds?: string[];
};

type KnowledgeCandidate = {
  path: string;
  name: string;
  value: string;
  valueType: "text" | "address" | "decision" | "contact" | "url" | "number" | "list";
  verificationStatus: "informed" | "pending_verification" | "verified" | "derived";
};

const rootLabels: Record<string, string> = {
  estabelecimento: "Estabelecimento", pessoas: "Pessoas", operacao: "Operação", cardapio: "Cardápio",
  sistemas: "Sistemas", marca: "Marca", marketing: "Marketing", financeiro: "Financeiro",
  fornecedores: "Fornecedores", decisoes: "Decisões", arquivos: "Arquivos", outros: "Outros"
};

export function normalizeKnowledgeSegment(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
}

export function normalizeKnowledgePath(value: string) {
  return value.split(/[/.>]+/).map((part) => normalizeKnowledgeSegment(part)).filter(Boolean).join("/").slice(0, 500);
}

function displayName(segment: string) {
  return rootLabels[segment] ?? segment.split("-").map((word) => word ? word[0].toLocaleUpperCase("pt-BR") + word.slice(1) : word).join(" ");
}

function unique<T>(items: T[]) { return [...new Set(items)]; }

export function extractKnowledgeCandidates(text: string): KnowledgeCandidate[] {
  const compact = text.replace(/\s+/g, " ").trim();
  const candidates: KnowledgeCandidate[] = [];
  const add = (candidate: KnowledgeCandidate) => {
    const value = candidate.value.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, "");
    if (value.length >= 2 && !candidates.some((item) => item.path === candidate.path && item.value === value)) candidates.push({ ...candidate, value });
  };

  const explicit = [...compact.matchAll(/(?:salv(?:e|ar)|registr(?:e|ar))?\s*\[?([\p{L}\d_-]+(?:\s*[/.>]\s*[\p{L}\d_-]+)+)\]?\s*(?:=|:)\s*([^.;\n]{2,600})/giu)];
  for (const match of explicit) add({ path: normalizeKnowledgePath(match[1]), name: displayName(normalizeKnowledgePath(match[1]).split("/").at(-1)!), value: match[2], valueType: "text", verificationStatus: "informed" });

  const address = compact.match(/(?:o\s+endere[cç]o(?:\s+do\s+estabelecimento)?\s+(?:[ée]|fica\s+em|:)|(?:estabelecimento|loja|quiosque)\s+(?:fica|est[áa]\s+localizad[oa])\s+(?:na|no|em))\s+([^.;\n]{6,300})/iu);
  if (address && /\d|\b(?:rua|avenida|av\.?|rodovia|estrada|travessa|alameda|pra[cç]a|bairro|cep)\b/iu.test(address[1])) add({ path: "estabelecimento/endereco", name: "Endereço", value: address[1], valueType: "address", verificationStatus: "informed" });

  const erp = compact.match(/\berp\s+(?:vai\s+ser|ser[áa]|[ée]|escolhido\s+(?:[ée]|foi)|selecionado\s+(?:[ée]|foi)|utilizado\s+(?:[ée]|ser[áa]))\s+(?:o\s+)?["“]?([^,.;”]+?)(?=\s+(?:mas|por[ée]m|e\s+(?:verifique|confirme|valide))\b|[,.;]|$)/iu);
  if (erp) add({ path: "sistemas/erp/selecionado", name: "ERP selecionado", value: erp[1], valueType: "text", verificationStatus: "pending_verification" });

  const phone = compact.match(/(?:whatsapp|telefone|contato)\s*(?:business)?\s*(?:[ée]|:)?\s*(\(?\d{2}\)?\s*9?\s*\d{4}[-\s]?\d{4})/iu);
  if (phone) add({ path: "estabelecimento/contatos/telefone", name: "Telefone", value: phone[1], valueType: "contact", verificationStatus: "informed" });
  const email = compact.match(/\b([\w.+-]+@[\w.-]+\.[a-z]{2,})\b/iu);
  if (email) add({ path: "estabelecimento/contatos/email", name: "E-mail", value: email[1], valueType: "contact", verificationStatus: "informed" });
  const site = compact.match(/\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s,;]*)?)/iu);
  if (site && !site[1].includes("@")) add({ path: "estabelecimento/contatos/site", name: "Site", value: site[1], valueType: "url", verificationStatus: "informed" });

  const decision = compact.match(/(?:fica\s+decidido|fica\s+definido|decidimos|definimos|a\s+decis[aã]o\s+[ée]|vamos\s+(?:usar|utilizar|adotar))\s+(?:que\s+)?([^.!?\n]{8,700})/iu);
  if (decision) {
    const slug = normalizeKnowledgeSegment(decision[1].split(/\s+/).slice(0, 10).join(" "));
    add({ path: `decisoes/capturadas/${slug}`, name: decision[1].slice(0, 100), value: decision[1], valueType: "decision", verificationStatus: "informed" });
  }
  return candidates.slice(0, 12);
}

async function ensurePath(tx: Prisma.TransactionClient, rawPath: string, source: KnowledgeSource) {
  const path = normalizeKnowledgePath(rawPath);
  let parentId: string | null = null;
  let current = "";
  let node: any = null;
  for (const segment of path.split("/")) {
    current = current ? `${current}/${segment}` : segment;
    node = await tx.knowledgeNode.findUnique({ where: { projectId_path: { projectId: "carro-chefe", path: current } } });
    if (!node) node = await tx.knowledgeNode.create({ data: { projectId: "carro-chefe", parentId, slug: segment, name: displayName(segment), path: current,
      kind: "branch", createdBy: source.actor, sourceType: source.sourceType, sourceId: source.sourceId, sourceRunId: source.sourceRunId, sourceIntentId: source.sourceIntentId } });
    parentId = node.id;
  }
  return node;
}

export async function upsertKnowledgeValue(tx: Prisma.TransactionClient, candidate: KnowledgeCandidate, source: KnowledgeSource, references: unknown[] = []) {
  const node = await ensurePath(tx, candidate.path, source);
  const updated = await tx.knowledgeNode.update({ where: { id: node.id }, data: { name: candidate.name, kind: "fact", value: candidate.value,
    valueType: candidate.valueType, verificationStatus: candidate.verificationStatus, referencesJson: JSON.stringify(references), sourceType: source.sourceType,
    sourceId: source.sourceId, sourceRunId: source.sourceRunId, sourceIntentId: source.sourceIntentId, createdBy: source.actor, status: "active", version: { increment: 1 } } });
  for (const uploadId of unique(source.attachmentIds ?? [])) await tx.knowledgeNodeAttachment.upsert({ where: { nodeId_uploadId: { nodeId: node.id, uploadId } },
    update: {}, create: { nodeId: node.id, uploadId } });
  await tx.auditEvent.create({ data: { actor: source.actor, action: "knowledge_saved", entityType: "knowledge_node", entityId: node.id,
    summary: `${updated.path}: ${candidate.value}`.slice(0, 1000), beforeJson: node.value ? JSON.stringify({ value: node.value, version: node.version }) : null,
    afterJson: JSON.stringify({ path: updated.path, value: updated.value, version: updated.version, sourceType: source.sourceType, sourceId: source.sourceId }) } });
  return updated;
}

export async function capturePromptKnowledge(tx: Prisma.TransactionClient, text: string, source: KnowledgeSource) {
  const candidates = extractKnowledgeCandidates(text);
  const nodes = [];
  for (const candidate of candidates) nodes.push(await upsertKnowledgeValue(tx, candidate, source));
  return nodes;
}

export function presentKnowledgeNode(node: any) {
  return { ...node, references: parseJson(node.referencesJson, []), referencesJson: undefined,
    childCount: node._count?.children ?? node.childCount ?? 0, attachmentCount: node._count?.attachments ?? node.attachments?.length ?? 0,
    attachments: node.attachments?.map((item: any) => ({ ...item.upload, contentUrl: `/api/v1/uploads/${item.upload.id}/content?disposition=inline`, viewerRoute: `/gestao/visualizador?uploadId=${encodeURIComponent(item.upload.id)}` })) };
}

const prefixHints: Array<[RegExp, string[]]> = [
  [/endere[cç]o|localiza[cç][aã]o|im[oó]vel|loja|quiosque/iu, ["estabelecimento"]],
  [/equipe|funcion[aá]ri|parrilheiro|atendente|conferente/iu, ["pessoas/equipe"]],
  [/cozinha|pia|fog[aã]o|exaust[aã]o|equipamento|layout|planta/iu, ["operacao/cozinha", "estabelecimento"]],
  [/erp|pdv|fiscal|integra[cç][aã]o|sistema/iu, ["sistemas"]],
  [/card[aá]pio|produto|lanche|espeto|ingrediente/iu, ["cardapio"]],
  [/marca|logo|embalagem|identidade/iu, ["marca"]],
  [/marketing|tr[aá]fego|campanha|instagram/iu, ["marketing"]],
  [/fornecedor|compra|cota[cç][aã]o|insumo/iu, ["fornecedores"]],
  [/decis[aã]o|decidid|definid/iu, ["decisoes"]]
];

export async function getRelevantKnowledge(query: string, limit = 12) {
  const normalized = normalizeKnowledgeSegment(query).replaceAll("-", " ");
  const tokens = unique(normalized.split(/\s+/).filter((token) => token.length >= 3)).slice(0, 30);
  const prefixes = unique(prefixHints.filter(([pattern]) => pattern.test(query)).flatMap(([, values]) => values));
  const nodes = await prisma.knowledgeNode.findMany({ where: { status: "active", kind: "fact", OR: prefixes.length ? prefixes.map((path) => ({ path: { startsWith: path } })) : undefined },
    include: { attachments: { include: { upload: true }, take: 3 } }, orderBy: { updatedAt: "desc" }, take: 160 });
  return nodes.map((node) => {
    const haystack = normalizeKnowledgeSegment(`${node.path} ${node.name} ${node.value ?? ""}`).replaceAll("-", " ");
    const score = (prefixes.some((prefix) => node.path.startsWith(prefix)) ? 12 : 0) + tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 2 : 0), 0);
    return { node, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || b.node.updatedAt.getTime() - a.node.updatedAt.getTime())
    .slice(0, Math.max(1, Math.min(30, limit))).map((item) => presentKnowledgeNode(item.node));
}
