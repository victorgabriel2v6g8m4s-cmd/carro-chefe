# Blender Agent — integração 3D do Carro Chefe

## Objetivo

Criar uma camada versionada que permita a agentes do Carro Chefe iterar sobre modelos 3D no Blender mesmo quando a conta/desktop não possui Computer Use capaz de controlar aplicações do sistema. O caso inicial é a modelagem das baguetes e lanches reais, mas a ferramenta deve permanecer genérica para embalagens, balcão, totens, displays e outros ativos 3D.

## Problema resolvido

O gargalo identificado não era gerar scripts Python isolados; era fechar o ciclo `observar -> editar -> observar -> corrigir -> checkpoint -> continuar`. O Blender Agent introduz comandos semânticos via `bpy`, bridge local autenticado, controle de mouse/gestos pelo próprio Blender, checkpoints, renders/exports e protocolo estreito para agentes.

A API de simulação de eventos depende do Blender iniciado com `--enable-event-simulate`.

## Arquitetura

```text
ChatGPT / Codex / agente local
          |
          v
MCP / CLI Blender Agent
          | JSONL TCP + token em 127.0.0.1
          v
Blender + blender_bridge_v05_entry.py
          |
          +--> core V0.1–V0.4 (blender_bridge.py)
          +--> extensão V0.5 (blender_bridge_v05.py)
          |
          v
.runtime/blender-agent/
```

O socket roda em thread auxiliar; chamadas `bpy` são despachadas para a main thread via `bpy.app.timers`. O entrypoint V0.5 mantém o core estável e adiciona live status, deduplicação de history, captura focada e o plano iterativo.

## Contrato de segurança

- loopback obrigatório, porta efêmera e token novo por sessão;
- nenhuma action de Python arbitrário, `eval`, `exec` ou shell;
- actions enumeradas em `protocol.py`; novas actions exigem revisão;
- saídas automáticas confinadas a `.runtime/blender-agent`;
- primeira versão não usa PyAutoGUI/AutoHotkey nem mouse global do Windows;
- interação visual usa `bpy.types.Window.event_simulate`, confinada à janela Blender;
- operações destrutivas de recipe/iteração usam checkpoint e/ou snapshot antes da mutação;
- promoção de ativos para `mídias/`, `cardápio/` ou diretórios oficiais continua explícita.

## Estado atual — V0.5 em validação

Implementado: protocolo local, sessão/token, CLI, inventário de cena, ações semânticas, UI simulada, checkpoint/render/export, captura VIEW_3D, workspaces, auto-history segmentado, Sculpt assistido, recipes 3D versionadas, irregularidade determinística, biblioteca de materiais, capturas focadas no produto e plano iterativo V0.5 com percepção, proposal, budget, aprovação opcional, snapshots, rollback, diff, critérios, receipt e MCP multimodal.

Maturidade: **em desenvolvimento / validação real**.

## Roadmap

### V0.1 — Ponte controlável

- [x] bridge localhost e autenticação de sessão;
- [x] actions semânticas;
- [x] eventos estilo mouse confinados ao Blender;
- [x] checkpoint, render e export;
- [x] testes sem Blender;
- [x] smoke test completo no Windows 10 do proprietário: splash, `status`, bounds e `ui-orbit` funcionaram;
- [x] baseline operacional definida e validada em Blender 5.2.0 LTS.

### V0.2 — Feedback visual automático

- [x] bounds da maior VIEW_3D;
- [x] `viewport.describe`;
- [x] `viewport.capture` restrito à região 3D;
- [x] gravação PNG usando API nativa do Blender 5.2;
- [x] receipts JSON e SHA-256;
- [x] presets `FRONT`, `RIGHT`, `LEFT`, `TOP`, `BOTTOM`, `BACK`, `CAMERA` e `THREE_QUARTER`;
- [x] shading previsível;
- [x] CLI `viewport-capture-set`;
- [x] smoke test real das imagens no Windows 10/Blender 5.2 LTS;
- [x] adaptador MCP stdio para entregar imagem ao modelo;
- [ ] smoke test da conexão MCP no ambiente local do proprietário;
- [ ] grade comparativa referência vs captura/render como artefato dedicado.

Critério de pronto: o agente recebe imagem atualizada após cada lote sem intervenção manual de captura.

### Log de validação V0.2

