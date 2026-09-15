# Status automático das ferramentas próprias

Este arquivo contém uma seção gerenciada por `tools/tool-health/cli.mjs`. Não edite manualmente o conteúdo entre os marcadores; o restante do arquivo pode receber notas humanas permanentes.

Para atualizar: `npm run tools:status`. Para executar sem escrever: `npm run tools:status:dry`. O relatório não instala dependências, não muda serviços externos e não transforma uma ferramenta exclusiva de outro sistema operacional em falha.

<!-- TOOL_HEALTH:START -->
**Plataforma da última execução gravada:** `linux`  
**Todas as ferramentas próprias estão completas e sem falha aplicável?** **NÃO**  
**Checks:** 9 passaram; 0 falharam; 0 bloqueados; 1 não aplicáveis à plataforma; 0 planejados.

| Ferramenta | Caminho | Maturidade | Verificação | Detalhe |
|---|---|---|---|---|
| `app-api` | `apps/api` | completa | verificada | teste aplicável passou |
| `app-gestao` | `apps/gestao` | completa | verificada | teste aplicável passou |
| `app-site` | `apps/site` | completa | verificada | teste aplicável passou |
| `app-qr` | `apps/qr_manipulator` | em desenvolvimento | verificada | teste aplicável passou |
| `agent-policy` | `tools/agent-policy` | completa | verificada | teste aplicável passou |
| `agent-runtime` | `tools/agent-runtime.mjs` | em desenvolvimento | verificada | teste aplicável passou |
| `excel-snapshot` | `tools/excel_snapshot` | completa | verificada | teste aplicável passou |
| `windows-supervisor` | `tools/windows-supervisor` | completa | não testada nesta plataforma | não testada nesta plataforma |
| `planejamento-legacy` | `planejamento` | completa/legada | verificada | teste aplicável passou |
| `tool-health` | `tools/tool-health` | em desenvolvimento | verificada | teste aplicável passou |

> Relatório sem timestamp de propósito: o commit Git registra quando o estado foi atualizado. Saída de processos não é copiada para este documento para evitar vazar dados ou tornar o arquivo não determinístico.
<!-- TOOL_HEALTH:END -->

## Interpretação

A coluna **Maturidade** vem do catálogo versionado e é decisão de engenharia. A coluna **Verificação** vem do último conjunto de checks gravado no bloco acima. `não testada nesta plataforma` não equivale a `falhando`; consulte CI multi-plataforma quando aplicável.
