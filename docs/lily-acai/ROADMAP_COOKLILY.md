# Roadmap oficial — CookLily

**Nome público definitivo:** CookLily  
**Wordmark oficial:** cookLily  
**Linha de gelato:** LilyShake / LilyShakes  
**Branch exclusiva:** lily-acai  
**Namespaces técnicos preservados:** /lilyacai/, /api/v1/lily/, lily-acai.db.

## Entrega 03 — marca e rebranding

- logo e acervo inicial catalogados;
- nome CookLily definitivo;
- tokens de cor aprovados;
- tema web centralizado;
- frontend migrado;
- aliases de tracking documentados/testados;
- QA visual manual ainda separado.

## Entrega 04 — landing, leads, WhatsApp e primeira publicação

- landing mobile-first;
- telefone para cupons/promoções;
- consentimento explícito;
- entrada aceita la_* e legado cc_*;
- persistência canônica la*;
- CTA/acompanhamento P0 via WhatsApp;
- deploy controlado por SHA;
- publicação real ainda depende de autorização/deploy.

## Marco comercial fechado — cardápio inicial

Fonte: docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md

Fechado em 24/09/2026:

- Batidas de Açaí;
- LilyShakes;
- Doces em breve;
- sabores/componentes da inauguração;
- preços 300/500;
- LilyMix até 3 sabores;
- adicionais e limites;
- combos;
- Produto Destaque semanal;
- política de margem mínima;
- busca/filtros;
- regras de mídia;
- landing com carrossel de destaques;
- disponibilidade/esgotado;
- tracking;
- regras de conta/telefone.

## Entrega 05 — catálogo/admin

**Status:** implementação técnica concluída e validada; deploy/QA visual pendentes.

Implementado fielmente ao cardápio canônico:

- categorias/subcategorias;
- produtos/variantes;
- LilyFlavorComponent e matriz de compatibilidade;
- LilyMix sem explosão de SKUs;
- adicionais por produto;
- preço regular/oferta;
- guardrail de margem >=10%;
- mídia/placeholder/galeria;
- busca e filtros;
- rolagem incremental;
- esgotado visível;
- Destaque da Semana;
- admin completo.

Validação técnica da Entrega 05: SHA `9e9c2e194076aa5a8dd3262e73528ac3689c8896`, CI Node 20/24 e CodeQL aprovados.

## Entrega 06 — carrinho, endereço e pedido

**Status:** próxima entrega.

- montar pedido com configuração vinda da Entrega 05;
- observações;
- telefone obrigatório;
- compra sem conta;
- entrega e retirada;
- horário, regiões, pedido mínimo e taxa configuráveis;
- suporte a diferentes estratégias de cálculo de entrega;
- integração futura com ERP.

## Entrega 07 — checkout/pagamento

- checkout online;
- provedor de pagamento;
- reconciliação;
- benefício opcional de conta limitado a 5% do lucro líquido estimado do pedido;
- smoke de venda digital completa.

**Gate de lançamento comercial digital:** Entregas 05–07 prontas e homologadas.

## Entrega 08 — painel de pedidos

- fila;
- status;
- operação;
- acompanhamento site/WhatsApp;
- integração posterior com ERP.

## Entrega 09 — tracking e analytics first-party

- manter QR físico atual;
- tracking digital discriminativo;
- produto, variante, combinação, adicionais, campanha, origem, superfície e pedido;
- sem PII em URL.

## Entrega 10 — QA, observabilidade e hardening

- acessibilidade;
- observabilidade;
- segurança;
- backup/restore;
- performance;
- QA operacional.

## Sincronizações paralelas

Antes do lançamento comercial completo:

- sincronizar workbook financeiro com cardápio definitivo;
- criar configuração de alergênicos;
- produzir fotos progressivamente;
- manter placeholder para o que ainda não tiver foto;
- configurar dados operacionais no sistema, não na documentação.

Cada deploy exige gates completos, backup/rollback e autorização explícita para o SHA exato.
