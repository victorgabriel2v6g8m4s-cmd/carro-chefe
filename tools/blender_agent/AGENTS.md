# AGENTS.md — Blender Agent

Estas regras complementam o `AGENTS.md` da raiz para qualquer trabalho em `tools/blender_agent/` ou qualquer tarefa que use esta ferramenta.

## Leitura obrigatória

Antes de controlar ou alterar uma cena Blender, leia:

1. `docs/governanca/BLENDER_AGENT_AGENT_GUIDE.md` — manual operacional obrigatório;
2. `tools/blender_agent/README.md` — comandos e capacidades;
3. o documento técnico da camada usada (`BLENDER_AGENT_CONTEXT.md`, `BLENDER_AGENT_SCULPT.md`, `BLENDER_AGENT_RECIPES.md`, `BLENDER_AGENT_ITERATIVE.md`, `BLENDER_AGENT_IMAGES.md` ou `BLENDER_AGENT_MESH_REFERENCE_COMPARE_USAGE.md`).

## Regras de operação

- prefira recipe/action semântica a UI simulada;
- para imagem de referência ou Base Color por imagem, use `reference.image.add` / `material.image_texture`; não use file browser por UI como primeira opção;
- para comparação visual entre malha e foto, use `compare_cli`/`mesh.comparison_snapshot`; a composição de pixels deve permanecer fora do processo Blender e a action de snapshot deve ser read-only;
- comparação mesh × referência é auxílio visual de edição, não medição metrológica nem aprovação automática do produto;
- imagens lidas pelo agente devem ficar no repositório/runtime ou numa raiz explicitamente autorizada por `CC_BLENDER_ASSET_ROOT`;
- `material.image_texture` não substitui UV unwrap: confirme `has_uv`/`uv_layers` antes de aprovar uma textura;
- use UI somente dentro do Blender e apenas quando não houver action adequada;
- identifique `target_objects` antes de mutar;
- observe antes de propor uma alteração iterativa;
- uma proposal deve representar uma única intenção;
- use checkpoint/snapshot antes de mutação arriscada;
- valide before/after por métricas e captures focados;
- faça rollback quando o efeito for pior, ambíguo ou fora dos critérios;
- finalize com receipt/history, não apenas com uma resposta no chat;
- nunca use `eval`, `exec`, shell ou Python arbitrário como atalho;
- nunca exponha o bridge além de `127.0.0.1`;
- nunca declare MCP conectado sem teste real do cliente local;
- não apague câmera, luz ou outros objetos do usuário apenas para limpar screenshots;
- não aumente silenciosamente budgets/limites para forçar uma conclusão.

## Ordem padrão

```text
status
  -> history/context
  -> referências visuais, quando aplicável
  -> recipe/base reproduzível
  -> observe
  -> propose
  -> approval (quando exigida)
  -> apply
  -> compare
  -> evaluate
  -> keep/continue/rollback/finish
  -> receipt/history
```

Se qualquer etapa estiver incerta, pare de mutar a cena e colete contexto/evidência primeiro.
