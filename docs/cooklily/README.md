# CookLily — documentação canônica

Este é o ponto de entrada documental da **CookLily**.

## Compatibilidade de caminhos

O nome público definitivo é **CookLily**, porém o caminho histórico `docs/lily-acai/` é preservado por compatibilidade com links, branches, automações e registros anteriores. Ele continua sendo o repositório físico dos documentos CookLily até uma migração de caminhos ser aprovada e executada de forma transacional.

Não criar uma segunda cópia dos mesmos documentos em `docs/cooklily/`. Este diretório funciona como **índice de navegação e fronteira de escopo**.

## Fontes canônicas

- [README operacional CookLily](../lily-acai/README.md)
- [Cardápio inicial definitivo](../lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md)
- [ADR-001 — cardápio inicial](../lily-acai/decisoes/ADR_001_CARDAPIO_INICIAL_COOKLILY.md)
- [ADR-002 — alergênicos e pagamentos](../lily-acai/decisoes/ADR_002_UX_ALERGENICOS_PAGAMENTOS_2026-09-30.md)
- [Decisões e pendências](../lily-acai/DECISOES_PENDENCIAS.md)
- [Status de implementação — 30/09/2026](../lily-acai/STATUS_IMPLEMENTACAO_2026-09-30.md)
- [Roadmap CookLily](../lily-acai/ROADMAP_COOKLILY.md)
- [Especificação detalhada — Reels, Dashboard e fidelidade (09/10/2026)](../lily-acai/UX_REELS_DASHBOARD_FIDELIDADE_2026-10-09.md) — requisitos, regras, roadmap, critérios de aceite e pendências; documento de planejamento, não evidência de implementação.
- [Homologação do QR Pix — 08/10/2026](../lily-acai/entregas/HOMOLOGACAO_QR_PIX_2026-10-08.md) — QR lido e valor conferido; liquidação e transição do pedido ainda pendentes.
- [Pagamentos](../lily-acai/PAGAMENTOS_GATEWAY_2026-09-27.md)
- [Pix próprio e operação](../lily-acai/PIX_OPERACAO_PEDIDOS_ROADMAP_2026-09-27.md)
- [Entrega 12 — alergênicos](../lily-acai/entregas/ENTREGA_12_ALERGENICOS_2026-09-30.md)

## Regra de separação

- decisão de produto, preço, receita, catálogo, checkout ou operação da CookLily fica no namespace CookLily;
- decisão do Carro Chefe fica no [índice Carro Chefe](../carro-chefe/README.md);
- infraestrutura compartilhada deve indicar explicitamente quais marcas atende;
- uma decisão compartilhada precisa dizer que é compartilhada; não deve ser inferida apenas porque as duas operações usam o mesmo repositório.
