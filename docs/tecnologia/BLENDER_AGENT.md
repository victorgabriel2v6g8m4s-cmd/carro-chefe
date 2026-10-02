# Blender Agent — integração 3D do Carro Chefe

## Objetivo

Criar uma camada versionada que permita a agentes do Carro Chefe iterar sobre modelos 3D no Blender mesmo quando a conta/desktop não possui Computer Use capaz de controlar aplicações do sistema. O caso inicial é a modelagem das baguetes e lanches reais, mas a ferramenta deve permanecer genérica para embalagens, balcão, totens, displays e outros ativos 3D.

## Problema resolvido

O gargalo identificado não era gerar scripts Python isolados; era fechar o ciclo `observar -> editar -> observar -> corrigir -> checkpoint -> continuar`. O Blender Agent introduz comandos semânticos via `bpy`, bridge local autenticado, controle de mouse/gestos pelo próprio Blender, checkpoints, renders/exports e protocolo estreito para agentes.

A API de simulação de eventos depende do Blender iniciado com `--enable-event-simulate`.

## Arquitetura V0.1

```text
ChatGPT / Codex / agente local
          |
          v
tools.blender_agent.client
          | JSONL TCP + token em 127.0.0.1
          v
Blender + blender_bridge.py
     |                         |
     v                         v
ações bpy                Window.event_simulate
objetos/material         click/drag/wheel
câmera/render/export           |
     +------------+------------+
                  v
        .runtime/blender-agent/
```

O socket roda em thread auxiliar; toda chamada `bpy` é despachada para a main thread via `bpy.app.timers`.

## Contrato de segurança

- loopback obrigatório, porta efêmera e token novo por sessão;
- nenhuma action de Python arbitrário, `eval`, `exec` ou shell;
- actions enumeradas em `protocol.py`; novas actions exigem revisão;
- saídas automáticas confinadas a `.runtime/blender-agent`;
- primeira versão não usa PyAutoGUI/AutoHotkey nem mouse global do Windows;
- interação visual usa `bpy.types.Window.event_simulate`, confinada à janela Blender;
- promoção de ativos para `mídias/`, `cardápio/` ou diretórios oficiais continua explícita.

## Estado atual — V0.4 em validação

Implementado: protocolo local, sessão/token, CLI, inventário de cena, seleção/criação/transformação/duplicação/exclusão, mesh explícito, modifiers allowlisted, material Principled simples, câmera orbital, render PNG, checkpoint `.blend`, GLB/OBJ, controle de UI, captura VIEW_3D, múltiplos workspaces, auto-history por etapa, Sculpt assistido validado, MCP multimodal e engine V0.4 de recipes 3D JSON versionadas com variants, overrides, plano determinístico, execução step-by-step, validation views, critérios e receipts SHA-256.

Maturidade: **em desenvolvimento**.

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

Objetivo: tornar o loop observação -> ação -> observação automático.

- [x] bounds da maior VIEW_3D;
- [x] `viewport.describe`;
- [x] `viewport.capture` restrito à região 3D;
- [x] gravação PNG usando API nativa do Blender 5.2;
- [x] receipts JSON e SHA-256;
- [x] presets `FRONT`, `RIGHT`, `LEFT`, `TOP`, `BOTTOM`, `BACK`, `CAMERA` e `THREE_QUARTER`;
- [x] shading previsível;
- [x] CLI `viewport-capture-set` para frente/lateral/topo/3-4;
- [x] smoke test real das imagens geradas no Windows 10/Blender 5.2 LTS, confirmado pelo proprietário em 29/09/2026;
- [x] adaptador MCP stdio para entregar a captura como conteúdo de imagem ao modelo;
- [ ] smoke test da conexão MCP no ambiente local do proprietário;
- [ ] grade comparativa referência vs captura/render.

Critério de pronto: o agente recebe imagem atualizada após cada lote sem intervenção humana.

### Log de validação V0.2

- **29/09/2026 — primeiro smoke real:** bridge, descrição da viewport e preset 3/4 funcionaram; a captura foi solicitada, mas o PowerShell 5.1 corrompeu o caminho Unicode retornado pela CLI (`Área de Trabalho` -> representação inválida) e o teste reportou falsamente que o PNG não existia.
- **Correção:** JSON da CLI passou a ser ASCII-safe com escapes Unicode; scripts PowerShell foram restringidos a ASCII e receberam teste de regressão.
- **Segundo smoke real:** após a correção Unicode, `smoke-test.ps1 -OpenImage` foi confirmado como funcionando perfeitamente pelo proprietário; captura e receipt V0.2 estão validados na baseline Windows 10 + Blender 5.2 LTS.

### V0.2.1 — Contexto persistente e auto-history

Objetivo: impedir perda de contexto operacional em chats e produções longas.

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
- [x] smoke test real de múltiplos workspaces e recuperação histórica no Windows 10/Blender 5.2 LTS, confirmado após a correção assíncrona de redraw.

Documento dedicado: [BLENDER_AGENT_CONTEXT.md](./BLENDER_AGENT_CONTEXT.md).

