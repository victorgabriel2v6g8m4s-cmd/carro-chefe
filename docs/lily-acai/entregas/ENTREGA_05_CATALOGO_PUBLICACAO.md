# Entrega 05 — Catálogo administrável, cardápio dinâmico e publicação

**Status:** implementação técnica concluída e validada; deploy e QA visual pendentes  
**Data da validação:** 24/09/2026  
**Fonte canônica de produto:** `docs/lily-acai/produtos/CARDAPIO_INICIAL_DEFINITIVO.md`  
**SHA técnico validado:** `9e9c2e194076aa5a8dd3262e73528ac3689c8896`

## Resultado

A Entrega 05 transformou o cardápio CookLily fechado em 24/09/2026 em um catálogo administrável, persistido no banco Lily e consumido pelo frontend sem depender de rebuild para alterar preço, disponibilidade, textos, sabores, adicionais, ofertas, combos ou mídia.

A entrega permanece isolada do banco transacional do Carro Chefe.

## Banco

Migration:

`packages/lily-database/prisma/migrations/20260924190000_lily_catalog/migration.sql`

Modelos adicionados:

- `LilyCategory`;
- `LilyMediaAsset`;
- `LilyProduct`;
- `LilyProductVariant`;
- `LilyFlavorComponent`;
- `LilyFlavorCompatibility`;
- `LilyProductFlavor`;
- `LilyAddon`;
- `LilyProductAddon`;
- `LilyProductMedia`;
- `LilyMixPriceTier`;
- `LilyCombo`;
- `LilyComboItem`;
- `LilyOffer`;
- `LilyAdminAudit`.

A migration também cadastra a estrutura inicial aprovada: categorias/subcategorias, Batidas, LilyShakes, LilyMix, sabores, matriz de compatibilidade, adicionais, preços e três combos iniciais.

## Catálogo público

Implementado em `apps/api/src/modules/lily/catalog.ts`.

Rotas:

```text
GET  /api/v1/lily/public/catalog
GET  /api/v1/lily/public/catalog/search
GET  /api/v1/lily/public/products/:slug
GET  /api/v1/lily/public/media/:id
POST /api/v1/lily/public/configure-item
```

O catálogo suporta:

- paginação incremental;
- pesquisa tolerante a acentos;
- categoria e subcategoria;
- sabor;
- tamanho;
- ofertas;
- disponibilidade/esgotado;
- faixa de preço;
- mídia/capa/galeria;
- placeholder;
- Destaque da Semana;
- combos.

Produto esgotado continua público, mas não comprável.

## LilyMix

O LilyMix não cria cada permutação como SKU.

`configure-item` valida no servidor:

- 1 a 3 sabores;
- sabores sem repetição;
- compatibilidade par-a-par;
- tier de preço por quantidade de sabores e tamanho;
- modificador premium, incluindo Nutella;
- adicionais permitidos para o produto;
- compatibilidade adicional × sabores;
- máximo de 3 tipos de adicional;
- máximo de 2 porções por adicional, salvo override;
- máximo de 4 porções adicionais no item.

A configuração recebe hash determinístico para reutilização pela Entrega 06.

## Preços e ofertas

Preços iniciais do documento canônico foram persistidos.

Ofertas possuem:

- preço regular;
- preço promocional;
- economia absoluta;
- vigência;
- campanha opcional;
- piso de margem.

Quando uma oferta publicada e vigente corresponde à variante/configuração, o configurador público devolve o preço promocional.

Variante com margem projetada conhecida abaixo de 10% não pode ser publicada. Oferta vinculada a variante com custo conhecido também é bloqueada se projetar margem abaixo do piso de 10%.

## Admin

Rotas administrativas:

```text
GET   /api/v1/lily/admin/catalog
POST  /api/v1/lily/admin/categories
PATCH /api/v1/lily/admin/categories/:id
POST  /api/v1/lily/admin/products
PATCH /api/v1/lily/admin/products/:id
PUT   /api/v1/lily/admin/products/:id/flavors
PUT   /api/v1/lily/admin/products/:id/addons
PUT   /api/v1/lily/admin/products/:id/mix-tiers
POST  /api/v1/lily/admin/variants
PATCH /api/v1/lily/admin/variants/:id
POST  /api/v1/lily/admin/flavors
PATCH /api/v1/lily/admin/flavors/:id
PUT   /api/v1/lily/admin/compatibilities
POST  /api/v1/lily/admin/addons
PATCH /api/v1/lily/admin/addons/:id
POST  /api/v1/lily/admin/combos
PATCH /api/v1/lily/admin/combos/:id
POST  /api/v1/lily/admin/offers
PATCH /api/v1/lily/admin/offers/:id
POST  /api/v1/lily/admin/media
PATCH /api/v1/lily/admin/media/:id
```

Proteções:

- sessão CookLily;
- papel `staff` ou `admin`;
- CSRF nas mutações;
- Zod;
- rate limit global existente;
- auditoria em `LilyAdminAudit`.

