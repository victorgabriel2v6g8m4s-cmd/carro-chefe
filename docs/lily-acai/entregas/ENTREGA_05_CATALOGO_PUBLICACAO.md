# Entrega 05 — Catálogo administrável, cardápio dinâmico e publicação

**Status:** planejada com requisitos comerciais fechados  
**Dependência:** Entrega 04 publicada e estável  
**Fonte canônica de produto:** docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md

## Objetivo

Transformar o cardápio definitivo em catálogo administrável sem editar código e permitir que publicação, disponibilidade, mídia, preços, ofertas, combinações e adicionais reflitam no cardápio sem rebuild.

Esta entrega não reabre decisões de naming, sabores, preços iniciais ou limites comerciais já aprovados.

## Escopo

Inclui:

- categorias e subcategorias;
- Batidas de Açaí, LilyShakes e Doces “em breve”;
- nome próprio + nome descritivo;
- descrição, tags e busca;
- variantes 300/500 ml;
- preço regular e preço promocional;
- margem projetada;
- mídia/capa/galeria/placeholder;
- disponibilidade e esgotado;
- lead time opcional;
- adicionais específicos por produto;
- combinações LilyMix de até 3 sabores;
- matriz de compatibilidade;
- ofertas e combos;
- Destaque da Semana;
- painel staff;
- API pública;
- publicação.

Carrinho, criação do pedido, entrega/retirada e pagamento permanecem tecnicamente nas Entregas 06–07, mas o catálogo deve expor contrato suficiente para o configurador de item e o lançamento comercial completo só ocorre com checkout online.

## Modelos

### LilyCategory

- id;
- parentId opcional;
- slug;
- name;
- description;
- status;
- sortOrder;
- isComingSoon.

### LilyProduct

- id;
- categoryId/subcategoryId;
- slug;
- displayName;
- descriptiveName;
- description;
- tags;
- status;
- isAvailable;
- featured;
- weeklyHighlight;
- coverMediaId;
- sortOrder;
- preparationLeadMinutes opcional.

### LilyProductVariant

- id;
- productId;
- sizeMl;
- name;
- priceCents;
- compareAtPriceCents opcional;
- costCents opcional;
- projectedMarginBps opcional;
- status;
- isAvailable;
- sortOrder.

### LilyFlavorComponent

Representa Café, Morango, Maracujá, Doce de Leite, Frutas Vermelhas, Oreo, Banana, Leite Condensado, Paçoca, Ovomaltine, Ninho, Creme de Ninho e Nutella.

Campos mínimos:

- id/slug;
- name;
- status;
- priceModifier por tamanho;
- defaultPortion por tamanho;
- premium;
- tags.

### LilyFlavorCompatibility

Par-a-par, editável pelo admin.

Uma combinação de três sabores só é válida quando todos os pares internos forem compatíveis.

Não criar cada permutação como SKU.

### LilyAddon

- nome;
- preço;
- porção 300;
- porção 500;
- status;
- limite individual.

### LilyProductAddon

Relação produto/adicional com:

- permitido;
- limite específico;
- preço opcional sobrescrito;
- porção opcional sobrescrita.

Limites canônicos iniciais:

- 3 tipos diferentes;
- 2 porções por adicional;
- 4 porções totais;
- produto que já contém Nutella aceita apenas 1 Nutella extra.

### LilyOffer

- produto/variante/combo;
- regularPriceCents;
- offerPriceCents;
- savingsCents;
- startsAt;
- endsAt;
- status;
- campaignId opcional;
- minProjectedMarginBps.

Nenhuma oferta publica com margem líquida projetada abaixo de 10%.

### LilyMediaAsset

Mantém storageName, originalName, MIME, size, SHA-256, dimensões, alt text, placeholder e status.

## Produtos iniciais

### Batidas

- Rosa da Lily;
- Rosa Nutt;
- Sol da Lily;
- Sol Nutt;
- Ninho Nutt.

Preços e descrições: usar exclusivamente o documento canônico.

### LilyShakes

Cards simples dos sabores aprovados + LilyMix configurável.

Preço da matriz:

- 1 sabor: R$ 15 / R$ 22;
- 2 sabores: R$ 18 / R$ 25;
- 3 sabores: R$ 20 / R$ 28;
- Nutella: + R$ 5.

### Doces

Categoria publicada como “em breve”, sem produtos compráveis.

