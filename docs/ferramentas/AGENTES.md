# Agentes disponíveis

Os agentes são especialistas de decisão/execução. Eles não substituem ferramentas: devem selecionar as ferramentas deste catálogo para cumprir a tarefa dentro de sua autoridade. A configuração versionada vive em `.codex/agents/`; responsabilidades completas estão em `AGENTS.md` e `docs/governanca/AGENTES.md`.

| Agente | Capacidades | Processamento típico | Work | Limitações principais | Status | Score típico |
|---|---|---|---|---|---|---:|
| `AG-GESTAO` | priorização, coordenação, riscos, decisões, handoffs, síntese executiva | médio/alto | médio/alto | não programa; não autoaprova gasto/publicação | completo | 92 |
| `AG-DEV` | implementação, arquitetura técnica, testes, CI, deploy preparado, observabilidade | alto | alto | único agente que edita código; produção exige autorização | completo | 95 |
| `AG-DADOS` | contratos, eventos, analytics, qualidade, linhagem e privacidade | médio/alto | médio | especifica, mas não edita código | completo | 91 |
| `AG-MARKETING` | posicionamento, funil, campanhas, CRM, experimentos e métricas | médio | médio | não publica/gasta sem aprovação; depende de dados confiáveis | completo | 89 |
| `AG-MIDIAS` | roteiros, copies, calendário, biblioteca e produção de conteúdo | médio | médio | derivados precisam respeitar Marca/direitos; não programa | completo | 88 |
| `AG-COMPRAS` | pesquisa, comparação, TCO, fornecedores e requisitos eliminatórios | médio | médio | nunca compra; preço/disponibilidade exigem fonte atual | completo | 91 |
| `AG-OPERACOES` | fluxo físico, SOPs, capacidade, qualidade, treinamento e contingência | médio | médio | recomendações sanitárias/legais exigem validação competente | completo | 90 |
| `AG-FINANCAS` | CMV, margem, caixa, DRE, ERP, fiscal e conciliação | alto | médio/alto | não inventa parâmetros; decisões fiscais/financeiras críticas exigem validação | completo | 92 |
| `AG-MARCA` | identidade, embalagem, sinalização, ambiente, jornada e consistência | médio | médio | não sobrescreve originais; publicação requer aprovação | completo | 90 |

## Seleção

Escolha **um responsável** por tarefa e consulte outros agentes quando necessário. O score é apenas referência de adequação geral; para desenvolvimento de software, por exemplo, `AG-DEV` é requisito eliminatório mesmo que outro agente conheça o domínio.

O runtime escolhe esforço/modelo conforme complexidade e registra a justificativa quando a execução passa pela Central. O consumo real só deve ser reportado quando fornecido pelo runtime; esta documentação não atribui tokens, créditos ou unidades oficiais de Work por agente.

## Handoff obrigatório

Quando um agente de negócio identificar necessidade de software, ele registra requisito e critério de aceite e transfere a implementação para `AG-DEV`. Quando `AG-DEV` precisar de decisão de marca, finanças, dados, operação ou outra especialidade, consulta o agente correspondente em vez de assumir a decisão.

## Evidência

Configurações observadas em 2026-09-15: `compras`, `dados`, `development`, `financas`, `gestao`, `marca`, `marketing`, `midias` e `operacoes` em `.codex/agents/`.