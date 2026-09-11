# Pré-lançamento — banner da avenida e carrochefe.com

## Objetivo

Documentar o plano de aquisição e mensuração para o banner físico do Carro Chefe, cujo QR Code aponta para `carrochefe.com`, antes da inauguração da operação.

A meta imediata é transformar curiosidade gerada na rua em uma base própria de interessados, sem antecipar pedido ou prometer uma data de abertura ainda não aprovada.

Este diretório contém somente planejamento. A implementação pertence ao **AG-DEV**.

## Resultado esperado

Funil-alvo:

```text
Banner físico
  → QR identificável
  → landing de pré-inauguração
  → cadastro consentido
  → Lista dos Primeiros
  → benefício de inauguração
  → pedido pago no ERP
  → margem atribuída
  → recompra
```

## Documentos

- [`PLANO_ACAO.md`](./PLANO_ACAO.md): prioridades, experiência proposta, fases de entrega e critérios de aceite.
- [`ANALYTICS_PRIVACIDADE.md`](./ANALYTICS_PRIVACIDADE.md): eventos, KPIs, consentimento, LGPD, GA4/Clarity e relatórios.
- [`QR_ATRIBUICAO.md`](./QR_ATRIBUICAO.md): contrato de rastreamento, origem de campanha, variantes e evolução do redirector first-party.
- [`HANDOFF_DESENVOLVIMENTO.md`](./HANDOFF_DESENVOLVIMENTO.md): escopo objetivo para o agente que programará a entrega.

## Decisões já tomadas

1. A entrada vinda do banner deve priorizar **pré-inauguração**, não pedido.
2. A conversão principal será entrar na **Lista dos Primeiros**.
3. O cadastro deve ser enxuto: WhatsApp obrigatório e primeiro nome opcional.
4. A recompensa prometida deve ser verdadeira e garantida, preferencialmente um **cupom especial de inauguração**, cujo valor/formato final depende de validação de margem.
5. O QR deve carregar identificadores first-party já compatíveis com o contrato existente da branch `qr-app` (`cc_qr`, `cc_campaign`, `cc_variant`).
6. Analytics comportamental não deve receber nome, telefone ou outro dado pessoal identificável.
7. O cadastro precisa funcionar mesmo quando o visitante recusar analytics não essenciais.
8. Relatórios internos pertencem à Central Operacional, não ao site público.

## Restrições

- Não inventar data de inauguração.
- Não anunciar desconto, percentual ou brinde cujo custo ainda não esteja aprovado.
- Não usar falsa escassez, contadores falsos ou prova social inventada.
- Não registrar PII em URLs, GA4, Clarity ou parâmetros de campanha.
- Não substituir o ERP como fonte de pedido, pagamento e receita.
- Não publicar política de privacidade fictícia; o texto jurídico precisa refletir a coleta real e ser revisado antes de ser tratado como definitivo.

## Priorização

A entrega foi dividida em três níveis:

- **P0 — hoje / antes do banner:** o mínimo seguro e mensurável para receber tráfego.
- **P1 — próxima iteração:** melhora a qualidade da leitura de comportamento e operação da base.
- **P2 — arquitetura ideal:** fecha atribuição até pedido, margem e recompra.

O princípio é preservar velocidade sem criar uma dívida que impeça medir o primeiro grande canal offline da marca.
