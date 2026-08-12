import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { PlanningStore } from "../lib/store.js";
import { validateRequestInput } from "../lib/validation.js";

async function fixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "carro-chefe-plan-"));
  await fs.mkdir(path.join(rootDir, "data"), { recursive: true });
  const source = path.resolve("data", "plan.seed.json");
  await fs.copyFile(source, path.join(rootDir, "data", "plan.seed.json"));
  const store = new PlanningStore({ rootDir });
  await store.init();
  return { rootDir, store };
}

test("aprovação aplica a mudança e aumenta a versão", async (t) => {
  const { rootDir, store } = await fixture();
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));
  const before = await store.getPlan();
  const request = await store.createRequest(validateRequestInput({
    actor: "AG-GESTAO",
    action: "create_note",
    reason: "Preservar uma decisão de teste",
    payload: { title: "Nota de teste", content: "Conteúdo verificável", owner: "AG-GESTAO" }
  }));
  const reviewed = await store.reviewRequest(request.id, { reviewer: "AG-GESTAO", note: "Aprovado" }, "approved");
  const after = await store.getPlan();
  assert.equal(reviewed.status, "approved");
  assert.equal(after.meta.version, before.meta.version + 1);
  assert.ok(after.notes.some((note) => note.title === "Nota de teste"));
});

test("rejeição preserva o plano", async (t) => {
  const { rootDir, store } = await fixture();
  t.after(() => fs.rm(rootDir, { recursive: true, force: true }));
  const before = await store.getPlan();
  const request = await store.createRequest(validateRequestInput({
    actor: "AG-GESTAO",
    action: "create_note",
    reason: "Solicitação rejeitável",
    payload: { title: "Não aplicar", content: "Teste", owner: "AG-GESTAO" }
  }));
  await store.reviewRequest(request.id, { reviewer: "AG-GESTAO", note: "Fora de escopo" }, "rejected");
  const after = await store.getPlan();
  assert.equal(after.meta.version, before.meta.version);
  assert.equal(after.notes.some((note) => note.title === "Não aplicar"), false);
});

