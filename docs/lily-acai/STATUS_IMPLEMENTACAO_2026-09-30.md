# CookLily — auditoria de implementação e reconciliação de pendências

**Revisão:** 30/09/2026 16:50 UTC-03:00  
**Branch auditada:** `cooklily/canonical`  
**Head observado antes desta revisão documental:** `24bef1616cd2d60208c6044b4a3b7ee747cc928c`  
**Fonte de verdade:** código, migrations, testes, documentação integrada e histórico da branch.

## Critérios

- **Decidido:** existe decisão fechada e autoria preservada.
- **Implementado:** código/migration/testes existem.
- **Validado tecnicamente:** CI/CodeQL registrados como verdes.
- **Integrado:** está na `cooklily/canonical`.
- **Homologado:** testado com conta, credencial, aparelho, serviço ou operação real aplicável.
- **Pronto comercialmente:** deploy + homologação + dados operacionais reais aprovados.

Esses estados não são equivalentes.

## Resultado executivo

A maior parte da plataforma CookLily já está **implementada, validada tecnicamente e integrada**, incluindo catálogo, carrinho/pedido, tracking guest, operação de cozinha, entregadores, reatribuição, ETA, WhatsApp, Pix próprio, conciliação Pix, SLA, impressão, torre de controle, analytics, observabilidade/backup, acessibilidade/performance e domínio de alergênicos.

Ainda não deve ser tratada como completamente pronta comercialmente porque permanecem dependências de deploy/homologação real, dados operacionais, credenciais externas e duas novas decisões de UX/pagamento.

## Estado por frente

| Frente | Estado auditado | O que está resolvido | O que ainda falta |
|---|---|---|---|
| Marca / Entrega 03 | implementada | CookLily, kit/tokens e rebranding | QA visual final quando aplicável |
| Landing / Entrega 04 | implementada/publicada historicamente | captação, consentimento, tracking compatível, WhatsApp P0 | revalidar junto ao deploy canônico atual |
| Catálogo / Entrega 05 | implementada | categorias, LilyMix, adicionais, preços, ofertas, combos, busca, filtros, mídia, esgotado, admin | homologação final da canonical em aparelhos reais |
| Carrinho/pedido / Entrega 06 | implementada | guest, telefone, endereço, entrega/retirada, recotação server-side, idempotência | valores operacionais reais e homologação |
| Pagamentos / Entrega 07 + 11A/11I | parcial frente à decisão atual | crédito Mercado Pago, Pix próprio BR Code, ledger e conciliação automática | **débito Mercado Pago + coexistência Pix próprio/cartões + homologação bancária/MP** |
| Torre de pedidos / Entrega 08 | integrada | visão financeira/produção/logística, filtros e alertas | QA/deploy real |
| Analytics / Entrega 09 | integrada | first-party consentido, funil, atribuição e dashboard | retenção jurídica + QA real |
| Observabilidade/backup / 10A | integrada | request ID, redaction, backup verificado, runbook | drill real, cópia externa e política de retenção |
| Acessibilidade/performance / 10B | integrada | foco, teclado estrutural, reduced-motion e budget | QA real com leitor de tela/contraste/CWV |
| Cozinha / 11B + 11J + 11K | integrada | fila, transições, SLA/alerta, comanda e impressão | SLA real, QA tablet e impressora |
| Cliente / 11C + 11F + 11G + 11H | integrada | timeline, guest token, ETA, WhatsApp e código de entrega | chaves/serviços reais e QA mobile |
| Entregador / 11D/11E | integrada | MFA, fila, aceite, códigos, recusa, desistência, reatribuição e histórico | QA multiusuário real |
| Pix próprio / 11A/11I | integrada tecnicamente | BR Code, txid, ledger, API Pix v2 adapter, matching e worker | conta/instituição real, OAuth/mTLS/certificado, smoke e tarifas |
| Alergênicos / Entrega 12 | integrada tecnicamente | taxonomia, agregação, admin, snapshot e exposição | dados reais, contato cruzado, **sanfona do ADR-002**, QA/impressão |
| Deploy | hotfix integrado na branch | correção do lock herdado no reexec no head `24bef...` | executar novo deploy e comprovar health/backup/migrations/rollback |

## Decisões do ADR-001

O PDF/ADR-001 possui **100 perguntas respondidas e fechamento geral em 24/09/2026**. Portanto, não há “pergunta de decisão” aberta dentro desse ADR.

Alguns itens são deliberadamente futuros/homologação, por exemplo:

- linha Fitness;
- Produto Herói permanente;
- referências provisórias de custos;
- receita inicial do Creme de Ninho sujeita a homologação;
- alergênicos como domínio separado — este item já avançou tecnicamente na Entrega 12.

“Futuro” no ADR não significa decisão esquecida; significa escopo conscientemente adiado.

## Divergências encontradas e tratadas

### Alergênicos

A Entrega 12 foi integrada, mas o frontend atual mostra o conteúdo do aviso diretamente. A nova decisão `DEC-CL-101` exige sanfona fechada por padrão. Estado: **decidido, ainda não implementado**.

### Pagamentos

A plataforma possui Pix próprio e Mercado Pago, mas o modelo atual seleciona um único provider por vez e o Card Brick exclui débito. A nova decisão `DEC-CL-102` exige **Pix próprio + crédito/débito Mercado Pago simultaneamente disponíveis para escolha**. Estado: **parcial, requer refatoração**.

## Próxima ordem recomendada de execução

1. implementar `DEC-CL-101` no frontend e testes de acessibilidade;
2. refatorar roteamento de pagamentos para `DEC-CL-102`, incluindo débito;
3. executar gates CI/CodeQL;
4. fazer deploy do head canônico com o hotfix do deployer;
5. cadastrar/revisar alergênicos reais e contato cruzado;
6. configurar conta/credenciais Pix/Mercado Pago e homologar transações;
7. executar QA ponta a ponta em mobile/tablet/desktop e impressão;
8. fechar apenas as pendências que tiverem evidência real correspondente.
