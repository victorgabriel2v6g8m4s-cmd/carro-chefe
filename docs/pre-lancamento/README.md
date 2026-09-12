# Pré-lançamento — banner da avenida e carrochefe.com

## Objetivo

Documentar o plano de aquisição e mensuração para o banner físico do Carro Chefe, cujo QR Code aponta para `carrochefe.com`, antes da inauguração da operação.

A meta imediata é transformar curiosidade gerada na rua em uma base própria de interessados, sem antecipar pedido ou prometer uma data de abertura ainda não aprovada.

O diretório nasceu como handoff de Marketing e agora também registra a implementação executada pelo **AG-DEV** na branch `dev/pre-lancamento-site`.

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
- [`PSICOLOGIA_UI.md`](./PSICOLOGIA_UI.md): pesquisa comportamental e de UX convertida em requisitos de hero, formulário, recompensa, prova social, escassez, consentimento, mídia, acessibilidade, performance e experimentos A/B.
- [`ANALYTICS_PRIVACIDADE.md`](./ANALYTICS_PRIVACIDADE.md): eventos, KPIs, consentimento, LGPD, GA4/Clarity e relatórios.
- [`QR_ATRIBUICAO.md`](./QR_ATRIBUICAO.md): contrato de rastreamento, origem de campanha, variantes e evolução do redirector first-party.
- [`HANDOFF_DESENVOLVIMENTO.md`](./HANDOFF_DESENVOLVIMENTO.md): escopo objetivo entregue ao agente de desenvolvimento.
- [`IMPLEMENTACAO_DEV.md`](./IMPLEMENTACAO_DEV.md): arquitetura implementada, backend, frontend, persistência, consentimento, segurança, decisões, limites, testes, relatórios e plano de migração para VPS/`carrochefe.com`.

## Decisões já tomadas

1. A entrada vinda do banner deve priorizar **pré-inauguração**, não pedido.
2. A conversão principal será entrar na **Lista dos Primeiros**.
3. O cadastro deve ser enxuto: WhatsApp obrigatório; o primeiro nome é opcional e, preferencialmente, coletado por progressive disclosure após a confirmação para não elevar a fricção da conversão principal.
4. Antes do cadastro deve existir **uma única ação visual dominante**. Instagram, WhatsApp direto, história e conteúdo são secundários.
5. O formulário deve ser inline, mobile first, em uma coluna, com labels persistentes e validação não prematura.
6. A recompensa prometida deve ser verdadeira e garantida, preferencialmente um **cupom/benefício especial de inauguração**, cujo valor/formato final depende de validação de margem.
7. A confirmação do cadastro deve entregar recompensa perceptível imediata: status de entrada, progresso real da jornada e, quando houver ativo aprovado, um teaser real do produto/bastidor.
8. Foto/vídeo real do produto tem prioridade quando disponível e aprovado. Não representar imagem artificial como fotografia fiel do produto.
9. Prova social e escassez só podem aparecer quando forem reais, auditáveis e operacionalmente justificadas.
10. Consentimentos nunca usam checkbox pré-marcado, recusa escondida, linguagem de culpa ou dependência entre cadastro e analytics.
11. O QR deve carregar identificadores first-party já compatíveis com o contrato existente da branch `qr-app` (`cc_qr`, `cc_campaign`, `cc_variant`).
12. Analytics comportamental não deve receber nome, telefone ou outro dado pessoal identificável.
13. O cadastro precisa funcionar mesmo quando o visitante recusar analytics não essenciais.
14. Relatórios internos pertencem à Central Operacional, não ao site público.
15. Performance é requisito de conversão: animação, vídeo, fontes e analytics não podem atrasar o CTA/formulário.

## Restrições

- Não inventar data de inauguração.
- Não anunciar desconto, percentual ou brinde cujo custo ainda não esteja aprovado.
- Não usar falsa escassez, contadores falsos ou prova social inventada.
- Não pré-selecionar consentimento de marketing ou analytics.
- Não usar confirmshaming, recusa visualmente escondida ou passos artificiais para pressionar escolha.
- Não registrar PII em URLs, GA4, Clarity ou parâmetros de campanha.
- Não substituir o ERP como fonte de pedido, pagamento e receita.
- Não publicar política de privacidade fictícia; o texto jurídico precisa refletir a coleta real e ser revisado antes de ser tratado como definitivo.

## Priorização

A entrega foi dividida em três níveis:

- **P0 — hoje / antes do banner:** o mínimo seguro, rápido, compreensível e mensurável para receber tráfego.
- **P1 — próxima iteração:** melhora desejo visual, leitura de comportamento, prova social verdadeira, experimentação e operação da base.
- **P2 — arquitetura ideal:** fecha atribuição até pedido, margem e recompra.

O princípio é preservar velocidade sem criar uma dívida que impeça medir o primeiro grande canal offline da marca. Decisões de UI que afetem a conversão devem consultar `PSICOLOGIA_UI.md`; em caso de conflito, priorizar compreensão, fidelidade do produto, autonomia do usuário e performance sobre efeitos decorativos ou pressão de curto prazo.
