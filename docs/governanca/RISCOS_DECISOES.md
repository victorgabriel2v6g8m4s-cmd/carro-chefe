# Riscos e decisões

## Decisões críticas abertas

| ID | Decisão | Por que bloqueia | Recomendação inicial |
|---|---|---|---|
| `DEC-002` | ERP e adquirente | catálogo, totem, dados e integração | prova de conceito com Chefão antes de contratar |
| `DEC-003` | regras do Chefão | cadastro, custo e produção | definir repetição de espetos e quantidades |
| `DEC-004` | escopo do embed em `/cardapio` | segurança/UX | exigir confirmação técnica; manter redirect como fallback |
| `DEC-006` | data e orçamento de abertura | priorização e contratação | decidir após G1 e orçamento preliminar |
| `DEC-007` | marca Catupiry/Seara no texto | compra e comunicação | usar marca só quando o item real e o acordo permitirem |

## Decisões aprovadas

| ID | Data | Decisão | Evidência e consequência |
|---|---|---|---|
| `DEC-001` | 13/08/2026 | **Carro Chefe** é a marca; **Carro‑Chefe** é a família/produto; “Paulistinha” fica apenas como alias legado interno | aprovação do proprietário na pergunta da execução `cmsroii6800qgv4tpkffdqygr`; na futura derivação da capa, usar `LANCHES • ESPETINHO • BEBIDAS`; site e anúncios não usam “Paulistinha” |
| `DEC-005` | 17/09/2026 | Fotos, medidas, levantamento de infraestrutura e validações presenciais do ponto **já existem**, mas permanecem deliberadamente fora do repositório | aprovação direta do proprietário; esses dados não devem ser tratados como inexistentes nem inferidos. Agente que precisar de valor/foto/detalhe específico deve solicitar diretamente ao proprietário; se não puder obter na execução, registrar `INFO-PEND-*` neste documento |
| `DEC-008` | 17/09/2026 | Cardápio físico inicial enxuto, personalização destacada por QR, QR digital individual por mesa, rastreamento de origem e totem sem login obrigatório | aprovação direta do proprietário; planejamento e critérios de execução em [`../tecnologia/ATRIBUICAO_OMNICANAL.md`](../tecnologia/ATRIBUICAO_OMNICANAL.md) e experiência comercial em [`../negocio/PRODUTO_CARDAPIO.md`](../negocio/PRODUTO_CARDAPIO.md) |
| `DEC-009` | 17/09/2026 | Endereço operacional informado para a unidade inicial: **Rua Vicente Solari, 531 — CEP 79006-440** | aprovação direta do proprietário; passa a ser o endereço canônico para planejamento físico, levantamentos, licenças, logística e documentação. Cidade/UF não são acrescentados por inferência neste registro |
| `DEC-010` | 17/09/2026 | Autorização permanente para fazer merge de registros de decisões já finalizados | aprovação direta do proprietário; PRs exclusivamente documentais destinados a registrar decisões já aprovadas/finalizadas podem ser mergeados por squash sem nova confirmação, desde que cumpram branch protection, checks obrigatórios, revisão de escopo e não contenham código, deploy, compra, publicação externa ou mudança operacional não aprovada |
| `DEC-011` | 17/09/2026 | Adotar a estratégia **Escada do Chefe** para arquitetura de preço, apresentação e upsell | aprovação direta do proprietário; Simples funciona como porta de entrada econômica, Brasa Dourada como ponte de sabor e Chefão como experiência completa. Preços finais continuam pendentes de CMV/margem; relações de simulação e regras visuais estão em [`../negocio/PRODUTO_CARDAPIO.md`](../negocio/PRODUTO_CARDAPIO.md) |
| `DEC-012` | 17/09/2026 | Substituir **Carro‑Chefe com Cheddar** pelo conceito intermediário depois chamado **Brasa Dourada** | histórico preservado em `PROD-CCC-001`; a nomenclatura e composição foram refinadas em `DEC-013` |
| `DEC-013` | 17/09/2026 | Revisar receitas e ritual de montagem: nome intermediário passa a ser **Brasa Dourada**; recebe queijo de cobertura maçaricado; alface sai dos lanches; pão usa caldo do vinagrete no lugar da maionese-base; montagem ocorre na hora diante do cliente; molhos à vontade e pimentas de balcão são categorias separadas | aprovação direta do proprietário; método de preparo, lista de molhos e critérios operacionais estão em [`../negocio/PRODUTO_CARDAPIO.md`](../negocio/PRODUTO_CARDAPIO.md) e [`../operacao/OPERACAO.md`](../operacao/OPERACAO.md). Não foram inventadas gramaturas, temperaturas ou tipo de queijo ainda não aprovados |

## Fontes deliberadamente externas ao repositório

Nem toda evidência operacional precisa ser versionada no Git. Quando o proprietário decidir manter uma fonte fora do repositório, sua **existência e regra de acesso** devem ser documentadas sem copiar o conteúdo.

| ID | Fonte | Estado | Guardião | Regra de acesso |
|---|---|---|---|---|
| `EXT-001` | fotos do local, medidas registradas, levantamento de infraestrutura e validações presenciais da unidade inicial | existente; não versionada por decisão do proprietário | proprietário | pedir apenas o dado necessário para a tarefa; não inferir valor ausente, não declarar que o levantamento não existe e não exigir upload ao Git |

### Pendências de informação externa — `INFO-PEND-*`

