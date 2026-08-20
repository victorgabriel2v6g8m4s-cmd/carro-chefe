import path from "node:path";
import { promises as fs } from "node:fs";
import type { FastifyReply } from "fastify";
import { buildApp } from "./app";
import { assertLoopbackBinding, config } from "./config";
import { readStaticFile } from "./static-files";

assertLoopbackBinding(config.host);

const app = await buildApp();
const siteDist = path.join(config.projectRoot, "apps", "site", "dist");
const managementDist = path.join(config.projectRoot, "apps", "gestao", "dist");

function isMissingFile(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function sendFile(reply: FastifyReply, root: string, requested: string) {
  try {
    const file = await readStaticFile(root, requested);
    return reply.type(file.mimeType).send(file.body);
  } catch (error) {
    if (isMissingFile(error)) return reply.code(404).send({ error: "Arquivo estático não encontrado." });
    throw error;
  }
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
  if (relative && path.extname(relative)) return sendFile(reply, managementDist, relative);
  return sendFile(reply, managementDist, "index.html");
});
app.get("/gestao", async (_request, reply) => reply.redirect("/gestao/visao-geral"));
app.get("/*", { config: { rateLimit: { max: 240, timeWindow: "1 minute" } } }, async (request, reply) => {
  const pathname = new URL(request.url, "http://local").pathname;
  const relative = pathname.slice(1);
  if (relative && path.extname(relative)) return sendFile(reply, siteDist, relative);
  return sendFile(reply, siteDist, "index.html");
});

await app.listen({ host: config.host, port: config.port });
app.log.info(`Carro Chefe em http://${config.host}:${config.port}`);
