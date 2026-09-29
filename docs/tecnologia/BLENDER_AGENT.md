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

## Estado atual — V0.1

Implementado: protocolo local, sessão/token, CLI, inventário de cena, seleção/criação/transformação/duplicação/exclusão, mesh explícito, modifiers allowlisted, material Principled simples, câmera orbital, render PNG, checkpoint `.blend`, GLB/OBJ, `ui.window`, clique, drag, wheel, evento UI allowlisted, launcher PowerShell para Windows 10, testes unitários sem Blender e integração prevista no Tool Health.

Maturidade: **em desenvolvimento**.

## Roadmap

### V0.1 — Ponte controlável

- [x] bridge localhost e autenticação de sessão;
- [x] actions semânticas;
- [x] eventos estilo mouse confinados ao Blender;
- [x] checkpoint, render e export;
- [x] testes sem Blender;
- [ ] smoke test no Blender real do Windows 10 do proprietário;
- [ ] confirmar versão mínima suportada na máquina real.

### V0.2 — Feedback visual automático

Objetivo: tornar o loop observação -> ação -> observação automático. Planejado: captura da área 3D, `viewport.capture`, bounds da viewport, presets frente/topo/lateral/3-4, grade referência vs render e receipts JSON de iteração. Critério de pronto: o agente recebe imagem atualizada após cada lote sem intervenção humana.

### V0.3 — Sculpt assistido

Planejado: ativação explícita de Sculpt, brush allowlisted, stroke multiponto, radius/strength, máscara/smooth, checkpoint antes de strokes destrutivos e validação de contexto. Critério: corrigir a forma do pão por strokes pequenos e retornar imagem pós-stroke.

### V0.4 — Receitas 3D de produto

Planejado: recipe JSON declarativa, componentes de pão/carne/queijo/vinagrete/molhos/espetos, dimensões, seeds determinísticos para irregularidade, biblioteca de materiais e geração de variantes. Critério: regenerar produto a partir de recipe + referências.

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

## Pendências conhecidas

Acompanhar o item correspondente em `docs/ferramentas/PENDENCIAS.md` e o bloqueio de validação real em `docs/ferramentas/BLOQUEIOS.md`.
