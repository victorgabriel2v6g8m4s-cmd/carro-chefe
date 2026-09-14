import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ignoredDirectories = new Set([".git", ".runtime", "dist", "node_modules", "output"]);
const compareText = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const supportedPolicySchemaVersion = 1;

type PolicySource = { path: string; kind: "rules" | "agents" | "capsules"; sha256: string };
type PolicyRegion = { inheritance: string[]; sourcePaths: string[]; capsuleIds: string[] };

export type PolicyManifest = {
  schemaVersion: number;
  policyVersion: string;
  runtimeBudgetChars: number;
  sources: PolicySource[];
  capsules: Record<string, string>;
  agentCapsules: Record<string, string[]>;
  businessAgentIds: string[];
  regions: Record<string, PolicyRegion>;
  manifestHash: string;
};

export type AgentPolicyContext = {
  sourceRoot: string;
  policyVersion: string;
  manifestHash: string;
  scope: string;
  sourcePaths: string[];
  sourceHashes: PolicySource[];
  capsuleIds: string[];
  capsule: string;
  runtimeChars: number;
  runtimeBudgetChars: number;
};

const toPosix = (value: string) => value.split(path.sep).join("/");
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function discoverAgentPaths(projectRoot: string, directory = projectRoot): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await discoverAgentPaths(projectRoot, absolutePath));
    if (entry.isFile() && entry.name === "AGENTS.md") paths.push(toPosix(path.relative(projectRoot, absolutePath)));
  }
  return paths.sort(compareText);
}

function sourceAbsolutePath(projectRoot: string, sourcePath: string) {
  const absolutePath = path.resolve(projectRoot, ...sourcePath.split("/"));
  const relative = path.relative(projectRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Fonte de política fora do projeto: ${sourcePath}`);
  return absolutePath;
}

export async function verifyPolicyManifest(projectRoot: string, manifest: PolicyManifest) {
  if (manifest.schemaVersion !== supportedPolicySchemaVersion) {
    throw new Error(`Versão de schema de política não suportada: ${manifest.schemaVersion}.`);
  }
  if (!manifest.policyVersion || !Number.isFinite(manifest.runtimeBudgetChars) || manifest.runtimeBudgetChars <= 0) {
    throw new Error("Versão ou orçamento do manifesto de política é inválido.");
  }
  const manifestWithoutHash = { ...manifest } as Partial<PolicyManifest>;
  delete manifestWithoutHash.manifestHash;
  if (sha256(stableJson(manifestWithoutHash)) !== manifest.manifestHash) {
    throw new Error("Hash interno do manifesto de política é inválido.");
  }

  const discoveredAgents = await discoverAgentPaths(projectRoot);
  const declaredAgents = manifest.sources.filter((source) => source.kind === "agents").map((source) => source.path).sort(compareText);
  if (stableJson(discoveredAgents) !== stableJson(declaredAgents)) {
    throw new Error("A cadeia AGENTS.md mudou e o manifesto de política está desatualizado.");
  }

  for (const source of manifest.sources) {
    const content = await fs.readFile(sourceAbsolutePath(projectRoot, source.path), "utf8");
    if (sha256(content) !== source.sha256) throw new Error(`Fonte de política alterada: ${source.path}.`);
  }
}

export async function loadPolicyManifest(projectRoot: string): Promise<PolicyManifest> {
  const manifestPath = path.join(projectRoot, ".agent-policy", "manifest.json");
  const raw = await fs.readFile(manifestPath, "utf8").catch(() => {
    throw new Error("Manifesto de política ausente. Execute npm run policy:build e revise o diff.");
  });
  const manifest = JSON.parse(raw) as PolicyManifest;
  await verifyPolicyManifest(projectRoot, manifest);
  return manifest;
}

function isAncestorScope(ancestor: string, scope: string) {
  return ancestor === "." || scope === ancestor || scope.startsWith(`${ancestor}/`);
}

export function inferPolicyScope(manifest: PolicyManifest, scopeHint: string) {
  const normalizedHint = toPosix(scopeHint).replace(/\\/g, "/").toLocaleLowerCase("pt-BR");
  return Object.keys(manifest.regions)
    .filter((scope) => scope !== "." && normalizedHint.includes(scope.toLocaleLowerCase("pt-BR")))
    .sort((left, right) => right.length - left.length)[0] ?? ".";
}

function roleCapsuleIds(manifest: PolicyManifest, agentId: string) {
  if (agentId === "AG-DEV") return manifest.agentCapsules["AG-DEV"] ?? [];
  if (manifest.businessAgentIds.includes(agentId)) return manifest.agentCapsules.business ?? [];
  throw new Error(`Agente sem política explícita: ${agentId}`);
}

export function resolvePolicyContext(manifest: PolicyManifest, agentId: string, scopeHint: string, sourceRoot = "."): AgentPolicyContext {
  const inferredScope = inferPolicyScope(manifest, scopeHint);
  const scope = Object.keys(manifest.regions)
    .filter((candidate) => isAncestorScope(candidate, inferredScope))
    .sort((left, right) => right.length - left.length)[0] ?? ".";
  const region = manifest.regions[scope];
  if (!region) throw new Error(`Escopo de política não encontrado: ${scope}`);
  const capsuleIds = [...new Set([...region.capsuleIds, ...roleCapsuleIds(manifest, agentId)])];
  const capsule = capsuleIds.map((capsuleId) => `[${capsuleId}] ${manifest.capsules[capsuleId]}`).join("\n");
  if (capsule.length > manifest.runtimeBudgetChars) {
    throw new Error(`Cápsula ${scope}/${agentId} excede o orçamento de ${manifest.runtimeBudgetChars} caracteres.`);
  }
  return {
    sourceRoot,
    policyVersion: manifest.policyVersion,
    manifestHash: manifest.manifestHash,
    scope,
    sourcePaths: region.sourcePaths,
    sourceHashes: region.sourcePaths.map((sourcePath) => {
      const source = manifest.sources.find((candidate) => candidate.path === sourcePath);
      if (!source) throw new Error(`Fonte ausente no manifesto: ${sourcePath}`);
      return source;
    }),
    capsuleIds,
    capsule,
    runtimeChars: capsule.length,
    runtimeBudgetChars: manifest.runtimeBudgetChars
  };
}

export async function loadPolicyContext(projectRoot: string, agentId: string, scopeHint: string) {
  return resolvePolicyContext(await loadPolicyManifest(projectRoot), agentId, scopeHint, projectRoot);
}

export function formatPolicyPrompt(context: AgentPolicyContext) {
  const sources = context.sourceHashes.map((source) => `${source.path}@${source.sha256.slice(0, 12)}`).join(", ");
  return `\nPolítica obrigatória ${context.policyVersion} (sha256:${context.manifestHash}; escopo ${context.scope}; ${context.runtimeChars}/${context.runtimeBudgetChars} caracteres).\nFontes verificadas, relativas à raiz ${context.sourceRoot}: ${sources}. Leia somente essa cadeia quando precisar consultar a regra integral.\n${context.capsule}`;
}

export function policyAuditPayload(context: AgentPolicyContext) {
  return {
    policyVersion: context.policyVersion,
    manifestHash: context.manifestHash,
    scope: context.scope,
    sourceHashes: context.sourceHashes,
    capsuleIds: context.capsuleIds,
    runtimeChars: context.runtimeChars,
    runtimeBudgetChars: context.runtimeBudgetChars
  };
}
