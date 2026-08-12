import test from "node:test";
import assert from "node:assert/strict";
import { validateRequestInput, ValidationError } from "../lib/validation.js";

test("normaliza uma solicitação de nova tarefa", () => {
  const result = validateRequestInput({
    actor: "AG-GESTAO",
    action: "create_task",
    reason: "Organizar uma entrega verificável",
    payload: {
      title: "Validar requisito",
      pillar: "gestao",
      phase: "G0",
      owner: "AG-GESTAO",
      impact: 5,
      urgency: 4,
      acceptance: "Evidência revisada e anexada",
      dependencies: []
    }
  });
  assert.equal(result.payload.status, "ready");
  assert.equal(result.payload.impact, 5);
});

test("rejeita ação desconhecida", () => {
  assert.throws(() => validateRequestInput({ actor: "AG-GESTAO", action: "delete_everything", reason: "teste", payload: {} }), ValidationError);
});

test("rejeita atualização vazia", () => {
  assert.throws(() => validateRequestInput({ actor: "AG-GESTAO", action: "update_task", reason: "teste", payload: { id: "TASK-001", patch: {} } }), /patch não pode estar vazio/);
});

