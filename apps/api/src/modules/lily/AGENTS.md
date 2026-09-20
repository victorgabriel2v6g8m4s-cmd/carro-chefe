# AGENTS — API Lily Açaí

## Região

Módulo de backend exclusivo da operação temporária Lily Açaí. Herda as regras de `apps/api`, com a exceção transacional isolada definida no `AGENTS.md` raiz desta branch.

## Namespace

- Todas as rotas Lily ficam em `/api/v1/lily/*`.
- Nenhuma rota Lily altera dados do Carro Chefe, da Central Operacional ou do ERP do Carro Chefe.
- Repositórios Lily usam somente o client/persistência de `packages/lily-database`.

## Segurança

- Validar params/query/body/headers/uploads com schemas explícitos.
- Autenticação e autorização são server-side.
- Papéis iniciais: `customer` e `staff`.
- Mutações autenticadas exigem proteção CSRF compatível com a estratégia de sessão.
- Login, criação de pedido, criação de pagamento e webhooks recebem rate limit específico.
- Sessões usam token aleatório armazenado no cliente apenas em cookie `HttpOnly`, `Secure`, `SameSite=Lax`; persistir somente hash do token.
- Senhas usam KDF forte e nunca são logadas.
- Webhooks e operações repetíveis são idempotentes.
- Logs devem redigir PII e segredos.

## Pagamentos

- Dados de cartão nunca passam a ser responsabilidade da aplicação.
- Criar o pedido antes da tentativa de pagamento.
- Total é calculado no servidor com catálogo vigente.
- Retorno do navegador não aprova pagamento.
- Status `paid` depende de confirmação autenticada do provedor e regras de reconciliação.
- IDs externos e metadata não carregam PII.

## Privacidade

- Consentimentos são versionados e separados por finalidade.
- `share_with_carro_chefe` é opcional e não provoca cópia automática de dados.
- Analytics externos não recebem PII.
- Endereço só é retornado a seu titular ou a staff autorizado no contexto necessário.

## Pronto

- [ ] Schemas e autorização cobertos por testes.
- [ ] IDOR entre clientes testado.
- [ ] Idempotência de pedido/pagamento/webhook testada.
- [ ] Falhas externas não transformam pedido em pago.
- [ ] Nenhum acesso ao banco Carro Chefe.
- [ ] Check, testes e build passam.
