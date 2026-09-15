# Status automático das ferramentas próprias

Este arquivo contém uma seção gerenciada por `tools/tool-health/cli.mjs`. Não edite manualmente o conteúdo entre os marcadores; o restante do arquivo pode receber notas humanas permanentes.

Para atualizar: `npm run tools:status`. Para executar sem escrever: `npm run tools:status:dry`. O relatório não instala dependências, não muda serviços externos e não transforma uma ferramenta exclusiva de outro sistema operacional em falha.

<!-- TOOL_HEALTH:START -->
_Aguardando a primeira execução de `npm run tools:status` nesta branch._
<!-- TOOL_HEALTH:END -->

## Interpretação

A coluna **Maturidade** vem do catálogo versionado e é decisão de engenharia. A coluna **Verificação** vem do último conjunto de checks gravado no bloco acima. `não testada nesta plataforma` não equivale a `falhando`; consulte CI multi-plataforma quando aplicável.