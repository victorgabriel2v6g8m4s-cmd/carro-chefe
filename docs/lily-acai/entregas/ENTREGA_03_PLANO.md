# Entrega 03 — Catálogo, mídia e administração

**Status:** planejada  
**Dependência:** Entrega 02 concluída

## Objetivo

Permitir que a Lily Açaí cadastre e organize o cardápio real sem editar código, mantendo produtos provisórios em rascunho até que sabores, preços, fotos e adicionais sejam aprovados.

A entrega deve fornecer:

- categorias;
- produtos;
- tamanhos/variantes;
- grupos de adicionais;
- adicionais;
- associação entre produto e grupos de adicionais;
- capas e galeria;
- publicação/pausa/arquivamento;
- ordenação;
- preview;
- painel interno protegido por papel `staff`;
- endpoints públicos que retornem somente conteúdo efetivamente publicado.

## Limite da entrega

Esta entrega **não** implementa:

- carrinho;
- endereço;
- taxa de entrega;
- criação de pedido;
- pagamento;
- painel de produção/pedidos;
- tracking QR completo.

Esses fluxos só devem consumir o contrato de catálogo depois que esta entrega estiver validada.

## Modelo de dados

Adicionar ao banco Lily, sem relações com o banco Carro Chefe:

### `LilyCategory`

Campos mínimos:

- `id`;
- `slug` único;
- `name`;
- `description?`;
- `status`: `draft | published | paused | archived`;
- `sortOrder`;
- timestamps.

### `LilyProduct`

Campos mínimos:

- `id` estável;
- `categoryId`;
- `slug` único;
- `name`;
- `description`;
- `status`;
- `featured`;
- `coverMediaId?`;
- `sortOrder`;
- timestamps.

### `LilyProductVariant`

Representa tamanho/variação comercial:

- `id`;
- `productId`;
- `name`;
- `priceCents`;
- `status`;
- `sortOrder`;
- timestamps.

Dinheiro deve ser armazenado como inteiro em centavos. Nenhum preço provisório deve ser publicado como real.

### `LilyAddonGroup`

- `id`;
- `name`;
- `description?`;
- `selectionType`: `single | multiple`;
- `minSelections`;
- `maxSelections`;
- `status`;
- `sortOrder`.

Invariantes:

- `minSelections >= 0`;
- `maxSelections >= 1`;
- `minSelections <= maxSelections`;
- grupo `single` não pode permitir máximo maior que 1.

### `LilyAddon`

- `id`;
- `groupId`;
- `name`;
- `description?`;
- `priceCents`;
- `status`;
- `sortOrder`.

### `LilyProductAddonGroup`

Join explícito para associar grupos aos produtos, com ordenação e possibilidade de override futuro sem duplicar grupo.

### `LilyMediaAsset`

- `id`;
- `storageName` único;
- `originalName`;
- `mimeType`;
- `sizeBytes`;
- `sha256`;
- `width?`;
- `height?`;
- `altText`;
- `isPlaceholder`;
- `status`;
- timestamps.

A mídia física não fica no Git.

## Armazenamento de mídia

### Produção

Planejado:

```text
/srv/carro-chefe/data/lily-acai/uploads/
```

### Desenvolvimento/teste

Usar diretório mutável ignorado pelo Git, por exemplo:

```text
.runtime/lily-acai/uploads/
```

### Regras de upload P0

Aceitar inicialmente somente:

- JPEG;
- PNG;
- WebP.

Não aceitar SVG no P0 para reduzir superfície de XSS/conteúdo ativo.

Aplicar:

- limite de tamanho explícito;
- validação de MIME e extensão;
- nome de armazenamento aleatório;
- SHA-256;
- prevenção de path traversal;
- nunca executar upload;
- alt text obrigatório para publicação;
- conteúdo provisório com `isPlaceholder=true`.

## API pública

Prefixo Lily permanece exclusivo:

```text
GET /api/v1/lily/public/catalog
GET /api/v1/lily/public/products/:slug
GET /api/v1/lily/public/media/:id
```

Regras:

- somente categorias/produtos/variantes/adicionais `published`;
- nenhum item `draft`, `paused` ou `archived`;
- preço sempre vem do backend;
- DTO público mínimo;
- paginação/limites onde aplicável;
- mídia sem caminho físico interno exposto.

## API administrativa

Planejado:

```text
GET/POST/PATCH /api/v1/lily/admin/categories
GET/POST/PATCH /api/v1/lily/admin/products
GET/POST/PATCH /api/v1/lily/admin/variants
GET/POST/PATCH /api/v1/lily/admin/addon-groups
GET/POST/PATCH /api/v1/lily/admin/addons
GET/POST/PATCH /api/v1/lily/admin/product-addon-groups
GET/POST/PATCH /api/v1/lily/admin/media
```

Todas exigem:

