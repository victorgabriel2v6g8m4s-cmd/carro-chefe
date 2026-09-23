# Entrega 05 — Catálogo administrável, cardápio dinâmico e publicação

**Status:** planejada  
**Dependência:** Entrega 04 publicada e estável

## Objetivo

Permitir cadastro sem editar código e fazer com que todo produto **publicado/ativo e disponível** apareça automaticamente no cardápio Lily Gourmet.

## Escopo

Inclui categorias, produtos, variantes/tamanhos, preços, adicionais, mídia/capa, ordenação, publicação, pausa, disponibilidade, preview, painel staff, API pública e deploy.

Não inclui carrinho, endereço, checkout, pagamento ou painel de produção.

## Dados principais

`LilyCategory`: id, slug, name, description, status, sortOrder.

`LilyProduct`: id estável, categoryId, slug, name, description, status, `isAvailable`, featured, coverMediaId, sortOrder.

`LilyProductVariant`: id, productId, name, `priceCents`, status, `isAvailable`, sortOrder.

`LilyAddonGroup`, `LilyAddon` e `LilyProductAddonGroup` continuam o modelo já planejado.

`LilyMediaAsset`: storageName, originalName, MIME, size, SHA-256, dimensões, alt text, placeholder e status.

Dinheiro em centavos. Mídia física fora do Git.

## Regra pública central

Produto aparece somente quando:

1. categoria `published`;
2. produto `published`;
3. `product.isAvailable = true`;
4. ao menos uma variante publicada e disponível;
5. preço válido;
6. capa válida;
7. adicionais consistentes.

Pausa/indisponibilidade deve refletir sem deploy.

## APIs

Públicas:

```text
GET /api/v1/lily/public/catalog
GET /api/v1/lily/public/products/:slug
GET /api/v1/lily/public/media/:id
```

Admin:

```text
GET/POST/PATCH /api/v1/lily/admin/categories
GET/POST/PATCH /api/v1/lily/admin/products
GET/POST/PATCH /api/v1/lily/admin/variants
GET/POST/PATCH /api/v1/lily/admin/addon-groups
GET/POST/PATCH /api/v1/lily/admin/addons
GET/POST/PATCH /api/v1/lily/admin/product-addon-groups
GET/POST/PATCH /api/v1/lily/admin/media
```

Admin exige sessão Lily, `staff`, CSRF, Zod, rate limit e auditoria.

## Painel

```text
/lilyacai/painel
/lilyacai/painel/cardapio
/lilyacai/painel/midias
```

Deve criar/editar categoria, produto, preço/variante, adicionais, mídia, ordem, disponibilidade, pausa, preview e publicação.

## Mídia

Produção: `/srv/carro-chefe/data/lily-acai/uploads/`.

Dev: `.runtime/lily-acai/uploads/`.

P0: JPEG/PNG/WebP, limite, MIME/extensão allowlist, nome aleatório, SHA-256, alt text e proteção contra path traversal.

## Testes obrigatórios

- customer 403 no admin;
- sem sessão 401;
- staff funciona;
- sem CSRF 403;
- draft/paused não aparecem;
- indisponível não aparece como comprável;
- published + disponível aparece;
- produto sem variante não publica;
- preço inválido rejeita;
- regras de adicionais validadas;
- upload inválido/path traversal rejeitados.

Regressão:

```bash
npm run policy:check
npm run db:deploy
npm run check
npm test
npm run build
npm run tools:status:check
```

CI em Node 20 e 24.

## Publicação

Seguir `docs/lily-acai/DEPLOY_VPS.md`. O smoke deve provar que mudar disponibilidade/publicação no painel altera o cardápio sem editar código/rebuild.

## Próxima entrega

Entrega 06 — carrinho, endereço e criação de pedido.