## Catálogo público

APIs mínimas:

GET /api/v1/lily/public/catalog  
GET /api/v1/lily/public/products/:slug  
GET /api/v1/lily/public/media/:id  
GET /api/v1/lily/public/catalog/search  
POST /api/v1/lily/public/configure-item

O configure-item valida tamanho, sabores, compatibilidade, adicionais, limites, preço e disponibilidade e devolve configuração determinística para o futuro carrinho.

## Admin

Além do CRUD já previsto, precisa editar:

- subcategorias;
- sabores;
- matriz de compatibilidade;
- porções;
- adicionais por produto;
- limites;
- preço regular/oferta;
- margem;
- combos;
- Destaque da Semana;
- estado “em breve”;
- lead time;
- placeholder e galeria.

Rotas administrativas continuam exigindo sessão Lily, staff, CSRF, Zod, rate limit e auditoria.

## UX do cardápio

- rolagem infinita/paginação incremental;
- imagem como maior elemento do card;
- nome próprio em destaque;
- nome descritivo minimalista;
- descrição secundária;
- busca tolerante a acentos;
- filtros por categoria, subcategoria, sabor, Simples/Com Nutella/Duo/Trio, tamanho, oferta, preço e disponibilidade;
- imagem/mídia em tela cheia;
- placeholder CookLily quando faltar foto;
- esgotado permanece visível com contraste reduzido e compra bloqueada.

Landing exibe apenas Destaques, Produto da Semana, combos e ofertas em carrossel automático com controles acessíveis.

## Ofertas e combos iniciais

- Dupla Lily: 2 LilyShakes simples 500 ml por R$ 40;
- Trio Lily: 3 LilyShakes simples 300 ml por R$ 40;
- Dupla Açaí: 2 Batidas simples 500 ml por R$ 48.

Etiqueta mostra economia absoluta em reais.

## Regras de publicação

Produto comprável exige:

1. categoria publicada;
2. produto publicado;
3. disponibilidade;
4. variante publicada/disponível;
5. preço válido;
6. mídia válida ou placeholder autorizado;
7. adicionais/combinações consistentes;
8. margem >= 10% quando houver custo calculável.

Produto esgotado pode continuar público, mas não comprável.

## Mídia

Produção: /srv/carro-chefe/data/lily-acai/uploads/  
Dev: .runtime/lily-acai/uploads/

Fotos existentes de morango e maracujá estão aprovadas. Café e demais sabores usam placeholder até upload oficial.

Fotos do cardápio mostram apenas o produto; não é necessário ter foto separada por tamanho.

## Tracking

Preservar la_* e aliases cc_*.

Eventos digitais devem distinguir:

- produto;
- variante/tamanho;
- combinação de sabores;
- adicionais;
- oferta/combo;
- campanha;
- origem;
- superfície;
- futura conversão/pedido.

Nunca colocar PII em URL de tracking.

## Testes obrigatórios

- customer 403 no admin;
- sem sessão 401;
- staff funciona;
- sem CSRF 403;
- busca/filtros determinísticos;
- subcategoria funciona;
- esgotado permanece visível e não comprável;
- preço por tamanho correto;
- oferta calcula savings corretamente;
- margem <10% bloqueia publicação de preço/oferta;
- limite de adicionais;
- Nutella extra respeita limite;
- pares incompatíveis são rejeitados;
- trio com qualquer par incompatível é rejeitado;
- LilyMix não cria duplicidade por ordem de sabores;
- placeholder funciona;
- mídia fullscreen;
- Destaque da Semana tem vigência;
- upload inválido/path traversal rejeitados.

Regressão:

npm run policy:check  
npm run db:deploy  
npm run check  
npm test  
npm run build  
npm run tools:status:check

CI em Node 20 e 24.

## Publicação

Seguir docs/lily-acai/DEPLOY_VPS.md.

O smoke da Entrega 05 deve provar que editar preço, disponibilidade, mídia, oferta, adicional ou compatibilidade no painel altera o cardápio sem editar código/rebuild.

## Próximo escopo

Entrega 06 implementa carrinho, endereço, entrega/retirada e criação de pedido usando o configurador desta entrega. Entrega 07 fecha checkout/pagamento.

O lançamento comercial completo exige checkout online; portanto Entregas 05–07 formam a sequência mínima para venda digital completa.
