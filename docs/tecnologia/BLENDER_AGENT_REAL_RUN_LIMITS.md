# Blender Agent — limitações encontradas em produção real

## Contexto

Em uma execução real mais extensa no Windows 10 + Blender 5.2 LTS, a recipe concluiu **49 etapas** envolvendo modelagem, materiais, câmera, render e exportação. A execução chegou ao final das etapas principais, porém não passou no critério de capturas.

Também foi executado um teste separado de Sculpt. Ele falhou durante `sculpt.prepare`, antes de qualquer stroke ser aplicado.

Durante a revalidação, uma sessão iniciada pelo Blender Agent também mostrou outro problema operacional: ao fechar a janela com alterações não salvas, o prompt nativo de saída aparecia, porém ficava sem interação útil, reproduzindo o mesmo tipo de bloqueio observado anteriormente com popup/modal de startup.

Este documento registra os incidentes e as correções implementadas na branch `feature/blender-agent-bridge`.

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

### Revalidação revelou runtime Blender antigo em memória

Uma nova execução do smoke continuou exibindo exatamente `SculptPrepareJob.run_id`. A inspeção do startup mostrou que o launcher atual aponta para `blender_bridge_v05_entry.py`, e esse entrypoint instala `runtime_compat`; portanto, esse erro também pode ocorrer quando o processo Blender que está atendendo `bridge.json` foi iniciado **antes** da atualização dos arquivos e continua com o módulo antigo carregado em memória.

Para impedir que o smoke avance silenciosamente contra um bridge antigo, `sculpt-smoke-test.ps1` agora executa dois guards antes de criar qualquer objeto:

- compara o horário de início do PID registrado em `bridge.json` com o `LastWriteTimeUtc` de `runtime_compat.py` e `blender_bridge_v05_entry.py`;
- exige no `health` o perfil atual do runtime V0.5.

O entrypoint V0.5 também foi endurecido porque `blender_bridge.py` cria o servidor durante o import. Depois de definir `HandlerV05`, ele instala a compatibilidade e atualiza também `core._SERVER.RequestHandlerClass`, garantindo que novas conexões usem o handler V0.5 mesmo quando o servidor legado já foi criado pelo side effect de import.

Se qualquer guard falhar, o teste encerra em `1/7 bridge status` com orientação explícita para fechar o Blender, executar `git pull` e iniciar novamente via `start.ps1`, em vez de continuar até um erro interno enganoso no passo 4.

## Incidente C — prompt de saída sem interação útil

### Evidência observada

Ao tentar fechar uma sessão Blender Agent com alterações não salvas, o Blender abriu o prompt nativo de salvar/descartar, mas cliques não conseguiam concluir a interação. O sintoma é operacionalmente equivalente ao problema anterior de modal de startup: a sessão fica difícil de encerrar pela UI mesmo com o bridge ainda identificável por `bridge.json`.

### Correção operacional

O runtime `v05-runtime-compat-20261005.3` adiciona a action allowlisted `app.quit`, usada por `tools/blender_agent/stop.ps1`.

O encerramento deixa de depender do popup nativo:

- `checkpoint` — modo padrão; grava uma cópia `.blend` de recuperação em `.runtime/blender-agent/checkpoints/` e depois encerra;
- `save` — salva o `.blend` atual no próprio caminho e depois encerra; exige que o arquivo já tenha caminho;
- `discard` — encerra sem salvar alterações;
- `-Force` no PowerShell existe apenas como recuperação de processo preso e avisa explicitamente sobre perda de mudanças não salvas.

A action agenda o `quit_blender` para depois da resposta RPC. Imediatamente antes do quit, desabilita o save prompt **somente no processo corrente**, evitando depender do modal de confirmação. A preferência não é persistida pelo Blender Agent.

Comandos recomendados para novas sessões:

```powershell
# seguro por padrão: cria recovery checkpoint e fecha
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/stop.ps1

# salvar o arquivo atual e fechar
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/stop.ps1 -Mode save

# descartar explicitamente
powershell -NoProfile -ExecutionPolicy Bypass -File tools/blender_agent/stop.ps1 -Mode discard
```

Para um processo antigo já preso no modal, `ui-dismiss` deve ser tentado primeiro. Se o processo não carregar `app.quit`, pode-se criar um checkpoint pelo bridge antigo e somente então usar `stop.ps1 -Force`.

## Testes de regressão

`tools/blender_agent/tests/test_runtime_compat.py` cobre:

- orçamento do caminho completo, não apenas do filename;
- preservação de `.png`;
- hash determinístico em nomes longos que compartilham prefixo;
- `safe_runtime_path` respeitando `CC_BLENDER_MAX_PATH`;
- attachment de history com stage + filename longos;
- limite padrão de 240, abaixo de 260;
- ausência de `job.run_id`, `job.plan` e `recipe.run` no runner corrigido de `sculpt.prepare`;
- instalação da compatibilidade antes de `core.start_bridge()`;
- allowlist/runtime dispatch de `app.quit`;
- shutdown sem prompt usando `quit_blender`;
- `stop.ps1` seguro por padrão em modo `checkpoint` e `-Force` explícito.

O smoke PowerShell também valida freshness do processo e identidade do runtime antes de testar Sculpt.

## Validação real pendente

As correções estão implementadas e testadas no código, mas os incidentes só devem ser marcados como resolvidos em máquina real após:

1. encerrar o Blender antigo preso no modal, preservando checkpoint se houver trabalho relevante;
2. executar `git pull` e iniciar uma nova sessão pelo `start.ps1`;
3. confirmar que `python -m tools.blender_agent.client status` retorna `runtime_profile: v05-runtime-compat-20261005.3`;
4. testar `stop.ps1` em modo padrão e confirmar checkpoint + fechamento sem popup;
5. repetir a recipe de 49 etapas e confirmar que as capturas automáticas passam o critério;
6. confirmar que os caminhos gerados ficam abaixo do orçamento configurado e preservam `.png`;
7. executar `sculpt-smoke-test.ps1 -OpenImages` e confirmar que `sculpt.prepare` chega ao stroke;
8. confirmar checkpoint, before/after, history e restauração de workspace do Sculpt.

Até essa revalidação, o status é **correção implementada / validação real pendente**.
