import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const ignoredDirectories = new Set([".git", ".runtime", "dist", "node_modules", "output"]);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

export const toPosix = (value) => value.split(path.sep).join("/");

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function discoverAgentFiles(projectRoot, directory = projectRoot) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const discovered = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) discovered.push(...await discoverAgentFiles(projectRoot, absolutePath));
    if (entry.isFile() && entry.name === "AGENTS.md") discovered.push(toPosix(path.relative(projectRoot, absolutePath)));
  }
  return discovered.sort(compareText);
}

const scopeFromAgentPath = (agentPath) => {
  const scope = path.posix.dirname(agentPath);
  return scope === "." ? "." : scope;
};

const isAncestor = (ancestor, scope) => ancestor === "." || scope === ancestor || scope.startsWith(`${ancestor}/`);

function resolveAgentCapsules(settings, agentId) {
  if (agentId === "AG-DEV") return settings.agentCapsules["AG-DEV"];
  if (settings.businessAgentIds.includes(agentId)) return settings.agentCapsules.business;
  throw new Error(`Agente sem política explícita: ${agentId}`);
}

export async function buildManifest(projectRoot) {
  const settingsPath = path.join(projectRoot, ".agent-policy", "capsules.json");
  const settingsRaw = await fs.readFile(settingsPath, "utf8");
  const settings = JSON.parse(settingsRaw);
  const agentPaths = await discoverAgentFiles(projectRoot);
  if (!agentPaths.includes("AGENTS.md")) throw new Error("AGENTS.md raiz não encontrado.");

  const sourcePaths = ["REGRAS.md", ".agent-policy/capsules.json", ...agentPaths];
  const sourceContents = new Map();
  for (const sourcePath of sourcePaths) {
    sourceContents.set(sourcePath, await fs.readFile(path.join(projectRoot, ...sourcePath.split("/")), "utf8"));
  }

  const scopes = agentPaths.map(scopeFromAgentPath).sort(compareText);
  const regions = {};
  for (const scope of scopes) {
    const chainScopes = scopes.filter((candidate) => isAncestor(candidate, scope)).sort((left, right) => {
      const depth = left.split("/").length - right.split("/").length;
      return depth || compareText(left, right);
    });
    const agentsChain = chainScopes.map((chainScope) => chainScope === "." ? "AGENTS.md" : `${chainScope}/AGENTS.md`);
    const regionCapsules = Object.entries(settings.regionCapsules)
      .filter(([configuredScope]) => isAncestor(configuredScope, scope))
      .sort(([left], [right]) => left.split("/").length - right.split("/").length || compareText(left, right))
      .flatMap(([, capsuleIds]) => capsuleIds);
    regions[scope] = {
      inheritance: chainScopes,
      sourcePaths: ["REGRAS.md", ...agentsChain],
      capsuleIds: [...settings.commonCapsuleIds, ...regionCapsules]
    };
  }

  const manifestWithoutHash = {
    schemaVersion: settings.schemaVersion,
    policyVersion: settings.policyVersion,
    runtimeBudgetChars: settings.runtimeBudgetChars,
    sources: sourcePaths.sort(compareText).map((sourcePath) => ({
      path: sourcePath,
      kind: sourcePath === "REGRAS.md" ? "rules" : sourcePath.endsWith("AGENTS.md") ? "agents" : "capsules",
      sha256: sha256(sourceContents.get(sourcePath))
    })),
    capsules: settings.capsules,
    agentCapsules: settings.agentCapsules,
    businessAgentIds: settings.businessAgentIds,
    regions
  };
  const manifestHash = sha256(stableJson(manifestWithoutHash));
  return { ...manifestWithoutHash, manifestHash };
}

export function renderManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function assertManifestCurrent(projectRoot) {
  const expected = renderManifest(await buildManifest(projectRoot));
  const manifestPath = path.join(projectRoot, ".agent-policy", "manifest.json");
  const current = await fs.readFile(manifestPath, "utf8").catch(() => "");
  if (current !== expected) {
    throw new Error("Manifesto de política ausente ou desatualizado. Execute npm run policy:build e revise o diff.");
  }
  return JSON.parse(current);
}

export function resolvePolicyCapsule(manifest, agentId, scopeHint = ".") {
  const normalizedHint = toPosix(scopeHint).replace(/^\.\//, "").replace(/^\/+|\/+$/g, "") || ".";
  const matchingScope = Object.keys(manifest.regions)
    .filter((scope) => isAncestor(scope, normalizedHint))
    .sort((left, right) => right.length - left.length)[0] ?? ".";
  const roleCapsules = resolveAgentCapsules(manifest, agentId);
  const capsuleIds = [...new Set([...manifest.regions[matchingScope].capsuleIds, ...roleCapsules])];
  const capsule = capsuleIds.map((id) => `[${id}] ${manifest.capsules[id]}`).join("\n");
  if (capsule.length > manifest.runtimeBudgetChars) {
    throw new Error(`Cápsula ${matchingScope}/${agentId} excede o orçamento de ${manifest.runtimeBudgetChars} caracteres.`);
  }
  return {
    policyVersion: manifest.policyVersion,
    manifestHash: manifest.manifestHash,
    scope: matchingScope,
    sourcePaths: manifest.regions[matchingScope].sourcePaths,
    sourceHashes: manifest.regions[matchingScope].sourcePaths.map((sourcePath) => manifest.sources.find((source) => source.path === sourcePath)),
    capsuleIds,
    capsule,
    runtimeChars: capsule.length,
    runtimeBudgetChars: manifest.runtimeBudgetChars
  };
}