Foi corrigido durante a validação um caso importante: PATCHes administrativos agora preservam campos ausentes e alteram somente propriedades realmente enviadas, evitando que defaults de schemas de criação mudem silenciosamente o status de um produto.

## Mídia

Upload administrativo aceita:

- JPEG;
- PNG;
- WebP;
- até 10 MB.

O backend:

- gera nome aleatório;
- calcula SHA-256;
- não usa o nome fornecido pelo cliente como path físico;
- mantém mídia fora do Git;
- serve o arquivo por ID.

Diretórios:

- produção: `/srv/carro-chefe/data/lily-acai/uploads/`;
- desenvolvimento: `.runtime/lily-acai/uploads/`.

## Frontend público

`/lilyacai/cardapio` agora possui catálogo real.

Implementado:

- cards image-first;
- nome próprio em destaque;
- descritor minimalista;
- busca;
- filtros;
- rolagem incremental;
- combos;
- selo de oferta;
- preço promocional;
- esgotado com menor contraste;
- modal de configuração;
- LilyMix;
- adicionais;
- mídia fullscreen;
- placeholder para produtos ainda sem foto.

A landing não renderiza o cardápio completo. Ela recebeu carrossel automático de produtos destacados/ofertas, com controles manuais e pausa na interação.

## Painel

Rotas:

```text
/lilyacai/painel
/lilyacai/painel/cardapio
/lilyacai/painel/midias
```

O painel permite administrar:

- produto;
- nome próprio/descritivo;
- descrição;
- categoria;
- status;
- disponibilidade;
- ordem;
- destaque;
- Produto da Semana;
- capa;
- variantes;
- preços;
- sabores por produto;
- adicionais por produto;
- tiers do LilyMix;
- categorias/subcategorias;
- sabores;
- matriz de compatibilidade;
- adicionais;
- combos;
- ofertas;
- upload de mídia.

## Nginx

O template `deploy/nginx/carrochefe.com.conf.example` foi preparado para liberar explicitamente:

```text
/api/v1/lily/public/
/api/v1/lily/auth/
/api/v1/lily/admin/
```

O restante de `/api/` continua bloqueado no proxy público e `/gestao` permanece inacessível.

A autorização real de admin continua no Fastify; Nginx não substitui sessão/papel/CSRF.

## Testes adicionados

`apps/api/src/modules/lily/catalog.test.ts` cobre, entre outros:

- catálogo público;
- categorias e LilyMix;
- busca sem acento;
- combinação LilyMix válida;
- combinação incompatível;
- limite total de adicionais;
- customer recebe 403 no admin;
- staff sem CSRF recebe 403;
- staff autorizado altera disponibilidade;
- produto esgotado continua público;
- auditoria de mutação;
- publicação com margem abaixo de 10% bloqueada;
- oferta administrativa publicada altera o preço do configurador público.

## Evidências executadas

SHA validado:

`9e9c2e194076aa5a8dd3262e73528ac3689c8896`

CI:

https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36071488950

Resultado: **success**.

- Quality Node 20: success;
- Quality Node 24: success;
- 20 arquivos de teste aprovados;
- 94 testes aprovados em Node 20;
- 94 testes aprovados em Node 24;
- produção/build Lily: success;
- Workbook Snapshot: success;
- Excel Recipe Linux: success;
- Excel Recipe Windows: success;
- Tool Health: success;
- Windows Supervisor: success.

CodeQL:

https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36071488899

Resultado: **success**.

PR temporário de validação:

https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/pull/64

O PR existe somente para disparar os gates. A branch `lily-acai` não deve ser mergeada integralmente em `main`.

## Não executado

A conclusão técnica desta entrega **não significa publicação em produção**.

Ainda não foram executados nesta entrega:

- deploy do SHA na VPS;
- migration contra o banco Lily real da VPS;
- criação/homologação da primeira conta staff de produção;
- aplicação real do novo template Nginx;
- `nginx -t` na VPS;
- restart do serviço;
- smoke externo HTTPS;
- upload real de mídia em produção;
- QA visual manual em dispositivos móveis/desktop;
- sincronização financeira final do workbook com todas as novas decisões do cardápio.

## Gate de publicação

Quando houver autorização de deploy:

1. backup de `lily-acai.db`, se existir;
2. deploy por SHA imutável;
3. `npm run db:deploy:lily`;
4. preparar `/srv/carro-chefe/data/lily-acai/uploads/`;
5. aplicar/revisar Nginx;
6. `nginx -t`;
7. restart controlado;
8. criar/homologar staff;
9. smoke de catálogo;
10. validar alteração de preço/disponibilidade pelo painel;
11. validar mídia;
12. validar LilyMix;
13. QA visual mobile/desktop;
14. rollback se algum gate crítico falhar.

## Próxima entrega

**Entrega 06 — carrinho, endereço, entrega/retirada e criação de pedido.**

Ela deve consumir o `configurationHash` e os preços validados pela Entrega 05, sem confiar em valores calculados apenas pelo navegador.

A Entrega 07 fechará pagamento/reconciliação.
