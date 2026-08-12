const ACTIONS = new Set([
  "create_task",
  "update_task",
  "create_decision",
  "update_decision",
  "create_risk",
  "update_risk",
  "create_procurement_item",
  "update_procurement_item",
  "update_milestone",
  "create_note"
]);

const TASK_STATUSES = new Set(["backlog", "ready", "in_progress", "blocked", "review", "done", "cancelled"]);
const RECORD_STATUSES = new Set(["open", "monitoring", "mitigated", "closed", "cancelled", "pending", "in_progress", "done", "blocked", "research", "shortlisted", "approved", "ordered", "received"]);

export class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, label, max = 500) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${label} é obrigatório.`);
  }
  const clean = value.trim();
  if (clean.length > max) throw new ValidationError(`${label} excede ${max} caracteres.`);
  return clean;
}

function optionalString(value, label, max = 2000) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`${label} deve ser texto.`);
  const clean = value.trim();
  if (clean.length > max) throw new ValidationError(`${label} excede ${max} caracteres.`);
  return clean;
}

function rating(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
    throw new ValidationError(`${label} deve ser um inteiro entre 1 e 5.`);
  }
  return numeric;
}

function stringArray(value, label, maxItems = 30) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some((entry) => typeof entry !== "string")) {
    throw new ValidationError(`${label} deve ser uma lista de textos com até ${maxItems} itens.`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function cleanPatch(patch, allowed) {
  if (!isObject(patch)) throw new ValidationError("patch deve ser um objeto.");
  const unknown = Object.keys(patch).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new ValidationError(`Campos não permitidos no patch: ${unknown.join(", ")}.`);
  if (!Object.keys(patch).length) throw new ValidationError("patch não pode estar vazio.");
  return structuredClone(patch);
}

export function validateRequestInput(input) {
  if (!isObject(input)) throw new ValidationError("Corpo da requisição deve ser um objeto JSON.");
  const actor = requiredString(input.actor, "actor", 80);
  const action = requiredString(input.action, "action", 80);
  const reason = requiredString(input.reason, "reason", 1000);
  if (!ACTIONS.has(action)) throw new ValidationError(`Ação não suportada: ${action}.`);
  if (!isObject(input.payload)) throw new ValidationError("payload deve ser um objeto.");

  const payload = validateActionPayload(action, input.payload);
  return { actor, action, reason, payload };
}

export function validateActionPayload(action, input) {
  const payload = structuredClone(input);

  if (action === "create_task") {
    return {
      title: requiredString(payload.title, "title", 180),
      pillar: requiredString(payload.pillar, "pillar", 60),
      phase: requiredString(payload.phase, "phase", 20),
      owner: requiredString(payload.owner, "owner", 80),
      impact: rating(payload.impact, "impact"),
      urgency: rating(payload.urgency, "urgency"),
      status: payload.status ? requiredString(payload.status, "status", 30) : "ready",
      dependencies: stringArray(payload.dependencies, "dependencies"),
      acceptance: requiredString(payload.acceptance, "acceptance", 1200),
      evidence: stringArray(payload.evidence, "evidence")
    };
  }

  if (action === "update_task") {
    const patch = cleanPatch(payload.patch, ["title", "pillar", "phase", "owner", "impact", "urgency", "status", "dependencies", "acceptance", "evidence"]);
    if (patch.status && !TASK_STATUSES.has(patch.status)) throw new ValidationError("Status de tarefa inválido.");
    if (patch.impact !== undefined) patch.impact = rating(patch.impact, "impact");
    if (patch.urgency !== undefined) patch.urgency = rating(patch.urgency, "urgency");
    if (patch.title !== undefined) patch.title = requiredString(patch.title, "title", 180);
    if (patch.acceptance !== undefined) patch.acceptance = requiredString(patch.acceptance, "acceptance", 1200);
    if (patch.dependencies !== undefined) patch.dependencies = stringArray(patch.dependencies, "dependencies");
    if (patch.evidence !== undefined) patch.evidence = stringArray(patch.evidence, "evidence");
    return { id: requiredString(payload.id, "id", 50), patch };
  }

  if (action === "create_decision") {
    return {
      question: requiredString(payload.question, "question", 500),
      owner: requiredString(payload.owner, "owner", 80),
      due: optionalString(payload.due, "due", 40),
      status: "open",
      recommendation: optionalString(payload.recommendation, "recommendation", 1500),
      resolution: null
    };
  }

  if (action === "update_decision") {
    const patch = cleanPatch(payload.patch, ["question", "owner", "due", "status", "recommendation", "resolution"]);
    return { id: requiredString(payload.id, "id", 50), patch };
  }

  if (action === "create_risk") {
    return {
      title: requiredString(payload.title, "title", 240),
      owner: requiredString(payload.owner, "owner", 80),
      probability: rating(payload.probability, "probability"),
      impact: rating(payload.impact, "impact"),
      status: payload.status ? requiredString(payload.status, "status", 30) : "open",
      mitigation: requiredString(payload.mitigation, "mitigation", 1500),
      trigger: optionalString(payload.trigger, "trigger", 1000)
    };
  }

  if (action === "update_risk") {
    const patch = cleanPatch(payload.patch, ["title", "owner", "probability", "impact", "status", "mitigation", "trigger"]);
    if (patch.probability !== undefined) patch.probability = rating(patch.probability, "probability");
    if (patch.impact !== undefined) patch.impact = rating(patch.impact, "impact");
    return { id: requiredString(payload.id, "id", 50), patch };
  }

  if (action === "create_procurement_item") {
    return {
      item: requiredString(payload.item, "item", 240),
      category: requiredString(payload.category, "category", 80),
      owner: requiredString(payload.owner, "owner", 80),
      status: payload.status ? requiredString(payload.status, "status", 30) : "research",
      neededBy: optionalString(payload.neededBy, "neededBy", 40),
      requirements: stringArray(payload.requirements, "requirements"),
      budgetCeiling: payload.budgetCeiling ?? null,
      recommendation: optionalString(payload.recommendation, "recommendation", 2000)
    };
  }

  if (action === "update_procurement_item") {
    const patch = cleanPatch(payload.patch, ["item", "category", "owner", "status", "neededBy", "requirements", "budgetCeiling", "recommendation", "options"]);
    if (patch.requirements !== undefined) patch.requirements = stringArray(patch.requirements, "requirements");
    return { id: requiredString(payload.id, "id", 50), patch };
  }

  if (action === "update_milestone") {
    const patch = cleanPatch(payload.patch, ["name", "status", "objective", "exitCriteria"]);
    if (patch.status && !RECORD_STATUSES.has(patch.status)) throw new ValidationError("Status de marco inválido.");
    return { id: requiredString(payload.id, "id", 20), patch };
  }

  if (action === "create_note") {
    return {
      title: requiredString(payload.title, "title", 180),
      content: requiredString(payload.content, "content", 5000),
      owner: requiredString(payload.owner, "owner", 80)
    };
  }

  throw new ValidationError(`Ação não suportada: ${action}.`);
}

export function validateReviewInput(input, expected) {
  if (!isObject(input)) throw new ValidationError("Corpo da revisão deve ser um objeto JSON.");
  return {
    reviewer: requiredString(input.reviewer, "reviewer", 80),
    note: optionalString(input.note, "note", 1200),
    expected
  };
}

export function assertPlanReferences(plan, action, payload) {
  const has = (collection, id) => plan[collection].some((entry) => entry.id === id);

  if (action === "create_task") {
    if (!has("pillars", payload.pillar)) throw new ValidationError(`Pilar inexistente: ${payload.pillar}.`);
    if (!has("milestones", payload.phase)) throw new ValidationError(`Fase inexistente: ${payload.phase}.`);
    if (!has("agents", payload.owner)) throw new ValidationError(`Agente inexistente: ${payload.owner}.`);
    const missing = payload.dependencies.filter((id) => !has("tasks", id));
    if (missing.length) throw new ValidationError(`Dependências inexistentes: ${missing.join(", ")}.`);
  }

  const map = {
    update_task: "tasks",
    update_decision: "decisions",
    update_risk: "risks",
    update_procurement_item: "procurement",
    update_milestone: "milestones"
  };
  if (map[action] && !has(map[action], payload.id)) {
    throw new ValidationError(`Registro não encontrado: ${payload.id}.`);
  }
}

export const supportedActions = [...ACTIONS];

