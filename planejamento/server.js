import http from "node:http";
import path from "node:path";
import { promises as fs, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { PlanningStore } from "./lib/store.js";
import { supportedActions, validateRequestInput, validateReviewInput, ValidationError } from "./lib/validation.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(rootDir, "public");
const projectDir = path.dirname(rootDir);
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const maxUploadBytes = Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024;
const maxJsonBytes = 1024 * 1024;

const store = new PlanningStore({ rootDir });
await store.init();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

const allowedUploadTypes = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "text/csv", "text/plain", "text/markdown",
  "application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": contentType.startsWith("application/json") ? "no-store" : "no-cache",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { ...securityHeaders("application/json; charset=utf-8"), "Content-Length": Buffer.byteLength(body) });
  response.end(body);
}

function collectBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("Conteúdo excede o limite permitido."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readJsonBody(request) {
  const body = await collectBody(request, maxJsonBytes);
  if (!body.length) return {};
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new ValidationError("JSON inválido.");
  }
}

async function serveFile(response, file) {
  const extension = path.extname(file).toLowerCase();
  const stat = await fs.stat(file);
  response.writeHead(200, { ...securityHeaders(mimeTypes[extension] || "application/octet-stream"), "Content-Length": stat.size });
  createReadStream(file).pipe(response);
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { status: "ok", service: "Carro Chefe Central Operacional", time: new Date().toISOString() });
  }
  if (request.method === "GET" && url.pathname === "/api/schema") {
    return sendJson(response, 200, { actions: supportedActions, workflow: "consultar → propor → aprovar/rejeitar → auditar" });
  }
  if (request.method === "GET" && url.pathname === "/api/plan") {
    return sendJson(response, 200, await store.getPlan());
  }
  if (request.method === "GET" && url.pathname === "/api/requests") {
    return sendJson(response, 200, await store.getRequests(url.searchParams.get("status")));
  }
  if (request.method === "GET" && url.pathname === "/api/audit") {
    return sendJson(response, 200, await store.getAudit());
  }
  if (request.method === "GET" && url.pathname === "/api/uploads") {
    return sendJson(response, 200, await store.getUploads());
  }
  if (request.method === "POST" && url.pathname === "/api/requests") {
    const input = validateRequestInput(await readJsonBody(request));
    return sendJson(response, 201, await store.createRequest(input));
  }

  const reviewMatch = url.pathname.match(/^\/api\/requests\/(REQ-\d+)\/(approve|reject)$/);
  if (request.method === "POST" && reviewMatch) {
    const status = reviewMatch[2] === "approve" ? "approved" : "rejected";
    const review = validateReviewInput(await readJsonBody(request), status);
    return sendJson(response, 200, await store.reviewRequest(reviewMatch[1], review, status));
  }

  if (request.method === "POST" && url.pathname === "/api/uploads") {
    const filename = url.searchParams.get("filename");
    const actor = url.searchParams.get("actor");
    const taskId = url.searchParams.get("taskId");
    if (!filename || !actor) throw new ValidationError("filename e actor são obrigatórios.");
    if (filename.length > 200 || actor.length > 80) throw new ValidationError("filename ou actor excede o limite.");
    const mimeType = String(request.headers["content-type"] || "application/octet-stream").split(";")[0].toLowerCase();
    if (!allowedUploadTypes.has(mimeType)) throw new ValidationError(`Tipo de arquivo não permitido: ${mimeType}.`);
    const buffer = await collectBody(request, maxUploadBytes);
    if (!buffer.length) throw new ValidationError("Arquivo vazio.");
    return sendJson(response, 201, await store.saveUpload({ filename, mimeType, actor, taskId, buffer }));
  }

  const uploadMatch = url.pathname.match(/^\/api\/uploads\/(UP-[a-f0-9-]+)$/);
  if (request.method === "GET" && uploadMatch) {
    const { entry, file } = await store.resolveUpload(uploadMatch[1]);
    const stat = await fs.stat(file);
    response.writeHead(200, {
      ...securityHeaders(entry.mimeType),
      "Content-Length": stat.size,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(entry.filename)}`
    });
    return createReadStream(file).pipe(response);
  }

  return sendJson(response, 404, { error: "Endpoint não encontrado." });
}

async function handleStatic(response, url) {
  const assetMap = {
    "/assets/logo-dark.png": path.join(projectDir, "logos", "dark.png"),
    "/assets/logo-light.png": path.join(projectDir, "logos", "light.png"),
    "/assets/menu-cover.png": path.join(projectDir, "cardápio", "Cardápio Capa.png")
  };
  if (assetMap[url.pathname]) return serveFile(response, assetMap[url.pathname]);

  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const resolved = path.resolve(publicDir, requested);
  if (!resolved.startsWith(`${path.resolve(publicDir)}${path.sep}`) && resolved !== path.join(publicDir, "index.html")) {
    return sendJson(response, 403, { error: "Caminho inválido." });
  }
  try {
    return await serveFile(response, resolved);
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(response, 404, { error: "Arquivo não encontrado." });
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
    if (url.pathname.startsWith("/api/")) await handleApi(request, response, url);
    else await handleStatic(response, url);
  } catch (error) {
    const status = error.statusCode || 500;
    sendJson(response, status, { error: status === 500 ? "Erro interno." : error.message, details: error.details || undefined });
    if (status === 500) console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Carro Chefe Central Operacional em http://${host}:${port}`);
});

