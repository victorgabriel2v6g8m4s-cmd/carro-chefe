# Blender Agent — limitações encontradas em produção real

## Contexto

Em uma execução real mais extensa no Windows 10 + Blender 5.2 LTS, a recipe concluiu **49 etapas** envolvendo modelagem, materiais, câmera, render e exportação. A execução chegou ao final das etapas principais, porém não passou no critério de capturas.

Também foi executado um teste separado de Sculpt. Ele falhou durante `sculpt.prepare`, antes de qualquer stroke ser aplicado.

Este documento registra os dois incidentes e as correções implementadas na branch `feature/blender-agent-bridge`.

## Incidente A — captura com caminho absoluto de 262 caracteres

### Evidência observada

- as 49 etapas principais da recipe foram concluídas;
- modelagem, material, câmera, render e exportação funcionaram;
- o critério de capturas falhou;
- o caminho absoluto de uma captura chegou a **262 caracteres**;
- capturas manuais com nomes curtos funcionaram em quatro vistas.

Isso isolou o problema: o mecanismo de screenshot estava operacional; a falha estava na composição do caminho do artefato.

### Causa

A correção anterior preservava `.png` e limitava o **nome do arquivo**, mas não considerava o comprimento do caminho completo:

```text
<repo>/.runtime/blender-agent/history/<stage-id>/attachments/<filename>
```

Em um repositório sob OneDrive e com um stage descritivo, o diretório pai já consome grande parte do limite compatível com APIs Windows legadas. Um filename válido de até 100 caracteres ainda podia produzir caminho total acima de `MAX_PATH`.

### Correção

O runtime V0.5 instala uma política de compatibilidade em `tools/blender_agent/runtime_compat.py`:

- orçamento padrão do caminho Windows completo: **240 unidades UTF-16**;
- cálculo inclui o diretório pai e o separador;
- quando necessário, somente o stem é reduzido;
- a extensão (`.png`, `.json`, `.blend`, `.glb`, `.obj` etc.) é preservada;
- um hash SHA-256 curto e determinístico é incluído no nome reduzido para preservar unicidade;
- colisões recebem novo nome ainda dentro do orçamento;
- `CC_BLENDER_MAX_PATH` permite ajustar o limite em ambientes que suportam caminhos maiores;
- se o próprio runtime já for longo demais para deixar um orçamento mínimo seguro, a falha orienta configurar `CC_BLENDER_RUNTIME` para um caminho mais curto.

A proteção é instalada no caminho canônico de startup V0.5 e cobre attachments/history, capturas, receipts e caminhos de runtime usados por checkpoints.

## Incidente B — `SculptPrepareJob.run_id`

### Evidência observada

O teste de Sculpt falhou em `sculpt.prepare`, antes de aplicar qualquer stroke, com referência a:

```text
SculptPrepareJob.run_id
```

### Causa

Foi localizado um bloco de logging de `recipe.run` copiado indevidamente para a fase `prepare` de `SculptPrepareJob`. Esse job não possui — e não deveria possuir — `run_id`, `plan` ou `stage_id` de recipe.

O erro ocorria depois de preparar o contexto Sculpt, ao tentar registrar metadata de uma recipe inexistente, impedindo o fluxo de chegar ao stroke.

### Correção

O runner corrigido:

1. executa `_sculpt_prepare_active(...)`;
2. devolve o resultado ao request de `sculpt.prepare`;
3. registra a própria action usando `_record_task_history(...)`;
4. encerra o job;
5. não acessa `run_id`, `plan` ou metadata de recipe.

O checkpoint de Sculpt também passou a gerar o nome lógico completo e deixar a camada de compatibilidade de paths preservar `.blend` e reduzir o nome somente se necessário.

## Testes de regressão

`tools/blender_agent/tests/test_runtime_compat.py` cobre:

- orçamento do caminho completo, não apenas do filename;
- preservação de `.png`;
- hash determinístico em nomes longos que compartilham prefixo;
- `safe_runtime_path` respeitando `CC_BLENDER_MAX_PATH`;
- attachment de history com stage + filename longos;
- limite padrão de 240, abaixo de 260;
- ausência de `job.run_id`, `job.plan` e `recipe.run` no runner corrigido de `sculpt.prepare`;
- instalação da compatibilidade antes de `core.start_bridge()`.

## Validação real pendente

As correções estão implementadas e testadas no código, mas estes dois incidentes só devem ser marcados como resolvidos em máquina real após:

1. repetir a recipe de 49 etapas e confirmar que as capturas automáticas passam o critério;
2. confirmar que os caminhos gerados ficam abaixo do orçamento configurado e preservam `.png`;
3. executar `sculpt-smoke-test.ps1 -OpenImages` e confirmar que `sculpt.prepare` chega ao stroke;
4. confirmar checkpoint, before/after, history e restauração de workspace do Sculpt.

Até essa revalidação, o status é **correção implementada / validação real pendente**.
