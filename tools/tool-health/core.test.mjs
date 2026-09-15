import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  renderStatusBlock,
  replaceManagedBlock,
  runTool,
  summarize,
  validateCatalog,
} from './core.mjs';

const baseTool = {
  id: 'demo-tool',
  name: 'Demo Tool',
  path: 'tools/demo',
  maturity: 'complete',
  platforms: ['linux'],
  command: 'echo ok',
  timeoutMs: 1000,
};

function withTempRoot(fn) {
  const root = mkdtempSync(join(tmpdir(), 'carro-chefe-tool-health-'));
  mkdirSync(join(root, 'tools', 'demo'), { recursive: true });
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('validateCatalog aceita catálogo válido e rejeita IDs duplicados', () => {
  assert.doesNotThrow(() => validateCatalog({ schemaVersion: 1, tools: [baseTool] }));
  assert.throws(
    () => validateCatalog({ schemaVersion: 1, tools: [baseTool, { ...baseTool }] }),
    /ID duplicado/,
  );
});

test('validateCatalog impede comando em ferramenta apenas planejada', () => {
  assert.throws(
    () => validateCatalog({
      schemaVersion: 1,
      tools: [{ ...baseTool, maturity: 'planned' }],
    }),
    /planejada não deve declarar comando/,
  );
});

test('runTool marca plataforma incompatível sem executar comando', () => {
  let called = false;
  const result = runTool(baseTool, {
    root: '.',
    platform: 'win32',
    runner: () => { called = true; return { status: 0 }; },
  });
  assert.equal(called, false);
  assert.equal(result.verification, 'platform-skip');
  assert.equal(result.ok, true);
});

test('runTool diferencia sucesso de falha sem registrar stdout', () => withTempRoot((root) => {
  const pass = runTool(baseTool, {
    root,
    platform: 'linux',
    runner: () => ({ status: 0, stdout: 'segredo-potencial', stderr: '' }),
  });
  assert.equal(pass.verification, 'pass');
  assert.equal(JSON.stringify(pass).includes('segredo-potencial'), false);

  const fail = runTool(baseTool, {
    root,
    platform: 'linux',
    runner: () => ({ status: 7, stdout: '', stderr: 'detalhe sensível' }),
  });
  assert.equal(fail.verification, 'fail');
  assert.match(fail.detail, /exit 7/);
  assert.equal(JSON.stringify(fail).includes('detalhe sensível'), false);
}));

test('replaceManagedBlock preserva conteúdo humano fora dos marcadores', () => {
  const original = '# Título\n\nantes\n<!-- TOOL_HEALTH:START -->\nantigo\n<!-- TOOL_HEALTH:END -->\ndepois\n';
  const next = replaceManagedBlock(original, 'novo');
  assert.equal(next, '# Título\n\nantes\n<!-- TOOL_HEALTH:START -->\nnovo\n<!-- TOOL_HEALTH:END -->\ndepois\n');
});

test('renderStatusBlock é determinístico para os mesmos resultados', () => {
  const results = [{ ...baseTool, verification: 'pass', ok: true, detail: 'teste aplicável passou' }];
  assert.equal(renderStatusBlock(results, 'linux'), renderStatusBlock(results, 'linux'));
  assert.match(renderStatusBlock(results, 'linux'), /Todas as ferramentas próprias estão completas.*SIM/);
});

test('summarize não trata desenvolvimento como tudo completo', () => {
  const summary = summarize([
    { ...baseTool, maturity: 'development', verification: 'pass', ok: true },
  ]);
  assert.equal(summary.noApplicableFailures, true);
  assert.equal(summary.allImplemented, false);
  assert.equal(summary.allCompleteAndHealthy, false);
});