- sessão Lily válida;
- papel `staff`;
- CSRF em mutações;
- validação Zod;
- rate limit apropriado;
- auditoria mínima de publicação/status.

Registro público nunca pode criar `staff`.

A criação da primeira identidade staff em produção permanece decisão operacional pendente; a implementação não deve criar senha administrativa padrão nem backdoor. Testes podem criar usuário staff diretamente no banco de teste.

## Regras de publicação

Um produto só pode mudar para `published` quando houver, no mínimo:

- categoria publicável;
- nome;
- slug válido;
- descrição;
- pelo menos uma variante ativa;
- preço de variante válido e explicitamente cadastrado;
- capa válida;
- alt text;
- nenhum grupo de adicionais com regra inconsistente.

Itens provisórios podem existir completos como `draft`, mas o endpoint público não os expõe.

## IDs e histórico

- IDs de produto/variante/adicional não mudam quando nome, foto ou preço mudam.
- Não excluir fisicamente registros que já possam ser referenciados por pedido futuro; preferir `archived`.
- Mudança de preço não deve reescrever histórico de pedido em entregas futuras.
- Slug pode mudar com tratamento explícito; ID é a referência canônica.

## Painel

Criar área inicial:

```text
/lilyacai/painel
/lilyacai/painel/cardapio
/lilyacai/painel/midias
```

Experiência desejada:

1. lista de categorias;
2. produtos por categoria;
3. criar/editar produto;
4. adicionar tamanhos e preços;
5. criar grupos de adicionais;
6. associar grupos;
7. subir capa/galeria;
8. marcar mídia provisória;
9. preview;
10. publicar, pausar ou arquivar.

O painel deve mostrar com clareza:

- rascunho;
- publicado;
- pausado;
- provisório;
- campos que impedem publicação.

## Frontend público

Substituir o estado vazio atual por um cardápio dirigido integralmente pela API.

Enquanto não houver item publicado, preservar um estado vazio profissional e verdadeiro, sem preços ou produtos inventados.

Quando existirem itens publicados:

- categorias navegáveis;
- cards mobile-first;
- capa;
- nome;
- descrição curta;
- preço inicial derivado das variantes publicadas;
- CTA para abrir detalhes;
- visual rosa/roxo Lily.

## Fotos sugestivas

A infraestrutura deve aceitar mídias provisórias para acelerar a montagem inicial.

Regras:

- `isPlaceholder=true`;
- nunca copiar foto de concorrente;
- imagem gerada/licenciada deve ter origem documentada quando aplicável;
- placeholder deve ser facilmente substituível pelo painel;
- publicação de placeholder depende de decisão explícita da operação, não ocorre automaticamente.

## Testes obrigatórios

### Banco

- migration em banco Lily vazio;
- unique de slug/storageName;
- FKs;
- constraints/regras de min/max no service;
- exclusão/arquivamento não quebra relações;
- nenhuma tabela/relation com banco Carro Chefe.

### Autorização

- usuário `customer` recebe 403 em todas as rotas admin;
- `staff` autorizado acessa;
- sessão ausente recebe 401;
- mutação sem CSRF recebe 403;
- registro público não aceita definir role.

### Catálogo

- draft nunca aparece publicamente;
- paused nunca aparece publicamente;
- published válido aparece;
- produto sem variante não publica;
- produto sem capa/alt text não publica;
- preço inválido é rejeitado;
- grupo single com max > 1 é rejeitado;
- min > max é rejeitado;
- ordenação determinística.

### Mídia

- MIME não permitido rejeitado;
- arquivo acima do limite rejeitado;
- nome físico não usa nome enviado pelo cliente;
- path traversal rejeitado;
- SHA persistido;
- mídia inexistente retorna 404;
- nenhum upload entra no Git.

### Regressão

Executar:

```bash
npm run policy:check
npm run db:deploy
npm run check
npm test
npm run build
npm run tools:status
```

Validar Node 20 e Node 24 pelo CI.

## Critérios de aceite

- [ ] banco Lily possui schema de catálogo versionado;
- [ ] endpoints públicos só expõem publicados;
- [ ] admin exige `staff`;
- [ ] não existe criação pública de staff;
- [ ] CRUD de categoria/produto/variante/adicionais funciona;
- [ ] grupos de adicionais respeitam limites;
- [ ] upload JPEG/PNG/WebP funciona com armazenamento fora do Git;
- [ ] mídia provisória é identificável;
- [ ] produto incompleto não publica;
- [ ] painel permite administrar sem editar código;
- [ ] cardápio público consome somente API;
- [ ] nenhum produto/preço real é inventado;
- [ ] tool-health continua verde;
- [ ] Node 20 e Node 24 passam;
- [ ] documentação registra alterações e evidências;
- [ ] Entrega 4 é planejada antes do encerramento.
