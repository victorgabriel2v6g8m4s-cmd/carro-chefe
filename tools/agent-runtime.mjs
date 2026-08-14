#!/usr/bin/env node

const [action, runId, ...args] = process.argv.slice(2);
const base = process.env.CARRO_CHEFE_API ?? "http://127.0.0.1:4173/api/v1";

function flag(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function list(name) {
  return (flag(name, "") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function request(route, body, method = "POST") {
  const response = await fetch(`${base}${route}`, { method, headers: { ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
    ...(process.env.AGENT_API_KEY ? { "X-Agent-Key": process.env.AGENT_API_KEY } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

function usage() {
  console.error("Uso: agent-runtime.mjs send|question|artifact|remember|recall <runId> ...");
  process.exit(2);
}

if (!action || !runId) usage();

try {
  let result;
  if (action === "send") {
    const [to, msg] = args;
    if (!to || !msg) usage();
    result = await request(`/agent-runs/${encodeURIComponent(runId)}/send`, { to, msg, data: flag("--data"),
      isRequiredToProceed: args.includes("--required"), dependencies: list("--depends"), onSuccess: { unlock: list("--unlock") } });
  } else if (action === "question") {
    const [question] = args;
    if (!question) usage();
    result = await request(`/agent-runs/${encodeURIComponent(runId)}/questions`, { question,
      context: flag("--context", "A resposta altera a continuidade desta execução."), recommendation: flag("--recommend"),
      options: list("--options"), blocking: !args.includes("--optional"), askedBy: flag("--by") ?? undefined });
  } else if (action === "artifact") {
    const [artifactPath] = args;
    if (!artifactPath) usage();
    result = await request(`/agent-runs/${encodeURIComponent(runId)}/artifacts`, { path: artifactPath, title: flag("--title") ?? undefined });
  } else if (action === "remember") {
    const [knowledgePath, value] = args;
    if (!knowledgePath || !value) usage();
    result = await request(`/agent-runs/${encodeURIComponent(runId)}/knowledge`, { path: knowledgePath, value,
      name: flag("--name") ?? undefined, valueType: flag("--type", "text"), verificationStatus: args.includes("--verified") ? "verified" : "derived" });
  } else if (action === "recall") {
    const [knowledgePath] = args;
    if (!knowledgePath) usage();
    result = await request(`/knowledge/resolve?path=${encodeURIComponent(knowledgePath)}`, null, "GET");
  } else usage();
  console.log(JSON.stringify({ ok: true, id: result.id, path: result.path, value: result.value, status: result.status, route: result.route ?? result.viewerRoute ?? result.contextRoute }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
