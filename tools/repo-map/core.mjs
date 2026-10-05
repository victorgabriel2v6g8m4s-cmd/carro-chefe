import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const toPosix = (value) => value.split(path.sep).join("/");
const normalizeGeneratedText = (value) => value
  .normalize("NFC")
  .replace(/\r\n/g, "\n")
  .replace(/[ \t]+$/gm, "")
  .trimEnd();

function firstTextDifference(current, expected) {
  const currentLines = normalizeGeneratedText(current).split("\n");
  const expectedLines = normalizeGeneratedText(expected).split("\n");
  const length = Math.max(currentLines.length, expectedLines.length);
  for (let index = 0; index < length; index += 1) {
    if (currentLines[index] !== expectedLines[index]) {
      return `primeira divergência na linha ${index + 1}: atual=${JSON.stringify(currentLines[index] ?? "<ausente>")} esperado=${JSON.stringify(expectedLines[index] ?? "<ausente>")}`;
    }
  }
  return "conteúdo divergente sem linha identificável";
}

export async function loadStructure(projectRoot) {
  const raw = await fs.readFile(path.join(projectRoot, ".repo", "structure.json"), "utf8");
  return JSON.parse(raw);
}

export async function listTrackedFiles(projectRoot) {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  return stdout.split("\0").filter(Boolean).map(toPosix).sort(compareText);
}

function rootEntry(file) {
  return file.split("/")[0];
}

function directChildren(files, directory) {
  const prefix = `${directory}/`;
  const dirs = new Set();
  const directFiles = new Set();
  for (const file of files) {
    if (!file.startsWith(prefix)) continue;
    const rest = file.slice(prefix.length);
    const [first, ...tail] = rest.split("/");
    if (!first) continue;
    if (tail.length) dirs.add(first);
    else directFiles.add(first);
  }
  return {
    directories: [...dirs].sort(compareText),
    files: [...directFiles].sort(compareText)
  };
}