Use esta seção quando uma tarefa depender de informação que **existe fora do repositório** mas não estiver disponível no contexto atual e não puder ser obtida imediatamente com o proprietário.

Cada registro deve conter:

- ID `INFO-PEND-###`;
- data;
- tarefa/agente solicitante;
- fonte externa relacionada (`EXT-*`, quando aplicável);
- dado exato necessário, sem pedir “tudo” por padrão;
- motivo e decisão/entrega bloqueada;
- owner/responsável pela resposta;
- status: `aguardando`, `respondida`, `cancelada`;
- referência da resposta/evidência quando resolvida, sem copiar conteúdo sensível desnecessário.

Formato:

| ID | Data | Tarefa/agente | Fonte | Dado necessário | Impacto | Owner | Status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | **sem pendência aberta neste momento** | — | — | — |

Regras:

- primeiro, perguntar diretamente ao proprietário quando houver interação disponível;
- se a resposta não estiver disponível, registrar `INFO-PEND-*` em vez de inventar, estimar ou declarar que o dado inexiste;
- solicitar o mínimo necessário para a tarefa;
- fotos, plantas, medições detalhadas ou outros materiais do ponto não devem ser adicionados ao repositório sem nova decisão explícita do proprietário;
- uma pendência resolvida permanece no histórico com status `respondida` para preservar rastreabilidade.

## Riscos prioritários

| ID | Risco | Prob. | Impacto | Mitigação |
|---|---|---:|---:|---|
| `RISK-001` | ponto/quiosque não atender licença ou requisito técnico apesar dos levantamentos existentes | 3 | 5 | usar os dados presenciais existentes e validar exigências com profissionais/órgãos antes de obra/compra irreversível |
| `RISK-002` | ERP não suportar modificadores/estoque do Chefão | 4 | 5 | prova de conceito transacional e cláusula contratual |
| `RISK-003` | pico de mídia superar capacidade da parrilla | 4 | 5 | ensaio, limite de canal e regra de pausa |
| `RISK-004` | preço sem ficha técnica destruir margem | 4 | 5 | custo por receita e aprovação de Finanças; faixas da Escada do Chefe são relações de simulação, não preços finais |
| `RISK-005` | fumaça, calor, chuva ou vento comprometer segurança | 3 | 5 | projeto físico e protocolo climático profissional |
| `RISK-006` | embed do ERP bloqueado/inseguro | 3 | 4 | homologar cabeçalhos, sessão e fallback de redirect |
| `RISK-007` | dados incompletos impedirem conciliação e marketing | 4 | 4 | contrato de eventos, teste e auditoria diária |
| `RISK-008` | inconsistência de marca e grafia | 4 | 3 | glossário, aprovação e manual de marca; novas peças usam **Brasa Dourada** e não os nomes intermediários anteriores |
| `RISK-009` | QR code impresso falhar ou ficar obsoleto | 3 | 3 | URL própria/redirecionável e teste físico |
| `RISK-010` | fornecedor único causar ruptura | 3 | 4 | alternativa homologada e estoque de segurança calculado |
| `RISK-011` | coleta indevida de dados pessoais | 3 | 5 | minimização, consentimento, acesso e revisão LGPD |
| `RISK-012` | venda de álcool fora das regras aplicáveis | 2 | 5 | validação legal, treinamento e controle de idade |
| `RISK-013` | arquitetura de preço aumentar ticket aparente, mas reduzir margem ou criar canibalização indesejada entre os lanches | 3 | 4 | validar CMV antes de publicar, acompanhar mix/margem/attach rate e recalibrar um componente por teste |
| `RISK-014` | política de molhos à vontade gerar custo/desperdício ou gargalo maior que o valor percebido | 4 | 4 | fichas técnicas por molho, medição de consumo por pedido, recipientes adequados, reposição por lote e ensaio de pico antes de recalibrar a política |
| `RISK-015` | uso do maçarico gerar incidente, inconsistência ou atraso no Brasa Dourada | 3 | 5 | estação dedicada, procedimento homologado, treinamento, contingência sem improviso e teste de tempo/capacidade antes da abertura |
| `RISK-016` | uso do caldo do vinagrete encharcar o pão ou deslocar custo/perda para o vinagrete | 3 | 4 | definir volume por pão, utensílio, critério visual, rendimento do vinagrete e medir economia líquida antes de atualizar CMV |
| `RISK-017` | documentação canônica divergir de código/site/snapshots financeiros legados | 4 | 3 | tratar `PRODUTO_CARDAPIO.md` como fonte canônica da decisão e sincronizar código, ERP e planilha em mudanças de implementação específicas antes da abertura |

Probabilidade e impacto são estimativas iniciais de planejamento, não dados observados.

## Processo de decisão

Uma decisão registra: contexto, opções, custos, riscos, evidências, recomendação, responsável, prazo, decisão final e consequências. Decisão vencida volta à pauta diária; não deve ser resolvida silenciosamente por um agente.

Quando a decisão já tiver sido aprovada pelo proprietário e o trabalho restante for exclusivamente seu registro documental, aplica-se `DEC-010`: o PR pode ser integrado sem pedir uma nova autorização de merge, desde que permaneça estritamente dentro desse escopo e satisfaça as proteções da `main`.

## Processo de risco

Cada risco tem proprietário, gatilho observável, mitigação preventiva e contingência. Se ocorrer, vira incidente/tarefa e preserva a relação com o risco original.