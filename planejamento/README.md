# Central Operacional

Painel local e API para visualizar o plano, registrar propostas, aprovar alterações e anexar evidências sem editar arquivos JSON manualmente.

## Iniciar

Requer Node.js 20 ou superior.

```powershell
cd planejamento
npm start
```

Abra `http://127.0.0.1:4173`.

Na primeira execução, o sistema copia `data/plan.seed.json` para `.runtime/plan.json`. O diretório `.runtime/` é local e não entra no Git. Para reiniciar o ambiente de demonstração, pare o servidor e remova apenas `planejamento/.runtime/` depois de fazer backup do que deseja guardar.

## Fluxo de alteração

1. Pessoa ou agente consulta `GET /api/plan`.
2. Envia uma proposta para `POST /api/requests`.
3. A Gestão revisa no painel ou consulta `GET /api/requests`.
4. Aprova com `POST /api/requests/{id}/approve` ou rejeita com `POST /api/requests/{id}/reject`.
5. A aprovação aplica a mudança, aumenta a versão do plano e grava auditoria.

Não há exclusão definitiva. Para preservar histórico, uma tarefa deve ser atualizada para `cancelled` com justificativa.

## Exemplos para agentes

### Consultar plano

```powershell
Invoke-RestMethod http://127.0.0.1:4173/api/plan
```

### Propor uma tarefa

```powershell
$body = @{
  actor = "AG-COMPRAS"
  action = "create_task"
  reason = "Criar cotação comparável do equipamento crítico"
  payload = @{
    title = "Comparar três opções de refrigerador"
    pillar = "compras"
    phase = "G3"
    owner = "AG-COMPRAS"
    impact = 5
    urgency = 4
    acceptance = "Três opções aprovadas nos requisitos, com custo total, avaliações, garantia, frete e prazo"
    dependencies = @("TASK-OPS-004")
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4173/api/requests -ContentType "application/json" -Body $body
```

### Propor atualização de tarefa

```powershell
$body = @{
  actor = "AG-DEV"
  action = "update_task"
  reason = "Critério validado em desktop e celular"
  payload = @{
    id = "TASK-DEV-001"
    patch = @{
      status = "review"
      evidence = @("docs/relatorio-validacao-site.md")
    }
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4173/api/requests -ContentType "application/json" -Body $body
```

### Enviar evidência

```powershell
$file = "C:\caminho\cotacao.pdf"
$bytes = [System.IO.File]::ReadAllBytes($file)
$name = [Uri]::EscapeDataString([System.IO.Path]::GetFileName($file))
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4173/api/uploads?filename=$name&actor=AG-COMPRAS" -ContentType "application/pdf" -Body $bytes
```

O upload aceita PDF, PNG, JPEG, WebP, CSV, texto, Markdown, JSON, planilhas e documentos comuns. O limite padrão é 15 MB. Arquivos ficam em `.runtime/uploads/` e recebem metadados e hash SHA-256.

## Ações aceitas

| Ação | Payload mínimo |
|---|---|
| `create_task` | título, pilar, fase, responsável, impacto, urgência, aceite |
| `update_task` | `id` + `patch` |
| `create_decision` | pergunta, responsável, prazo |
| `update_decision` | `id` + `patch` |
| `create_risk` | título, responsável, probabilidade, impacto, mitigação |
| `update_risk` | `id` + `patch` |
| `create_procurement_item` | item, categoria, responsável, requisitos |
| `update_procurement_item` | `id` + `patch` |
| `update_milestone` | `id` + `patch` |
| `create_note` | título, conteúdo, responsável |

## Segurança e produção

Esta versão é intencionalmente local: escuta apenas `127.0.0.1` e não possui contas. Antes de expor em rede ou internet, adicionar autenticação, autorização por função, HTTPS, banco/armazenamento durável, varredura de malware, rate limiting, backups, política de retenção e observabilidade. Não faça upload de segredos nem de dados pessoais desnecessários.