- **29/09/2026 — primeiro smoke real:** bridge, descrição da viewport e preset 3/4 funcionaram; o PowerShell 5.1 corrompeu o caminho Unicode retornado pela CLI (`Área de Trabalho`), gerando falso negativo de arquivo ausente.
- **Correção:** JSON da CLI passou a ser ASCII-safe com escapes Unicode; scripts PowerShell foram restringidos a ASCII e receberam teste de regressão.
- **Segundo smoke real:** `smoke-test.ps1 -OpenImage` foi confirmado pelo proprietário; captura e receipt V0.2 estão validados.

### V0.2.1 — Contexto persistente e auto-history

- [x] listar workspaces/abas;
- [x] consultar conteúdo estruturado de uma ou várias abas;
- [x] restaurar workspace original depois da inspeção;
- [x] capturar vários workspaces em uma única action;
- [x] targets `VIEW_3D`, `WINDOW` e `AREA`;
- [x] manifesto agregado e SHA-256;
- [x] stage de produção com `previous_stage_id`;
- [x] eventos JSONL segmentados e rotacionados;
- [x] anexos por stage;
- [x] registro automático de actions e falhas;
- [x] redaction de segredos comuns;
- [x] busca por texto, stage, action, tempo, sucesso/falha, tags e anexos;
- [x] contexto com etapa anterior/próximas e eventos recentes;
- [x] ferramentas MCP para workspaces e auto-history;
- [x] smoke real no Windows 10/Blender 5.2 LTS após sincronização assíncrona de redraw.

Documento: [BLENDER_AGENT_CONTEXT.md](./BLENDER_AGENT_CONTEXT.md).

### V0.3 — Sculpt assistido

- [x] ativação explícita de Sculpt Mode;
- [x] workspace Sculpting/Layout com restauração posterior;
- [x] brushes allowlisted;
- [x] stroke multiponto;
- [x] coordenadas normalizadas independentes da resolução;
- [x] radius/strength/pressure limitados;
- [x] modos compatíveis com a API disponível;
- [x] checkpoint automático antes do stroke;
- [x] captura before/after;
- [x] auto-history de strokes e anexos;
- [x] MCP `blender_sculpt_iteration`;
- [x] compatibilidade `UnifiedPaintSettings` e `OperatorStrokeElement` do Blender 5.2;
- [x] smoke real no Windows 10 + Blender 5.2 LTS em 02/10/2026.

Critério atingido: stroke real, before/after distintos, checkpoint/history e workspace restaurado. Documento: [BLENDER_AGENT_SCULPT.md](./BLENDER_AGENT_SCULPT.md).

### V0.4 — Recipes 3D de produto

- [x] schema JSON fechado e versionado;
- [x] metadata/id/version/tags;
- [x] parâmetros tipados com bounds/enum;
- [x] componentes declarativos;
- [x] steps ordenados com actions recipe-safe;
- [x] checkpoint antes de step destrutivo;
- [x] captura depois de step;
- [x] validation views;
- [x] critérios simples de aceite;
- [x] variants e overrides sem mutar a recipe base;
- [x] hashes determinísticos de recipe/plano/receipt;
- [x] execução step-by-step pelo scheduler do Blender;
- [x] stage próprio e eventos `recipe.start/step/capture/finish/run`;
- [x] CLI e MCP validate/plan/run/status;
- [x] recipe de exemplo da baguete base;
- [x] seeds determinísticos para irregularidade procedural;
- [x] biblioteca de materiais reutilizável/versionada por ID;
- [x] smoke real confirmou execução, receipt, history e arquivos PNG válidos;
- [x] bug de extensão em nomes longos corrigido com `sanitize_filename`;
- [x] captura focada implementada: target isolado temporariamente + `view_selected`, sem apagar câmera/luz/outros objetos;
- [ ] validar visualmente no Windows 10 que o novo capture focado não inclui o Cube/câmera/luz.

Documento: [BLENDER_AGENT_RECIPES.md](./BLENDER_AGENT_RECIPES.md).

### V0.5 — Agente 3D iterativo

Implementado e aguardando smoke real integrado:

