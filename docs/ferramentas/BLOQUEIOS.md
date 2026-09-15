# Registro de bloqueios de ferramentas

Este arquivo registra impedimentos que um agente não consegue resolver legitimamente dentro do nível de acesso, recursos, ambiente ou autoridade disponíveis. Registrar um bloqueio não autoriza contorná-lo.

## Como registrar

Inclua: ID, data, tarefa/contexto, ferramenta/capacidade, tipo (`acesso`, `permissão`, `quota`, `plataforma`, `dependência`, `credencial`, `recurso`, `autoridade`, `externo`), impacto, evidência segura, workaround permitido, ação necessária, owner e status.

Estados: `aberto`, `mitigado`, `resolvido`, `aceito`.

## Bloqueios/limitações estruturais atuais

### BLOCK-TOOL-001 — Cota exata do modo Work não mensurável por ferramenta

- **Data:** 2026-09-15
- **Tipo:** quota/telemetria
- **Status:** aceito
- **Impacto:** não é possível publicar um valor oficial de créditos/tokens/minutos por ferramenta com a informação disponível.
- **Tratamento:** o catálogo usa impacto relativo (`baixo/médio/alto`) e `N/D`; consumo real só é registrado quando o runtime/produto fornece dado oficial.
- **Owner:** `AG-GESTAO` / plataforma.

### BLOCK-TOOL-002 — Supervisor Windows não pode ser verificado em host não-Windows

- **Data:** 2026-09-15
- **Tipo:** plataforma
- **Status:** mitigado
- **Impacto:** uma execução Linux/macOS do health check não prova compilação/integração Windows.
- **Tratamento:** marcar `não testada nesta plataforma`; `.github/workflows/ci.yml` possui job `Windows Supervisor` em `windows-latest`.
- **Owner:** `AG-DEV`.

### BLOCK-TOOL-003 — Plugins dependem da conta e autorização do usuário

- **Data:** 2026-09-15
- **Tipo:** acesso/permissão
- **Status:** aceito
- **Impacto:** o repositório não consegue garantir que um plugin instalado/conectado numa conta estará disponível em outro agente, sessão ou usuário.
- **Tratamento:** confirmar estado antes do uso, não armazenar credenciais e registrar ausência impeditiva aqui.
- **Owner:** `AG-GESTAO` + usuário autorizado.

### BLOCK-TOOL-004 — Dependências Python do snapshot não são instaladas implicitamente

- **Data:** 2026-09-15
- **Tipo:** dependência
- **Status:** mitigado
- **Impacto:** `excel-snapshot` pode falhar localmente se o ambiente Python isolado não tiver `requirements.txt` instalado.
- **Tratamento:** `tool-health` não instala pacotes nem altera máquina por conta própria; o CI prepara venv isolado conforme `.github/workflows/ci.yml`.
- **Owner:** `AG-DEV`.

## Regra obrigatória

Quando um agente encontrar qualquer bloqueio de acesso, recurso, permissão, quota, credencial, ambiente, fornecedor ou autoridade que impeça a tarefa, deve atualizar este registro (ou o registro transacional equivalente quando existir) antes de encerrar a entrega. Não ocultar falha com estimativa inventada, credencial ampla, bypass de segurança ou mudança de escopo silenciosa.