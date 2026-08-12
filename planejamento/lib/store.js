import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { assertPlanReferences, ValidationError } from "./validation.js";

const PREFIXES = {
  tasks: "TASK",
  decisions: "DEC",
  risks: "RISK",
  procurement: "BUY",
  notes: "NOTE"
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file, fallback) {
  if (!(await exists(file))) return structuredClone(fallback);
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temporary, file);
}

function nextId(items, prefix) {
  const maximum = items.reduce((max, entry) => {
    const match = String(entry.id || "").match(/(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(maximum + 1).padStart(3, "0")}`;
}

function applyPatch(collection, id, patch) {
  const entry = collection.find((item) => item.id === id);
  if (!entry) throw new ValidationError(`Registro não encontrado: ${id}.`);
  Object.assign(entry, structuredClone(patch));
  return entry;
}

export class PlanningStore {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
    this.runtimeDir = path.join(rootDir, ".runtime");
    this.planFile = path.join(this.runtimeDir, "plan.json");
    this.requestsFile = path.join(this.runtimeDir, "requests.json");
    this.auditFile = path.join(this.runtimeDir, "audit.json");
    this.uploadsFile = path.join(this.runtimeDir, "uploads.json");
    this.uploadsDir = path.join(this.runtimeDir, "uploads");
    this.seedFile = path.join(rootDir, "data", "plan.seed.json");
    this.queue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    if (!(await exists(this.planFile))) {
      const seed = JSON.parse(await fs.readFile(this.seedFile, "utf8"));
      await writeJsonAtomic(this.planFile, seed);
    }
    if (!(await exists(this.requestsFile))) await writeJsonAtomic(this.requestsFile, []);
    if (!(await exists(this.auditFile))) await writeJsonAtomic(this.auditFile, []);
    if (!(await exists(this.uploadsFile))) await writeJsonAtomic(this.uploadsFile, []);
  }

  serialize(operation) {
    const run = this.queue.then(operation, operation);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async getPlan() {
    return readJson(this.planFile, {});
  }

  async getRequests(status) {
    const entries = await readJson(this.requestsFile, []);
    return status ? entries.filter((entry) => entry.status === status) : entries;
  }

  async getAudit() {
    return readJson(this.auditFile, []);
  }

  async getUploads() {
    return readJson(this.uploadsFile, []);
  }

  async createRequest(input) {
    return this.serialize(async () => {
      const plan = await this.getPlan();
      assertPlanReferences(plan, input.action, input.payload);
      const requests = await this.getRequests();
      const now = new Date().toISOString();
      const request = {
        id: nextId(requests, "REQ"),
        status: "pending",
        createdAt: now,
        reviewedAt: null,
        reviewer: null,
        reviewNote: null,
        ...structuredClone(input)
      };
      requests.push(request);
      await writeJsonAtomic(this.requestsFile, requests);
      await this.appendAudit({ at: now, actor: input.actor, action: "request_created", target: request.id, summary: `${input.action}: ${input.reason}` });
      return request;
    });
  }

  async reviewRequest(id, review, status) {
    return this.serialize(async () => {
      const requests = await this.getRequests();
      const request = requests.find((entry) => entry.id === id);
      if (!request) throw new ValidationError(`Requisição não encontrada: ${id}.`);
      if (request.status !== "pending") throw new ValidationError(`Requisição ${id} já foi revisada.`);

      const now = new Date().toISOString();
      if (status === "approved") {
        const plan = await this.getPlan();
        assertPlanReferences(plan, request.action, request.payload);
        const result = this.applyAction(plan, request.action, request.payload, review.reviewer, now);
        plan.meta.version += 1;
        plan.meta.updatedAt = now;
        plan.history.unshift({ at: now, actor: review.reviewer, action: request.action, summary: `${id} aprovado; ${result.summary}` });
        plan.history = plan.history.slice(0, 200);
        await writeJsonAtomic(this.planFile, plan);
        request.result = result;
      }

      request.status = status;
      request.reviewedAt = now;
      request.reviewer = review.reviewer;
      request.reviewNote = review.note;
      await writeJsonAtomic(this.requestsFile, requests);
      await this.appendAudit({ at: now, actor: review.reviewer, action: `request_${status}`, target: id, summary: review.note || request.reason });
      return request;
    });
  }

  applyAction(plan, action, payload, actor, now) {
    if (action === "create_task") {
      const id = nextId(plan.tasks, "TASK");
      plan.tasks.push({ id, ...structuredClone(payload), createdAt: now, createdBy: actor });
      return { id, summary: `tarefa ${id} criada` };
    }
    if (action === "update_task") {
      applyPatch(plan.tasks, payload.id, payload.patch);
      return { id: payload.id, summary: `tarefa ${payload.id} atualizada` };
    }
    if (action === "create_decision") {
      const id = nextId(plan.decisions, PREFIXES.decisions);
      plan.decisions.push({ id, ...structuredClone(payload), createdAt: now });
      return { id, summary: `decisão ${id} criada` };
    }
    if (action === "update_decision") {
      applyPatch(plan.decisions, payload.id, payload.patch);
      return { id: payload.id, summary: `decisão ${payload.id} atualizada` };
    }
    if (action === "create_risk") {
      const id = nextId(plan.risks, PREFIXES.risks);
      plan.risks.push({ id, ...structuredClone(payload), createdAt: now });
      return { id, summary: `risco ${id} criado` };
    }
    if (action === "update_risk") {
      applyPatch(plan.risks, payload.id, payload.patch);
      return { id: payload.id, summary: `risco ${payload.id} atualizado` };
    }
    if (action === "create_procurement_item") {
      const id = nextId(plan.procurement, PREFIXES.procurement);
      plan.procurement.push({ id, ...structuredClone(payload), createdAt: now });
      return { id, summary: `item de compra ${id} criado` };
    }
    if (action === "update_procurement_item") {
      applyPatch(plan.procurement, payload.id, payload.patch);
      return { id: payload.id, summary: `item ${payload.id} atualizado` };
    }
    if (action === "update_milestone") {
      applyPatch(plan.milestones, payload.id, payload.patch);
      return { id: payload.id, summary: `marco ${payload.id} atualizado` };
    }
    if (action === "create_note") {
      const id = nextId(plan.notes, PREFIXES.notes);
      plan.notes.push({ id, ...structuredClone(payload), createdAt: now });
      return { id, summary: `nota ${id} criada` };
    }
    throw new ValidationError(`Ação não suportada: ${action}.`);
  }

  async appendAudit(entry) {
    const audit = await readJson(this.auditFile, []);
    audit.unshift({ id: crypto.randomUUID(), ...entry });
    await writeJsonAtomic(this.auditFile, audit.slice(0, 1000));
  }

  async saveUpload({ filename, mimeType, actor, taskId, buffer }) {
    return this.serialize(async () => {
      const uploads = await this.getUploads();
      const id = `UP-${crypto.randomUUID()}`;
      const safeName = filename.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 150) || "arquivo";
      const storedName = `${id}_${safeName}`;
      const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
      await fs.writeFile(path.join(this.uploadsDir, storedName), buffer, { flag: "wx" });
      const entry = { id, filename, storedName, mimeType, size: buffer.length, sha256, actor, taskId: taskId || null, createdAt: new Date().toISOString() };
      uploads.unshift(entry);
      await writeJsonAtomic(this.uploadsFile, uploads);
      await this.appendAudit({ at: entry.createdAt, actor, action: "upload_created", target: id, summary: `${filename} (${buffer.length} bytes)` });
      return entry;
    });
  }

  async resolveUpload(id) {
    const uploads = await this.getUploads();
    const entry = uploads.find((item) => item.id === id);
    if (!entry) throw new ValidationError(`Upload não encontrado: ${id}.`);
    return { entry, file: path.join(this.uploadsDir, entry.storedName) };
  }
}

