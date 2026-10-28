import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";

const handoffPath = "/lilyacai/agent-auth.html";

function isAgentHandoff(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://carrochefe.com"
      && url.pathname === handoffPath
      && url.search === ""
      && /^#ticket=[A-Za-z0-9_-]{40,60}$/.test(url.hash);
  } catch {
    return false;
  }
}

function matchesKey(candidate, expected) {
  const left = Buffer.from(candidate ?? "");
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function createAgentBrowserRelay(handoffUrl, timeoutMs = 60_000) {
  if (!isAgentHandoff(handoffUrl)) throw new Error("URL de handoff CookLily inválida.");

  const key = randomBytes(32).toString("base64url");
  let ticketUrl = handoffUrl;
  let timeout;
  let settle;
  const consumed = new Promise((resolve) => { settle = resolve; });
  const server = createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");

    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    if (request.method === "GET" && pathname === `/${key}`) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" });
      response.end("<!doctype html><meta charset=utf-8><title>Conectando ao CookLily</title><p>Conectando com segurança ao painel CookLily…</p><script>async function handoff(){const r=await fetch('/" + key + "/consume',{cache:'no-store'});if(r.status===200){const d=await r.json();location.replace(d.url);return}if(r.status!==202){document.body.textContent='Não foi possível concluir a autenticação.';return}setTimeout(handoff,250)}handoff()</script>");
      return;
    }

    if (request.method === "GET" && pathname === `/${key}/consume`) {
      if (!ticketUrl) {
        response.writeHead(410).end();
        return;
      }
      const url = ticketUrl;
      ticketUrl = null;
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ url }));
      clearTimeout(timeout);
      timeout = setTimeout(() => server.close(), 1000);
      settle(true);
      return;
    }

    if (request.method === "GET" && pathname === `/${key}/consume` && !ticketUrl) {
      response.writeHead(410).end();
      return;
    }

    response.writeHead(404).end();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Não foi possível iniciar o handoff local.");
  timeout = setTimeout(() => {
    ticketUrl = null;
    server.close();
    settle(false);
  }, timeoutMs);
  timeout.unref();

  return {
    browserUrl: `http://127.0.0.1:${address.port}/${key}`,
    consumed,
    close() {
      clearTimeout(timeout);
      ticketUrl = null;
      server.close();
      settle(false);
    }
  };
}