### V0.3 — Sculpt assistido

Implementado e aguardando smoke test real:

- [x] ativação explícita de Sculpt Mode;
- [x] workspace Sculpting/Layout com restauração posterior;
- [x] brushes allowlisted;
- [x] stroke multiponto;
- [x] coordenadas normalizadas independentes da resolução;
- [x] radius/strength/pressure limitados;
- [x] modos NORMAL/INVERT/SMOOTH/ERASE com detecção da API disponível;
- [x] checkpoint automático antes do stroke;
- [x] captura "antes";
- [x] captura "depois" via iteração MCP após redraw;
- [x] auto-history de strokes e anexos;
- [x] MCP `blender_sculpt_iteration` devolvendo before/after;
- [x] smoke test destrutivo isolado em UV sphere temporária;
- [x] smoke test real no Windows 10 + Blender 5.2 LTS, confirmado em 02/10/2026 com stroke, checkpoint, before/after distintos, history e restauração de workspace.

Critério: corrigir a forma por strokes pequenos, produzir before/after diferentes, registrar checkpoint/history e restaurar o workspace. Documento: [BLENDER_AGENT_SCULPT.md](./BLENDER_AGENT_SCULPT.md).

### V0.4 — Recipes 3D de produto

Implementado e aguardando smoke test real:

- [x] schema JSON fechado e versionado;
- [x] metadata/id/version/tags;
- [x] parâmetros tipados com bounds/enum;
- [x] componentes declarativos;
- [x] steps ordenados com actions recipe-safe;
- [x] checkpoint antes de step;
- [x] captura depois de step;
- [x] validation views;
- [x] critérios simples de aceite;
- [x] variants e overrides sem mutar a recipe base;
- [x] hashes determinísticos de recipe/plano/receipt;
- [x] execução step-by-step pelo scheduler do Blender;
- [x] stage próprio e eventos `recipe.start/step/capture/finish/run`;
- [x] CLI validate/plan/run/status;
- [x] MCP validate/plan/run/status;
- [x] recipe de exemplo da baguete base;
- [x] smoke test isolado com cleanup;
- [ ] smoke test real no Windows 10 + Blender 5.2 LTS;
- [ ] seeds determinísticos para irregularidade procedural;
- [ ] biblioteca de materiais reutilizável por ID.

Critério atual: regenerar uma base de produto a partir de recipe + variant/overrides, produzir capturas/receipt e passar critérios declarados. Documento: [BLENDER_AGENT_RECIPES.md](./BLENDER_AGENT_RECIPES.md).

### V0.5 — Agente 3D iterativo

Planejado: planner de ações, percepção de render/viewport, comparação com fotos reais, limite de mudança por iteração, orçamento de iterações, rollback automático, relatório de diferenças e aprovação humana antes da promoção.

### V1.0 — Ferramenta operacional

Critérios: smoke tests Windows documentados, addon/painel instalável, protocolo estável, logs estruturados, recuperação de bridge, versionamento de recipes, integração completa com health, guia de agentes e regressão em Blender LTS.

## Roadmap específico da baguete

1. organizar referências aprovadas por ângulo;
2. definir escala real;
3. gerar base paramétrica do pão;
4. validar comprimento/largura/altura;
5. criar abertura e recheio;
6. ajustar crosta/miolo;
7. adicionar componentes do lanche;
8. renderizar frente/lateral/topo/3-4;
9. comparar com fotos reais;
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
- desvio dimensional contra produto real.

## Custo relativo

Processamento: **médio**, podendo chegar a **alto** em render/sculpt. Impacto Work: **baixo/médio**, dependente do número de iterações. Blender não adiciona licença paga. Checkpoints/renders podem crescer e devem permanecer em runtime até promoção. Não atribuir tokens/créditos oficiais quando a plataforma não os expõe.

## Decisões

### ADR-BLENDER-001 — eventos internos em vez de mouse global

Usar `bpy.types.Window.event_simulate` como primeira opção para gestos. Motivo: resolve clique/drag sem conceder automação do desktop inteiro. PyAutoGUI/AutoHotkey global ficam fora da V0.1 por superfície de risco e fragilidade de foco.

### ADR-BLENDER-002 — actions em vez de Python arbitrário

Protocolo allowlisted para manter auditabilidade, testes e menor risco.

### ADR-BLENDER-003 — runtime antes de ativos oficiais

Outputs automáticos ficam em `.runtime/blender-agent` para separar experimento de artefato aprovado.

### ADR-BLENDER-004 — MCP stdio como fronteira do agente

O bridge TCP continua privado em loopback e com protocolo estreito. Agentes se conectam por um servidor MCP stdio separado, que reaproveita a allowlist do bridge e pode devolver `Image` ao modelo. Isso evita abrir uma API HTTP pública do Blender e separa claramente controle local, transporte do agente e futura conexão por túnel privado.

## Pendências conhecidas

Acompanhar o item correspondente em `docs/ferramentas/PENDENCIAS.md` e o bloqueio de validação real em `docs/ferramentas/BLOQUEIOS.md`.
