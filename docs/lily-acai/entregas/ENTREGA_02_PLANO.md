# Entrega 02 — Scaffold, banco base, autenticação e consentimentos

**Status:** planejada  
**Dependência:** Entrega 01 concluída

## Objetivo

Transformar a fundação documental em uma aplicação executável, ainda sem catálogo real nem pagamento, com:

- app React/Vite Lily;
- base `/lilyacai/`;
- banco Prisma/SQLite dedicado;
- módulo Fastify em `/api/v1/lily`;
- cadastro/login/logout Lily;
- sessão segura;
- papéis `customer` e `staff`;
- consentimentos versionados;
- página de entrada/cadastro;
- página legal operacional;
- endpoint de saúde Lily.

## Implementação prevista

### Frontend

Criar:

- `package.json`;
- `vite.config.ts` com `base: "/lilyacai/"`;
- `index.html`;
- `src/main.tsx`;
- roteador com `basename="/lilyacai"`;
- páginas iniciais de entrar, cadastrar, privacidade e shell de cardápio;
- serviço HTTP somente para `/api/v1/lily`;
- tokens visuais Lily próprios.

### Banco

Criar `packages/lily-database` com Prisma e datasource separado.

Modelos P0 desta entrega:

- `LilyUser`;
- `LilySession`;
- `LilyConsentRecord`.

Invariantes:

- telefone normalizado único;
- senha somente em hash;
- token de sessão somente em hash;
- expiração/revogação de sessão;
- consentimento com purpose/version/granted/timestamps;
- nenhuma relation com schema Carro Chefe.

### Backend

Criar módulo Lily e registrar rotas:

```text
GET  /api/v1/lily/public/health
POST /api/v1/lily/auth/register
POST /api/v1/lily/auth/login
POST /api/v1/lily/auth/logout
GET  /api/v1/lily/auth/me
```

Adicionar fundações para:

- cookie `HttpOnly`;
- sessão;
- password hashing;
- CSRF para mutações autenticadas;
- rate limit dedicado;
- DTO mínimo;
- normalização de telefone;
- RBAC inicial.

## Consentimentos da Entrega 2

Separar:

- `terms_required`;
- `lily_marketing`;
- `share_with_carro_chefe`;
- `analytics_optional`.

Cadastro só exige o que for necessário ao serviço. Marketing, analytics e compartilhamento não podem bloquear cadastro/compra.

## Fora do escopo desta entrega

- produtos reais;
- preços;
- upload de mídia;
- carrinho;
- endereço;
- pedido;
- Mercado Pago;
- painel de pedidos;
- QR/tracking completo.

Esses itens não devem ser antecipados dentro do módulo de autenticação.

## Testes obrigatórios

### Policy

```bash
npm run policy:check
npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai
npm run policy:preflight -- --agent AG-DEV --scope apps/api/src/modules/lily
npm run policy:preflight -- --agent AG-DEV --scope packages/lily-database
```

### Banco

- Prisma validate/generate;
- migration em banco vazio;
- unique de telefone;
- cascade/revoke conforme schema;
- prova de ausência de tabelas Carro Chefe.

### Auth

- cadastro válido;
- duplicidade;
- senha inválida;
- login válido/inválido;
- logout;
- sessão expirada;
- cookie e flags;
- endpoint `me`;
- customer não ganha papel staff;
- consentimentos opcionais recusados não impedem cadastro;
- nenhum password/token aparece na resposta/log.

### Regressão

Na raiz:

```bash
npm run check
npm test
npm run build
```

O build Lily deve ser integrado ao build raiz sem quebrar site, gestão ou QR Lab.

## Critérios de aceite

- [ ] `/lilyacai/` possui build independente.
- [ ] frontend não reutiliza identidade Carro Chefe.
- [ ] `/api/v1/lily/public/health` responde.
- [ ] cadastro/login/logout/me funcionam.
- [ ] Lily DB é arquivo separado.
- [ ] usuário/sessão Carro Chefe não autentica Lily.
- [ ] consentimentos são independentes e versionados.
- [ ] compartilhamento com Carro Chefe pode ser recusado.
- [ ] nenhum segredo vai ao bundle.
- [ ] policy, check, testes e builds passam.
- [ ] documentação da Entrega 2 registra evidências reais.
- [ ] Entrega 3 fica planejada antes do encerramento.