function sameList(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export function validateStructure(contract, trackedFiles) {
  const errors = [];
  const allowedDirs = new Set(contract.allowedRootDirectories);
  const allowedFiles = new Set(contract.allowedRootFiles);
  const rootDirs = new Set();
  const rootFiles = new Set();

  for (const file of trackedFiles) {
    const root = rootEntry(file);
    if (file.includes("/")) rootDirs.add(root);
    else rootFiles.add(root);
  }

  for (const directory of [...rootDirs].sort(compareText)) {
    if (!allowedDirs.has(directory)) errors.push(`Diretório de raiz fora do contrato: ${directory}/`);
  }
  for (const file of [...rootFiles].sort(compareText)) {
    if (!allowedFiles.has(file)) errors.push(`Arquivo de raiz fora do contrato: ${file}`);
  }
  for (const forbidden of contract.forbiddenRootEntries ?? []) {
    if (rootDirs.has(forbidden) || rootFiles.has(forbidden)) errors.push(`Entrada legada proibida ainda rastreada na raiz: ${forbidden}`);
  }

  for (const [directory, expected] of Object.entries(contract.managedDirectories ?? {})) {
    const actual = directChildren(trackedFiles, directory);
    const expectedDirs = [...expected.directories].sort(compareText);
    const expectedFiles = [...expected.files].sort(compareText);
    if (!sameList(actual.directories, expectedDirs)) {
      errors.push(`${directory}/: subpastas atuais [${actual.directories.join(", ")}] != contrato [${expectedDirs.join(", ")}]`);
    }
    if (!sameList(actual.files, expectedFiles)) {
      errors.push(`${directory}/: arquivos diretos atuais [${actual.files.join(", ")}] != contrato [${expectedFiles.join(", ")}]`);
    }
  }

  return errors;
}

export function renderRepositoryMap(contract) {
  const lines = [
    "# Mapa do repositório",
    "",
    "> Gerado a partir de `.repo/structure.json` por `tools/repo-map/generate.mjs`. Não edite a árvore manualmente; altere o contrato e execute `npm run repo:map`.",
    "",
    "## Regra operacional",
    "",
    "Este mapa é parte do contrato de organização do Carro Chefe. Qualquer criação, movimentação ou remoção estrutural deve respeitar `.repo/structure.json` e atualizar este arquivo na mesma entrega. `npm run policy:check` e o preflight de agentes validam o mapa automaticamente.",
    "",
    "## Categorias canônicas",
    "",
    "| Caminho | Categoria | Finalidade |",
    "|---|---|---|"
  ];
  for (const entry of contract.categories) {
    lines.push(`| \`${entry.path}\` | ${entry.category} | ${entry.purpose} |`);
  }
  lines.push("", "## Estrutura controlada", "", "```text", ".");
  for (const directory of contract.allowedRootDirectories) {
    lines.push(`├── ${directory}/`);
    const managed = contract.managedDirectories?.[directory];
    if (managed) {
      managed.directories.forEach((child, index) => {
        lines.push(`${index === managed.directories.length - 1 ? "│   └──" : "│   ├──"} ${child}/`);
      });
    }
  }
  for (const file of contract.allowedRootFiles) lines.push(`├── ${file}`);
  lines.push("```", "", "## Diretórios gerenciados", "");
  for (const [directory, managed] of Object.entries(contract.managedDirectories)) {
    const dirs = managed.directories.length ? managed.directories.map((item) => `\`${item}/\``).join(", ") : "nenhuma";
    const files = managed.files.length ? managed.files.map((item) => `\`${item}\``).join(", ") : "nenhum";
    lines.push(`- \`${directory}/\`: subpastas permitidas = ${dirs}; arquivos diretos permitidos = ${files}.`);
  }
  lines.push("", "## Legado preservado", "");
  for (const entry of contract.legacyNotes) lines.push(`- \`${entry.path}\` — ${entry.reason}`);
  lines.push("", "## Política de branches", "");
  lines.push(`- Canônicas: ${contract.branchPolicy.canonical.map((item) => `\`${item}\``).join(", ")}.`);
  lines.push(`- Evidências históricas: \`${contract.branchPolicy.archive}\`.`);
  lines.push(`- Prefixos temporários aceitos: ${contract.branchPolicy.temporaryPrefixes.map((item) => `\`${item}\``).join(", ")}.`);
  for (const rule of contract.branchPolicy.rules) lines.push(`- ${rule}`);
  lines.push(
    "",
    "## Como alterar a estrutura",
    "",
    "1. Leia este mapa e `docs/governanca/ORGANIZACAO_REPOSITORIO.md`.",
    "2. Coloque o arquivo na categoria já existente. Não crie pasta de topo por conveniência.",
    "3. Se a estrutura realmente precisar mudar, altere `.repo/structure.json` primeiro.",
    "4. Execute `npm run repo:map` e depois `npm run repo:map:check`.",
    "5. Atualize links, imports, manifests e documentação afetados na mesma PR.",
    "6. Não marque a PR como pronta enquanto `npm run policy:check` ou o CI acusarem mapa desatualizado.",
    ""
  );
  return lines.join("\n");
}

export async function writeRepositoryMap(projectRoot) {
  const contract = await loadStructure(projectRoot);
  const target = path.join(projectRoot, ...contract.mapFile.split("/"));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, renderRepositoryMap(contract), "utf8");
  return contract;
}

export async function assertRepositoryMapCurrent(projectRoot) {
  const contract = await loadStructure(projectRoot);
  const trackedFiles = await listTrackedFiles(projectRoot);
  const errors = validateStructure(contract, trackedFiles);
  const target = path.join(projectRoot, ...contract.mapFile.split("/"));
  const current = await fs.readFile(target, "utf8").catch(() => "");
  const expected = renderRepositoryMap(contract);
  if (normalizeGeneratedText(current) !== normalizeGeneratedText(expected)) {
    errors.push(`Mapa desatualizado: execute npm run repo:map e versione ${contract.mapFile}; ${firstTextDifference(current, expected)}.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { contract, trackedFiles };
}
