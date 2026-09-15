# Tool Health

Verificador das ferramentas próprias do Carro Chefe. O catálogo executável fica em `catalog.json`; o CLI roda os checks declarados e atualiza somente o bloco gerenciado de `docs/ferramentas/STATUS_AUTOMATICO.md`.

## Comandos

```bash
npm run test:tool-health
npm run tools:status
npm run tools:status:dry
npm run tools:status:check
```

- `tools:status`: executa checks aplicáveis e grava a seção de status;
- `tools:status:dry`: executa e imprime o bloco, sem escrita;
- `tools:status:check`: executa e falha se o bloco versionado não corresponder ao resultado atual;
- `test:tool-health`: testa validação, classificação e renderização do próprio verificador.

## Segurança e efeitos colaterais

O Tool Health:

- executa apenas comandos allowlisted em `catalog.json`;
- usa timeout por ferramenta;
- roda sequencialmente para reduzir contenção e facilitar diagnóstico;
- não instala dependências, não faz deploy, não compra, não publica e não configura serviços;
- não grava `stdout`/`stderr` no Markdown para evitar vazamento e instabilidade;
- grava o documento por arquivo temporário + rename;
- preserva todo conteúdo fora de `<!-- TOOL_HEALTH:START -->` e `<!-- TOOL_HEALTH:END -->`;
- não considera ferramenta exclusiva de outro SO como falha;
- retorna código diferente de zero quando um check aplicável falha ou fica bloqueado.

## Contrato do catálogo

Campos principais:

- `id`: ID estável em kebab-case;
- `name`: nome humano;
- `path`: caminho que deve existir para ferramenta implementada;
- `maturity`: `planned`, `development`, `complete` ou `legacy-complete`;
- `platforms`: plataformas suportadas (`linux`, `darwin`, `win32`);
- `command` ou `commands`: check seguro e não interativo;
- `timeoutMs`: limite de execução.

Ferramenta `planned` não recebe comando executável. Ferramenta implementada precisa ter check. O catálogo não deve conter credenciais, comandos destrutivos ou ações externas irreversíveis.

## Maturidade versus saúde

Maturidade é mantida por decisão de engenharia. Saúde vem do comando executado. Assim, `development + pass` significa “implementação em desenvolvimento com check atual passando”, não “completa”. Da mesma forma, `complete + fail` evidencia uma regressão sem reescrever silenciosamente a maturidade.

## Multi-plataforma

Uma execução local grava o estado da plataforma em que rodou. O supervisor Windows é `platform-skip` fora de `win32`; o workflow existente em `.github/workflows/ci.yml` continua sendo a evidência de compilação Windows. A consolidação automática de resultados cross-platform está registrada em `docs/ferramentas/PENDENCIAS.md`.
