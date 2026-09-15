#!/usr/bin/env node

import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderStatusBlock,
  replaceManagedBlock,
  runCatalog,
  summarize,
  validateCatalog,
} from './core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const catalogPath = resolve(here, 'catalog.json');
const statusPath = resolve(root, 'docs/ferramentas/STATUS_AUTOMATICO.md');

function usage() {
  console.log(`Uso: node tools/tool-health/cli.mjs [--dry-run | --check]\n\n` +
    `  sem opção   executa os checks e atualiza STATUS_AUTOMATICO.md\n` +
    `  --dry-run   executa e mostra a seção gerada sem escrever\n` +
    `  --check     executa e falha se o documento versionado estiver desatualizado\n` +
    `  --help      mostra esta ajuda`);
}

function parseArgs(argv) {
  const allowed = new Set(['--dry-run', '--check', '--help']);
  for (const arg of argv) {
    if (!allowed.has(arg)) throw new Error(`Argumento não reconhecido: ${arg}`);
  }
  if (argv.includes('--dry-run') && argv.includes('--check')) {
    throw new Error('Use apenas --dry-run ou --check.');
  }
  return {
    dryRun: argv.includes('--dry-run'),
    check: argv.includes('--check'),
    help: argv.includes('--help'),
  };
}

function atomicWrite(path, content) {
  const temp = `${path}.tmp-${process.pid}`;
  try {
    writeFileSync(temp, content, { encoding: 'utf8', flag: 'wx' });
    renameSync(temp, path);
  } finally {
    try { unlinkSync(temp); } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  usage();
  process.exit(64);
}

if (options.help) {
  usage();
  process.exit(0);
}

let catalog;
try {
  catalog = validateCatalog(JSON.parse(readFileSync(catalogPath, 'utf8')));
} catch (error) {
  console.error(`Falha ao carregar catálogo: ${error.message}`);
  process.exit(2);
}

console.log(`Tool Health — ${catalog.tools.length} ferramentas — plataforma ${process.platform}`);
const results = runCatalog(catalog, { root, platform: process.platform });
for (const result of results) {
  console.log(`${result.ok ? 'OK' : 'ERRO'}  ${result.id}: ${result.detail}`);
}

const generated = renderStatusBlock(results, process.platform);
const current = readFileSync(statusPath, 'utf8');
const next = replaceManagedBlock(current, generated);
const summary = summarize(results);

if (options.dryRun) {
  console.log('\n' + generated);
} else if (options.check) {
  if (next !== current) {
    console.error('\nSTATUS_AUTOMATICO.md está desatualizado. Execute: npm run tools:status');
    process.exit(summary.noApplicableFailures ? 2 : 1);
  }
  console.log('\nSTATUS_AUTOMATICO.md está sincronizado.');
} else if (next !== current) {
  atomicWrite(statusPath, next);
  console.log('\nSTATUS_AUTOMATICO.md atualizado.');
} else {
  console.log('\nSTATUS_AUTOMATICO.md já estava atualizado.');
}

if (!summary.noApplicableFailures) process.exit(1);
