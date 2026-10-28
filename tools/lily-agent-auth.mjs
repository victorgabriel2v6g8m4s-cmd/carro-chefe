#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createAgentBrowserRelay } from "./lily-agent-browser-relay.mjs";

const args = process.argv.slice(2);
const action = args.shift();
const keyFlag = args.indexOf("--key");
const keyPath = path.resolve(keyFlag >= 0 ? args[keyFlag + 1] ?? "" : process.env.COOKLILY_AGENT_SSH_KEY
  ?? path.join(os.homedir(), ".ssh", "cooklily_agent_ed25519"));
const origin = process.env.COOKLILY_AGENT_ORIGIN ?? "https://carrochefe.com";
const namespace = "cooklily-agent-auth";
let apiOrigin = null;

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function usage() {
  console.error("Uso: node tools/lily-agent-auth.mjs login [--key CAMINHO]");
  process.exit(64);
}

function checkedOrigin(value, allowLocalhost) {
  let parsed;
  try { parsed = new URL(value); } catch { return null; }
  const local = ["127.0.0.1", "localhost"].includes(parsed.hostname);
  if ((!local && parsed.protocol !== "https:") || (local && (!allowLocalhost || !["http:", "https:"].includes(parsed.protocol)))
    || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return null;
  return parsed.origin;
}

async function api(route, body) {
  const response = await fetch(`${apiOrigin}/api/v1/lily/auth/agent/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: apiOrigin },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? `Servidor recusou autenticação (HTTP ${response.status}).`);
  return data;
}

function fingerprint(publicKeyPath) {
  const result = spawnSync("ssh-keygen", ["-lf", publicKeyPath], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("Não foi possível ler o fingerprint da chave pública.");
  const value = result.stdout.trim().split(/\s+/)[1];
  if (!/^SHA256:[A-Za-z0-9+/]{43}$/.test(value ?? "")) throw new Error("A chave precisa ser Ed25519 OpenSSH.");
  return value;
}

function signChallenge(challenge) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "cooklily-agent-login-"));
  const inputPath = path.join(directory, "challenge.txt");
  const signaturePath = `${inputPath}.sig`;
  try {
    writeFileSync(inputPath, challenge, { encoding: "utf8", mode: 0o600, flag: "wx" });
    const result = spawnSync("ssh-keygen", ["-Y", "sign", "-f", `${keyPath}.pub`, "-n", namespace, "-U", inputPath], {
      encoding: "utf8", stdio: ["inherit", "ignore", "inherit"], windowsHide: true, timeout: 30_000
    });
    if (result.error || result.status !== 0 || !existsSync(signaturePath)) {
      throw new Error("A chave não assinou o desafio. Confira se ela está carregada no ssh-agent com ssh-add.");
    }
    return readFileSync(signaturePath, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function openBrowser(url) {
  if (process.platform === "win32" && process.env.COOKLILY_AGENT_BROWSER === "edge") {
    const edgePath = path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe");
    if (!existsSync(edgePath)) throw new Error("Microsoft Edge não foi encontrado no caminho padrão.");
    const launcher = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference='Stop'; Start-Process -FilePath $env:COOKLILY_AGENT_EDGE_PATH -ArgumentList @($env:COOKLILY_AGENT_HANDOFF_URL)"], {
      stdio: "ignore",
      windowsHide: true,
      timeout: 10_000,
      env: { ...process.env, COOKLILY_AGENT_EDGE_PATH: edgePath, COOKLILY_AGENT_HANDOFF_URL: url }
    });
    if (launcher.error || launcher.status !== 0) throw new Error("Não foi possível iniciar o Microsoft Edge.");
    return;
  }
  const command = process.platform === "win32" ? "rundll32.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const commandArgs = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  const opened = spawnSync(command, commandArgs, { stdio: "ignore", windowsHide: true, timeout: 10_000 });
  if (opened.error || opened.status !== 0) throw new Error("Não foi possível abrir o navegador padrão.");
}

if (action !== "login" || (args.length !== 0 && !(args.length === 2 && args[0] === "--key" && args[1]))) usage();
apiOrigin = checkedOrigin(origin, process.env.COOKLILY_AGENT_ALLOW_INSECURE_LOCAL === "1");
if (!apiOrigin) fail("Origem inválida: use HTTPS em produção.", 64);
if (!keyPath || !existsSync(keyPath) || !existsSync(`${keyPath}.pub`)) fail("Chave do agente não encontrada; confira --key e o arquivo .pub.", 66);

try {
  const keyFingerprint = fingerprint(`${keyPath}.pub`);
  const requested = await api("challenges", { fingerprint: keyFingerprint });
  if (typeof requested.challengeId !== "string" || typeof requested.challenge !== "string" || requested.namespace !== namespace) {
    throw new Error("O servidor retornou um desafio incompatível.");
  }
  const signature = signChallenge(requested.challenge);
  const verified = await api("verify", { challengeId: requested.challengeId, signature });
  if (typeof verified.ticket !== "string" || !/^[A-Za-z0-9_-]{40,60}$/.test(verified.ticket)) {
    throw new Error("O servidor não emitiu o ticket de navegador esperado.");
  }
  const loginUrl = `${apiOrigin}/lilyacai/agent-auth.html#ticket=${encodeURIComponent(verified.ticket)}`;
  if (process.env.COOKLILY_AGENT_BROWSER === "codex") {
    const relay = await createAgentBrowserRelay(loginUrl);
    console.log(`Abra esta aba temporária no navegador integrado do Codex: ${relay.browserUrl}`);
    const wasConsumed = await relay.consumed;
    if (!wasConsumed) throw new Error("O handoff expirou antes de ser aberto no navegador integrado.");
    console.log("Handoff consumido pelo navegador integrado; o ticket não foi exibido nem salvo.");
  } else {
    openBrowser(loginUrl);
    console.log("Handoff aberto no navegador. Conclua a autenticação em até 60 segundos; o ticket não foi exibido nem salvo.");
  }
} catch (error) {
  fail(error instanceof Error ? error.message : "Falha na autenticação do agente.");
}
