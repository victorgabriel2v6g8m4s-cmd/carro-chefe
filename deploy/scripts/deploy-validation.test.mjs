import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runGate } from './deploy-validation.mjs';

function git(root, ...args) {
  execFileSync('git', args, { cwd: root, stdio: 'ignore' });
}

function fixture({ envInputs = [] } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'carro-chefe-validation-'));
  mkdirSync(path.join(root, 'deploy/validation'), { recursive: true });
  writeFileSync(path.join(root, 'input.txt'), 'v1\n');
  writeFileSync(path.join(root, 'deploy/validation/gates.json'), JSON.stringify({
    schemaVersion: 1,
    gates: {
      probe: {
        description: 'probe',
        inputs: ['input.txt'],
        ...(envInputs.length > 0 ? { envInputs } : {}),
      },
    },
  }, null, 2));
  git(root, 'init');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture');
  return root;
}

test('cacheia sucesso e invalida quando input versionado muda', () => {
  const root = fixture();
  try {
    const cacheDir = path.join(root, '.cache');
    const counter = path.join(root, 'counter.txt');
    const command = [process.execPath, '-e', `require('node:fs').appendFileSync(${JSON.stringify(counter)}, 'x')`];

    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'x');

    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'x');

    writeFileSync(path.join(root, 'input.txt'), 'v2\n');
    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'xx');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('full validation ignora cache válido', () => {
  const root = fixture();
  try {
    const cacheDir = path.join(root, '.cache');
    const counter = path.join(root, 'counter.txt');
    const command = [process.execPath, '-e', `require('node:fs').appendFileSync(${JSON.stringify(counter)}, 'x')`];

    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command, force: true }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'xx');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('artefato requerido ausente força nova execução', () => {
  const root = fixture();
  try {
    const cacheDir = path.join(root, '.cache');
    const counter = path.join(root, 'counter.txt');
    const artifact = path.join(root, 'artifact.ok');
    const command = [process.execPath, '-e', `const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(counter)},'x');fs.writeFileSync(${JSON.stringify(artifact)},'ok')`];

    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command, requiredPaths: ['artifact.ok'] }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'x');

    rmSync(artifact, { force: true });
    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command, requiredPaths: ['artifact.ok'] }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'xx');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('envInput invalida fingerprint sem persistir valor bruto no cache', () => {
  const variable = 'TEST_PUBLIC_BUILD_ID';
  const previous = process.env[variable];
  const root = fixture({ envInputs: [variable] });
  try {
    const cacheDir = path.join(root, '.cache');
    const counter = path.join(root, 'counter.txt');
    const command = [process.execPath, '-e', `require('node:fs').appendFileSync(${JSON.stringify(counter)}, 'x')`];

    process.env[variable] = 'public-one';
    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'x');

    process.env[variable] = 'public-two';
    assert.equal(runGate({ root, cacheDir, gateName: 'probe', command }), 0);
    assert.equal(readFileSync(counter, 'utf8'), 'xx');

    const cache = readFileSync(path.join(cacheDir, 'cache-v1.json'), 'utf8');
    assert.equal(cache.includes('public-one'), false);
    assert.equal(cache.includes('public-two'), false);
  } finally {
    if (previous === undefined) delete process.env[variable];
    else process.env[variable] = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