- [x] engine pura `iteration.py` para config/proposals/criteria;
- [x] schema fechado, limites de targets/views/iterações/proposal;
- [x] ações de proposal allowlisted e restritas aos targets;
- [x] ciclo `observe -> propose -> apply -> evaluate`;
- [x] budget de iterações;
- [x] percepção estruturada de transforms/dimensões/modifiers/materiais/topologia;
- [x] hash de geometria e state hash;
- [x] capturas focadas por vista e target;
- [x] MCP multimodal para observar e comparar before/after;
- [x] snapshot em memória antes de mutação;
- [x] checkpoint `.blend` persistente;
- [x] rollback automático quando a action falha;
- [x] rollback explícito por avaliação/manual;
- [x] diff estruturado de métricas;
- [x] critérios dimensionais, topológicos, budget, falhas, rollbacks e visual score;
- [x] aprovação humana opcional antes de `apply`;
- [x] auto-history `iteration.start/observe/propose/apply/evaluate/rollback/finish` sem duplicação genérica;
- [x] receipt final SHA-256;
- [x] CLI dedicada `iteration_cli.py`;
- [x] MCP V0.5 dedicado `mcp_server_v05.py`;
- [x] live `iteration.status` fora da fila da main thread;
- [x] timeout ampliado para actions iterativas no entrypoint;
- [x] smoke integrado partindo de recipe V0.4 e validando rollback por state hash;
- [ ] smoke real integrado no Windows 10 + Blender 5.2 LTS;
- [ ] validar conexão MCP local V0.5 no cliente do proprietário;
- [ ] endurecer rollback de sessão que permaneça em Sculpt Mode antes de substituir o mesh; checkpoint `.blend` continua como recuperação persistente nesse caso.

O planner é o agente externo: o bridge não executa código livre nem toma decisões irrestritas. A comparação visual é feita pelo modelo/humano sobre captures e retorna `visual_score`/notas para critérios estruturados.

Documento: [BLENDER_AGENT_ITERATIVE.md](./BLENDER_AGENT_ITERATIVE.md).

### V1.0 — Ferramenta operacional

Critérios: smokes Windows documentados, addon/painel instalável, protocolo estável, logs estruturados, recuperação do bridge, versionamento de recipes, integração completa com health, guia de agentes e regressão em Blender LTS.

## Roadmap específico da baguete

1. organizar referências aprovadas por ângulo;
2. definir escala real;
3. gerar base paramétrica do pão;
4. validar comprimento/largura/altura;
5. criar abertura e recheio;
6. ajustar crosta/miolo;
7. adicionar componentes do lanche;
8. renderizar frente/lateral/topo/3-4;
9. comparar com fotos reais no loop multimodal;
10. usar Sculpt apenas onde a geometria semântica não bastar;
11. checkpoint por marco;
12. exportar GLB e render publicitário;
13. promover somente a versão aprovada.

## Métricas

- ações por versão aprovada;
- percentual semântico vs `ui.*`;
- rollbacks por sessão;
- tempo checkpoint -> render;
- falhas de contexto de UI;
- intervenções humanas;
- reprodutibilidade de recipe;
- desvio dimensional contra produto real;
- iterações até critérios passarem;
- visual score por view e versão.

## Custo relativo

Processamento: **médio**, podendo chegar a **alto** em render/sculpt e loops com muitas views. Impacto Work: **baixo/médio**, dependente do número de iterações. Blender não adiciona licença paga. Checkpoints/renders/captures podem crescer e permanecem em runtime até promoção. Não atribuir tokens/créditos oficiais quando a plataforma não os expõe.

## Decisões

### ADR-BLENDER-001 — eventos internos em vez de mouse global

Usar `bpy.types.Window.event_simulate` como primeira opção para gestos. PyAutoGUI/AutoHotkey global ficam fora por superfície de risco e fragilidade de foco.

### ADR-BLENDER-002 — actions em vez de Python arbitrário

Protocolo allowlisted para manter auditabilidade, testes e menor risco.

### ADR-BLENDER-003 — runtime antes de ativos oficiais

Outputs automáticos ficam em `.runtime/blender-agent` para separar experimento de artefato aprovado.

### ADR-BLENDER-004 — MCP stdio como fronteira do agente

O bridge TCP continua privado em loopback. Agentes se conectam por servidor MCP stdio que reaproveita a allowlist e devolve imagens ao modelo.

### ADR-BLENDER-005 — V0.5 como extensão do core validado

`blender_bridge_v05.py` importa e estende o core V0.1–V0.4 em vez de duplicar 100% da implementação. O entrypoint V0.5 instala as extensões, deduplica history e inicia o servidor. Isso reduz regressão nas capacidades já validadas.

### ADR-BLENDER-006 — isolamento visual temporário

Captures de recipe/iteração usam `hide_set` temporário e `view_selected`; objetos externos ao target são restaurados após a captura. A validação visual não deve apagar conteúdo da cena do usuário.

## Pendências conhecidas

Acompanhar `docs/ferramentas/PENDENCIAS.md`. A promoção V0.5 depende do smoke real integrado e, separadamente, da validação do cliente MCP local.
