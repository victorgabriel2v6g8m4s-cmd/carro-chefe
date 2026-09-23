# AGENTS — CookLily frontend

## Região

Aplicação temporária e independente da CookLily. Herda `REGRAS.md`, `AGENTS.md` raiz e `apps/AGENTS.md`.

## Fronteira obrigatória

- Servir somente sob `/lilyacai/*`.
- Consumir somente `/api/v1/lily/*` para dados Lily.
- Não importar identidade, conteúdo comercial, autenticação ou estado transacional do Carro Chefe.
- Não usar `packages/database` nem qualquer tabela da Central Operacional.
- O branding deve ser próprio da Lily: rosa/roxo, sem reaproveitar logo, slogan, tokens ou estética Carro Chefe.
- A parceria com o Carro Chefe aparece apenas como informação textual de transparência, sem criar aparência de submarca.

## Dados e checkout

- Login Lily é independente.
- Consentimentos necessários, marketing Lily, analytics opcional e compartilhamento com Carro Chefe são finalidades separadas.
- Compartilhamento com Carro Chefe nunca é obrigatório para comprar.
- O frontend nunca confia em preço/total calculado localmente como fonte oficial; o backend recalcula quote e pedido.
- O frontend nunca marca pagamento como aprovado.
- Nunca armazenar senha, token de sessão, número de cartão, CVV ou segredo em storage acessível ao JavaScript.
- Não enviar nome, telefone, endereço ou texto livre a analytics externos.

## Conteúdo provisório

- Produtos, fotos, sabores, preços e adicionais não aprovados ficam como `draft`/placeholder.
- Conteúdo demonstrativo deve ser visualmente e tecnicamente distinguível de item publicado.
- Não inventar oferta, taxa, prazo, disponibilidade ou promoção.

## UX

- Mobile-first, teclado, foco visível, contraste, estados loading/vazio/erro e mensagens acessíveis.
- Carrinho e total devem ser claros.
- Fluxo de compra não depende de aceitar marketing, analytics ou compartilhamento.

## Pronto

- [ ] Preflight do escopo Lily passa.
- [ ] Nenhuma dependência visual/transacional do Carro Chefe foi introduzida.
- [ ] Testes proporcionais, typecheck e build passam.
- [ ] Mobile e teclado verificados.
- [ ] Nenhum segredo/PII indevido aparece no bundle, logs ou analytics.
