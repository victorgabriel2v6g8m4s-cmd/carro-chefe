# Blender Agent — Recipes 3D V0.4

## Objetivo

Transformar uma produção 3D em um contrato declarativo, versionado e reproduzível. A recipe descreve **o que** deve ser construído e validado; o bridge continua decidindo **como** executar somente actions allowlisted.

Não existe Python arbitrário, `eval`, `exec` ou shell dentro de uma recipe.

## Arquivos

Engine:

```text
tools/blender_agent/recipes.py
```

Exemplo inicial:

```text
tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json
```

## Formato

Campos de topo:

- `schema_version`;
- `id`;
- `version` semver;
- `label` / `description`;
- `tags`;
- `parameters`;
- `components`;
- `steps`;
- `validation_views`;
- `criteria`;
- `variants`.

Campos desconhecidos falham em validação.

## Parâmetros

Tipos suportados:

- `number`;
- `integer`;
- `boolean`;
- `string`;
- `vec3`.

Parâmetros podem possuir `minimum`, `maximum` e `enum`.

Referência:

```json
{
  "name": "${object_name}",
  "scale": "${bread_scale}"
}
```

A substituição ocorre sem alterar a recipe base. Se o valor inteiro for um token `${parametro}`, o tipo original é preservado.

## Variants e overrides

Variants vivem dentro da recipe:

```json
{
  "variants": {
    "long": {
      "overrides": {
        "bread_scale": [4.5, 1.05, 0.65]
      }
    }
  }
}
```

O usuário/agente também pode aplicar overrides em runtime.

Precedência:

```text
default < variant < override explícito
```

A recipe base nunca é mutada.

## Steps

Cada step possui:

- `id`;
- `action`;
- `params`;
- `checkpoint_before`;
- `checkpoint_label`;
- `capture_after`;
- `continue_on_error`;
- `tags`.

Limite atual: 64 steps.

A V0.4 aceita apenas o subconjunto `RECIPE_SAFE_ACTIONS`. Actions de UI genérica, history, recipe recursiva e Sculpt assíncrono não podem ser embutidas diretamente.

## Checkpoints

`checkpoint_before: true` cria um `.blend` antes do step.

O caminho fica em:

```text
.runtime/blender-agent/checkpoints/
```

O resultado do checkpoint é anexado ao evento `recipe.step`.

## Capturas

Um step pode possuir `capture_after`.

A recipe também pode definir `validation_views` independentes, por exemplo:

- FRONT;
- RIGHT;
- TOP;
- THREE_QUARTER.

Cada captura passa pelo timer-yield do Blender antes da screenshot.

## Critérios de aceite

V0.4 possui critérios simples e determinísticos:

- `required_objects`;
- `min_captures`;
- `max_failed_steps`.

O receipt informa cada check e `criteria_passed`.

## Hashes e receipts

A engine usa JSON canônico + SHA-256.

Cada execução possui:

- `recipe_hash`;
- `plan_hash`;
- `receipt_hash`.

No início da execução, cópias normalizadas da recipe e do plano são gravadas dentro do stage ativo.

No final:

```text
.runtime/blender-agent/history/<stage-id>/attachments/
  recipe-...-recipe.json
  recipe-...-plan.json
  recipe-...-receipt.json
  <capturas>.png
```

## Auto-history

Cada execução registra:

- `recipe.start`;
- `recipe.step` por step;
- `recipe.capture`;
- `recipe.finish`;
- `recipe.run`.

Eventos incluem recipe id/version/hash, plan hash, run id, step index/id/action e anexos.

Por padrão, `recipe.run` cria um stage próprio. É possível desabilitar isso para fluxos avançados.

## Executor assíncrono

`recipe.run` é executado pelo scheduler do bridge, não por um loop externo.

Estados relevantes:

```text
step
  -> capture_settle
  -> capture
  -> validation
  -> validation_settle
  -> validation_capture
  -> finalize
```

Isso permite ceder ciclos ao event loop antes de capturas e deixa `recipe.status` útil durante a execução.

## CLI

Validar sem Blender:

```powershell
python -m tools.blender_agent.client recipe-validate tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json
```

Planejar sem alterar a cena:

```powershell
python -m tools.blender_agent.client recipe-plan tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json --variant long --set object_name=Teste_Baguete
```

Dry-run pelo bridge:

```powershell
python -m tools.blender_agent.client recipe-run tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json --variant compact --dry-run
```

Executar:

```powershell
python -m tools.blender_agent.client recipe-run tools/blender_agent/recipes/carro-chefe-baguette-base-v1.json --variant compact --set object_name=Minha_Baguete
```

Status:

```powershell
python -m tools.blender_agent.client recipe-status
```

## MCP

Ferramentas:

- `blender_recipe_validate`;
- `blender_recipe_plan`;
- `blender_recipe_run`;
- `blender_recipe_status`.

O fluxo recomendado para um agente é:

```text
validate
  -> plan
  -> revisar parâmetros/variant
  -> run
  -> acompanhar status
  -> analisar capturas/receipt
```

## Segurança e limites

- schema fechado;
- 512 KiB máximos por recipe;
- até 50 parâmetros;
- até 50 componentes;
- até 64 steps;
- até 16 validation views;
- até 20 variants;
- profundidade JSON limitada;
- actions recipe-safe explícitas;
- a action `object.delete` exige `checkpoint_before: true`;
- nenhum código arbitrário;
- saídas confinadas ao runtime;
- history segmentado;
- timeout ampliado somente para `recipe.run`.

## Smoke test

Com o Blender Agent aberto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/recipe-smoke-test.ps1 -OpenImages
```

O smoke:

1. valida a recipe;
2. planeja a variant `compact`;
3. aplica override com nome de objeto único;
4. executa em stage isolado;
5. exige criteria passados;
6. exige receipt;
7. exige pelo menos quatro capturas;
8. verifica `recipe.status`;
9. verifica eventos `recipe.step`;
10. remove o objeto temporário;
11. restaura o stage anterior.

## Próximo passo

Depois da V0.4 validada na máquina real, a V0.5 pode usar recipes como unidade de planejamento/rollback em vez de improvisar uma sequência completa de ações a cada sessão.


## Status durante execução

`recipe.status` é respondido diretamente pela thread do socket usando somente o estado em memória do job. Ele não entra na fila da main thread, portanto continua consultável enquanto `recipe.run` ocupa o scheduler do Blender.

O status inclui run id, recipe/version, plan hash, stage, phase, step atual, steps concluídos, falhas e quantidade de capturas.


## Workspace da recipe

Antes de executar steps, o runner garante uma VIEW_3D estável:

- se o workspace atual já possui VIEW_3D, ele pode ser usado;
- se não possui, o runner usa `Layout`;
- CLI/MCP podem solicitar explicitamente outro workspace;
- por padrão, o workspace original é restaurado no final com timer-yield e confirmação do screen.

CLI:

```powershell
python -m tools.blender_agent.client recipe-run <recipe.json> --workspace Layout
```

`--keep-workspace` desabilita somente a restauração visual; o padrão seguro é restaurar.

O receipt registra `original_workspace`, `recipe_workspace`, `final_workspace` e `workspace_restored`.


## Irregularidade determinística

Recipes podem usar `object.irregularize` para quebrar perfeição geométrica de forma reproduzível.

Parâmetros:

- `name`: mesh alvo;
- `seed`: inteiro/string obrigatório;
- `amplitude`: vec3 local, limitada a ±0.5 por eixo.

Cada deslocamento é derivado de SHA-256 sobre `seed + vertex_index + axis`. Isso evita depender do estado global de um PRNG e mantém a mesma perturbação para a mesma topologia/seed.

A action é considerada destrutiva pela recipe e exige `checkpoint_before: true`. O resultado inclui `geometry_hash`.

A baguete de exemplo possui `irregularity_seed` e `irregularity_amplitude`; variants podem trocar o seed sem alterar a recipe base.

## Biblioteca de materiais

Biblioteca versionada:

```text
tools/blender_agent/materials/carro-chefe-materials-v1.json
```

Presets iniciais:

- `bread-crust`;
- `bread-crumb`;
- `meat-grilled`;
- `cheese-melted`;
- `vinaigrette`;
- `sauce-creamy`;
- `skewer-wood`.

A action `material.preset` recebe `name`, `preset_id`, material name opcional e overrides restritos de `base_color`, `roughness` e `metallic`. O resultado registra library id/version/preset id.

A recipe da baguete usa `bread-crust` em vez de repetir os valores completos do material.


## Extensões de arquivos de captura

O runtime limita nomes de artefatos para evitar caminhos excessivamente longos. A sanitização de **arquivos** preserva a extensão ao truncar o stem.

Exemplo: um nome longo de capture continua terminando em `.png` mesmo quando precisa ser reduzido para 100 caracteres.

O smoke V0.4 valida explicitamente que todas as capturas:

- possuem caminho existente;
- terminam em `.png`;
- permanecem associadas ao receipt/history.

Essa regra também foi aplicada genericamente aos arquivos do runtime e aos attachments do auto-history, preservando extensões como `.png`, `.json`, `.blend`, `.glb` e `.obj`.
