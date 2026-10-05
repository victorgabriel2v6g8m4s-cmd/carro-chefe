#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE_SCHEMA = 1;
const scriptPath = fileURLToPath(import.meta.url);

function die(message, code = 64) {
  console.error(`ERRO: ${message}`);
  process.exit(code);
}

function commandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) return `${command}:unavailable`;
  return `${command}:${(result.stdout || result.stderr || '').trim()}`;
}

function git(root, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} falhou: ${(result.stderr || '').toString().trim()}`);
  }
  return result.stdout;
}

export function repositoryRoot(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']).trim();
}

export function loadGateConfig(root) {
  const path = resolve(root, 'deploy/validation/gates.json');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config?.schemaVersion !== 1 || !config.gates || typeof config.gates !== 'object') {
    throw new Error('deploy/validation/gates.json inválido');
  }
  return { path, config };
}

export function trackedFiles(root, inputs) {
  const output = git(root, ['ls-files', '-z', '--', ...inputs], { encoding: null });
  return output
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function computeFingerprint({ root, gateName, command = [], configBundle = loadGateConfig(root) }) {
  const gate = configBundle.config.gates[gateName];
  if (!gate || !Array.isArray(gate.inputs) || gate.inputs.length === 0) {
    throw new Error(`gate desconhecido ou sem inputs: ${gateName}`);
  }
  if (gate.envInputs !== undefined && (!Array.isArray(gate.envInputs) || gate.envInputs.some((name) => typeof name !== 'string' || !name))) {
    throw new Error(`gate ${gateName}: envInputs inválido`);
  }

  const hash = createHash('sha256');
  const files = trackedFiles(root, gate.inputs);
  hash.update(`cache-schema:${CACHE_SCHEMA}\0`);
  hash.update(`gate:${gateName}\0`);
  hash.update(`platform:${process.platform}\0arch:${process.arch}\0node:${process.version}\0`);
  hash.update(`${commandVersion('npm')}\0${commandVersion('python3')}\0`);
  hash.update(`command:${JSON.stringify(command)}\0`);
  hash.update(`gate-config:${JSON.stringify(gate)}\0`);
  hash.update(readFileSync(configBundle.path));
  hash.update(readFileSync(scriptPath));

  for (const name of [...(gate.envInputs ?? [])].sort()) {
    hash.update(`env:${name}\0`);
    hash.update(process.env[name] ?? '');
    hash.update('\0');
  }

  for (const relative of files) {
    hash.update(`path:${relative}\0`);
    hash.update(readFileSync(resolve(root, relative)));
    hash.update('\0');
  }

  return { fingerprint: hash.digest('hex'), files };
}

function emptyCache() {
  return { schemaVersion: CACHE_SCHEMA, gates: {} };
}

export function readCache(cacheDir) {
  const path = resolve(cacheDir, 'cache-v1.json');
  if (!existsSync(path)) return { path, cache: emptyCache() };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    if (parsed?.schemaVersion !== CACHE_SCHEMA || !parsed.gates || typeof parsed.gates !== 'object') {
      return { path, cache: emptyCache() };
    }
    return { path, cache: parsed };
  } catch {
    return { path, cache: emptyCache() };
  }
}

export function writeCache(path, cache) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temp, `${JSON.stringify(cache, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}

function currentSha(root) {
  try {
    return git(root, ['rev-parse', 'HEAD']).trim();
  } catch {
    return null;
  }
}

export function runGate({ root, cacheDir, gateName, command, force = false, requiredPaths = [] }) {
  const missing = requiredPaths.filter((path) => !existsSync(resolve(root, path)));
  const computed = computeFingerprint({ root, gateName, command });
  const { path: cachePath, cache } = readCache(cacheDir);
  const previous = cache.gates[gateName];
  const hit = !force && missing.length === 0 && previous?.status === 'success' && previous.fingerprint === computed.fingerprint;

  if (hit) {
    console.log(`validation_cache=hit gate=${gateName} fingerprint=${computed.fingerprint.slice(0, 16)} inputs=${computed.files.length}`);
    return 0;
  }

  const reason = force ? 'forced' : missing.length > 0 ? `missing:${missing.join(',')}` : previous ? 'fingerprint-changed' : 'no-cache';
  console.log(`validation_cache=miss gate=${gateName} reason=${reason} fingerprint=${computed.fingerprint.slice(0, 16)} inputs=${computed.files.length}`);

  const result = spawnSync(command[0], command.slice(1), {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error || result.status !== 0) {
    delete cache.gates[gateName];
    writeCache(cachePath, cache);
    if (result.error) console.error(`gate ${gateName}: ${result.error.message}`);
    return result.status ?? 1;
  }

  cache.gates[gateName] = {
    fingerprint: computed.fingerprint,
    status: 'success',
    validatedAt: new Date().toISOString(),
    releaseSha: currentSha(root),
    inputCount: computed.files.length,
  };
  writeCache(cachePath, cache);
  console.log(`validation_cache=stored gate=${gateName} fingerprint=${computed.fingerprint.slice(0, 16)}`);
  return 0;
}

function usage() {
  console.log(`Uso:\n  node deploy/scripts/deploy-validation.mjs run <gate> --cache-dir <dir> [--force] [--require <path>]... -- <comando> [args...]\n  node deploy/scripts/deploy-validation.mjs status --cache-dir <dir>\n  node deploy/scripts/deploy-validation.mjs clear --cache-dir <dir>`);
}

function parseCacheDir(args) {
  const index = args.indexOf('--cache-dir');
  if (index === -1 || !args[index + 1]) die('--cache-dir é obrigatório');
  return args[index + 1];
}

function main(argv) {
  const [action, ...rest] = argv;
  if (!action || action === '--help' || action === '-h') {
    usage();
    return 0;
  }

  const root = repositoryRoot();
  const cacheDir = parseCacheDir(rest);

  if (action === 'status') {
    const { cache } = readCache(cacheDir);
    const names = Object.keys(cache.gates).sort();
    console.log(`validation_cache_schema=${cache.schemaVersion}`);
    console.log(`validation_cache_dir=${cacheDir}`);
    if (names.length === 0) console.log('validation_cache=empty');
    for (const name of names) {
      const entry = cache.gates[name];
      console.log(`gate=${name} status=${entry.status} fingerprint=${entry.fingerprint.slice(0, 16)} release=${entry.releaseSha ?? 'unknown'} validated_at=${entry.validatedAt}`);
    }
    return 0;
  }

  if (action === 'clear') {
    const { path } = readCache(cacheDir);
    rmSync(path, { force: true });
    console.log(`validation_cache=cleared path=${path}`);
    return 0;
  }

  if (action !== 'run') die(`ação desconhecida: ${action}`);
  const gateName = rest[0];
  if (!gateName || gateName.startsWith('--')) die('gate é obrigatório');
  const separator = rest.indexOf('--');
  if (separator === -1 || separator === rest.length - 1) die('separe o comando com --');

  const optionArgs = rest.slice(1, separator);
  const command = rest.slice(separator + 1);
  const force = optionArgs.includes('--force');
  const requiredPaths = [];
  for (let index = 0; index < optionArgs.length; index += 1) {
    if (optionArgs[index] === '--cache-dir') {
      index += 1;
      continue;
    }
    if (optionArgs[index] === '--force') continue;
    if (optionArgs[index] === '--require') {
      if (!optionArgs[index + 1]) die('--require exige um caminho');
      requiredPaths.push(optionArgs[index + 1]);
      index += 1;
      continue;
    }
    die(`opção desconhecida: ${optionArgs[index]}`);
  }

  return runGate({ root, cacheDir, gateName, command, force, requiredPaths });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exitCode = 1;
  }
}
