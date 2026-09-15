# Skills e capacidades nativas

Este documento registra capacidades nativas do ambiente de IA que podem ser usadas por agentes sem criar uma aplicação própria. Nomes, limites e disponibilidade podem evoluir; confirme a capacidade no ambiente antes de tratá-la como dependência crítica.

| Skill/capacidade | Capacidades | Processamento | Work | Limitações | Score típico |
|---|---|---|---|---|---:|
| Pesquisa web atual | pesquisar fontes recentes, comparar evidências, abrir páginas e PDFs públicos | médio | baixo/médio | depende da web, fontes e disponibilidade; conteúdo precisa de citação | 94 |
| Pesquisa local/comercial | localizar empresas, restaurantes, serviços e disponibilidade suportada | médio | baixo/médio | cobertura varia por região/provedor; dados mudam rapidamente | 88 |
| Pesquisa de produtos | descobrir/comparar produtos físicos e preços atuais | médio | baixo/médio | marketplace dinâmico; algumas categorias são restritas | 90 |
| Geração/edição de imagens | criar imagens e editar imagens fornecidas | alto | médio/alto | não substitui aprovação de Marca; fidelidade tipográfica/geométrica precisa revisão | 88 |
| Análise de imagens | interpretar fotos, layouts e referências visuais | médio | baixo/médio | não usar como medição física de precisão sem escala/evidência | 91 |
| PDF | criar, editar e inspecionar documentos PDF | médio | médio | PDFs complexos precisam validação visual; análise de PDF deve inspecionar páginas | 90 |
| Documentos DOCX | criar/editar documentos estruturados e entregáveis | médio | médio | estilo/compatibilidade precisam revisão no destino | 89 |
| Slides | criar/editar apresentações e decks | médio/alto | médio | qualidade visual precisa revisão; fontes/ativos externos podem limitar fidelidade | 88 |
| Planilhas | criar/editar/analisar XLSX/XLSM com ferramentas apropriadas | médio/alto | médio | macros e cálculo do Excel podem exigir Excel Desktop; preservar VBA é requisito especial | 93 |
| Análise com Python | cálculo, transformação de dados, gráficos e validação local | médio | baixo/médio | ambiente isolado e sem internet direta; não deve virar código de produção por acidente | 92 |
| Automações agendadas | lembretes, resumos recorrentes e verificações condicionais | baixo/médio | baixo/médio | frequência mínima/escopo dependem do produto; não substitui serviço operacional crítico | 87 |
| Work / computer use | tarefas longas com navegador/computador, múltiplas etapas, arquivos, apps e plugins | alto | alto/N/D | depende do plano, acesso e contexto; cota por tarefa não é exposta como unidade estável | 94 |
| Escrita/revisão | redigir, revisar, traduzir e adaptar conteúdo | baixo/médio | baixo | validação humana necessária para publicação, jurídico ou afirmações factuais sensíveis | 91 |

## Regra de uso

Use uma skill quando ela resolve a necessidade sem justificar manutenção de software próprio. Crie ferramenta própria quando houver repetição, necessidade de determinismo, CI, integração versionada, auditoria, execução offline/operacional ou contrato técnico estável.

Exemplos: uma pesquisa pontual de fornecedor deve usar pesquisa web; validar o snapshot financeiro a cada PR deve usar `tools/excel_snapshot`, pois precisa ser determinístico e auditável.

## Custo e cota

`Work` é estimado apenas de forma relativa. Onde a plataforma não fornece consumo oficial por operação, registre `N/D`; não converta a estimativa em tokens, créditos ou minutos. Processamento também é relativo e serve apenas para comparar abordagens.