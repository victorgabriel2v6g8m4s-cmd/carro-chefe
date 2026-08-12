import path from "node:path";
import { promises as fs } from "node:fs";
import { buildApp } from "./app";
import { config } from "./config";

if (config.host !== "127.0.0.1" && config.host !== "localhost" && !config.productionAuthReady) {
  throw new Error("Exposição externa bloqueada: configure autenticação e PRODUCTION_AUTH_READY=true antes de publicar /gestao.");
}

const app = await buildApp();
const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json; charset=utf-8" };
const siteDist = path.join(config.projectRoot, "apps", "site", "dist");
const managementDist = path.join(config.projectRoot, "apps", "gestao", "dist");

async function sendFile(reply: any, root: string, requested: string) {
  const file = path.resolve(root, requested);
  if (!file.startsWith(path.resolve(root))) return reply.code(403).send({ error: "Caminho inválido." });
  const body = await fs.readFile(file);
  return reply.type(mime[path.extname(file)] ?? "application/octet-stream").send(body);
}

app.get("/assets/brand/:file", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
  const { file } = request.params as { file: string };
  const allowed: Record<string, string> = { "logo-dark.png": path.join(config.projectRoot, "logos", "dark.png"), "logo-light.png": path.join(config.projectRoot, "logos", "light.png"), "logo-base.png": path.join(config.projectRoot, "logos", "base.png"), "menu-cover.png": path.join(config.projectRoot, "cardápio", "Cardápio Capa.png") };
  if (!allowed[file]) return reply.code(404).send({ error: "Ativo não encontrado." });
  return reply.type("image/png").send(await fs.readFile(allowed[file]));
});

app.get("/gestao/*", { config: { rateLimit: { max: 240, timeWindow: "1 minute" } } }, async (request, reply) => {
  const pathname = new URL(request.url, "http://local").pathname;
  const relative = pathname.slice("/gestao/".length);
  try { if (relative && path.extname(relative)) return await sendFile(reply, managementDist, relative); } catch {}
  return sendFile(reply, managementDist, "index.html");
});
app.get("/gestao", async (_request, reply) => reply.redirect("/gestao/visao-geral"));
app.get("/*", { config: { rateLimit: { max: 240, timeWindow: "1 minute" } } }, async (request, reply) => {
  const pathname = new URL(request.url, "http://local").pathname;
  const relative = pathname.slice(1);
  try { if (relative && path.extname(relative)) return await sendFile(reply, siteDist, relative); } catch {}
  return sendFile(reply, siteDist, "index.html");
});

await app.listen({ host: config.host, port: config.port });
app.log.info(`Carro Chefe em http://${config.host}:${config.port}`);
