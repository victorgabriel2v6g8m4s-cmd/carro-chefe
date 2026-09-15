import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

export const START_MARKER = '<!-- TOOL_HEALTH:START -->';
export const END_MARKER = '<!-- TOOL_HEALTH:END -->';
export const MATURITIES = new Set(['planned', 'development', 'complete', 'legacy-complete']);

export function validateCatalog(catalog) {
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.tools)) {
    throw new Error('Catálogo inválido: schemaVersion=1 e tools[] são obrigatórios.');
  }

  const ids = new Set();
  for (const tool of catalog.tools) {
    if (!tool || typeof tool.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(tool.id)) {
      throw new Error('Ferramenta com id inválido.');
    }
    if (ids.has(tool.id)) throw new Error(`ID duplicado: ${tool.id}`);
    ids.add(tool.id);

    if (typeof tool.name !== 'string' || !tool.name.trim()) throw new Error(`${tool.id}: name obrigatório.`);
    if (typeof tool.path !== 'string' || !tool.path.trim()) throw new Error(`${tool.id}: path obrigatório.`);
    if (!MATURITIES.has(tool.maturity)) throw new Error(`${tool.id}: maturity inválida.`);
    if (!Array.isArray(tool.platforms) || tool.platforms.length === 0) {
      throw new Error(`${tool.id}: platforms[] obrigatório.`);
    }
    if (tool.maturity === 'planned' && (tool.command || tool.commands)) {
      throw new Error(`${tool.id}: ferramenta planejada não deve declarar comando executável.`);
    }
    if (tool.maturity !== 'planned' && !tool.command && !tool.commands) {
      throw new Error(`${tool.id}: ferramenta implementada precisa de command ou commands.`);
    }
    if (tool.timeoutMs !== undefined && (!Number.isInteger(tool.timeoutMs) || tool.timeoutMs < 1000)) {
      throw new Error(`${tool.id}: timeoutMs inválido.`);
    }
  }
  return catalog;
}

export function commandFor(tool, platform) {
  if (tool.command) return tool.command;
  return tool.commands?.[platform] ?? null;
}

export function defaultRunner(command, options) {
  return spawnSync(command, {
    cwd: options.cwd,
    shell: true,
    encoding: 'utf8',
    timeout: options.timeoutMs,
    env: { ...process.env, CI: process.env.CI ?? '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function runTool(tool, { root, platform = process.platform, runner = defaultRunner } = {}) {
  if (tool.maturity === 'planned') {
    return { ...tool, verification: 'planned', ok: true, detail: 'não executada (planejada)' };
  }

  if (!tool.platforms.includes(platform)) {
    return { ...tool, verification: 'platform-skip', ok: true, detail: 'não testada nesta plataforma' };
  }

  if (!existsSync(resolve(root, tool.path))) {
    return { ...tool, verification: 'fail', ok: false, detail: 'caminho declarado ausente' };
  }

  const command = commandFor(tool, platform);
  if (!command) {
    return { ...tool, verification: 'blocked', ok: false, detail: 'comando não definido para a plataforma' };
  }

  const result = runner(command, { cwd: root, timeoutMs: tool.timeoutMs ?? 120000 });
  if (result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM') {
    return { ...tool, verification: 'fail', ok: false, detail: 'timeout' };
  }
  if (result.error) {
    return { ...tool, verification: 'blocked', ok: false, detail: `não executada: ${result.error.code ?? 'erro do processo'}` };
  }
  if (result.status === 0) {
    return { ...tool, verification: 'pass', ok: true, detail: 'teste aplicável passou' };
  }
  return { ...tool, verification: 'fail', ok: false, detail: `falhou (exit ${result.status ?? 'desconhecido'})` };
}

export function runCatalog(catalog, options) {
  validateCatalog(catalog);
  return catalog.tools.map((tool) => runTool(tool, options));
}

export function maturityLabel(value) {
  return {
    planned: 'planejada',
    development: 'em desenvolvimento',
    complete: 'completa',
    'legacy-complete': 'completa/legada',
  }[value] ?? value;
}

export function verificationLabel(value) {
  return {
    planned: 'não executada (planejada)',
    'platform-skip': 'não testada nesta plataforma',
    pass: 'verificada',
    fail: 'falhando',
    blocked: 'bloqueada',
  }[value] ?? value;
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function summarize(results) {
  const counts = { pass: 0, fail: 0, blocked: 0, planned: 0, platformSkip: 0 };
  for (const result of results) {
    if (result.verification === 'pass') counts.pass += 1;
    else if (result.verification === 'fail') counts.fail += 1;
    else if (result.verification === 'blocked') counts.blocked += 1;
    else if (result.verification === 'planned') counts.planned += 1;
    else if (result.verification === 'platform-skip') counts.platformSkip += 1;
  }
  const allImplemented = results.every((r) => ['complete', 'legacy-complete'].includes(r.maturity));
  const noApplicableFailures = counts.fail === 0 && counts.blocked === 0;
  return { counts, allImplemented, noApplicableFailures, allCompleteAndHealthy: allImplemented && noApplicableFailures };
}

export function renderStatusBlock(results, platform) {
  const summary = summarize(results);
  const lines = [
    `**Plataforma da última execução gravada:** \`${platform}\`  `,
    `**Todas as ferramentas próprias estão completas e sem falha aplicável?** **${summary.allCompleteAndHealthy ? 'SIM' : 'NÃO'}**  `,
    `**Checks:** ${summary.counts.pass} passaram; ${summary.counts.fail} falharam; ${summary.counts.blocked} bloqueados; ${summary.counts.platformSkip} não aplicáveis à plataforma; ${summary.counts.planned} planejados.`,
    '',
    '| Ferramenta | Caminho | Maturidade | Verificação | Detalhe |',
    '|---|---|---|---|---|',
  ];

  for (const result of results) {
    lines.push(`| \`${escapeCell(result.id)}\` | \`${escapeCell(result.path)}\` | ${maturityLabel(result.maturity)} | ${verificationLabel(result.verification)} | ${escapeCell(result.detail)} |`);
  }

  lines.push('', '> Relatório sem timestamp de propósito: o commit Git registra quando o estado foi atualizado. Saída de processos não é copiada para este documento para evitar vazar dados ou tornar o arquivo não determinístico.');
  return lines.join('\n');
}

export function replaceManagedBlock(document, generatedBlock) {
  const start = document.indexOf(START_MARKER);
  const end = document.indexOf(END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Marcadores TOOL_HEALTH ausentes ou inválidos no documento de status.');
  }
  const before = document.slice(0, start + START_MARKER.length);
  const after = document.slice(end);
  return `${before}\n${generatedBlock.trim()}\n${after}`;
}
