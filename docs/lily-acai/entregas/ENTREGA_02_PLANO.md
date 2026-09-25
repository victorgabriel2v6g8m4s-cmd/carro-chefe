# Entrega 02 — Scaffold, banco base, autenticação e consentimentos

**Status:** concluída  
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


## Resultado da execução

A Entrega 2 implementou a primeira versão executável da Lily sem adicionar dependências externas novas.

### Frontend

- app React/Vite próprio em `apps/lily_acai`;
- `base: "/lilyacai/"`;
- BrowserRouter isolado no mesmo basename;
- rotas de cardápio, cadastro, login e privacidade;
- identidade inicial rosa/roxa, sem tokens visuais do Carro Chefe;
- Instagram `@acai._lily` e WhatsApp informado;
- parceria Carro Chefe comunicada somente como transparência no rodapé;
- cardápio ainda sem sabores/preços inventados.

### Banco

Criado `packages/lily-database` com Prisma/SQLite próprio:

- client Prisma separado;
- config Prisma separado;
- migration independente;
- `LilyUser`;
- `LilySession`;
- `LilyConsentRecord`;
- datasource Lily separado de `DATABASE_URL`.

O CI comprovou a aplicação da migration Lily separadamente da migration Carro Chefe.

### Autenticação e sessão

Implementado:

- telefone brasileiro normalizado;
- senha com `scrypt` do Node, salt aleatório e parâmetros versionados no próprio hash;
- sessão com token aleatório de 256 bits;
- somente SHA-256 do token da sessão é persistido;
- cookie `lily_session` HttpOnly, SameSite=Lax e Secure em HTTPS/produção;
- cookie limitado a `/api/v1/lily`;
- CSRF aleatório por sessão, persistido somente em hash e rotacionado por `/auth/me`;
- logout revoga a sessão;
- registro público cria somente `customer`;
- sessão arbitrária/externa não autentica Lily.

### Consentimentos

O cadastro registra separadamente:

- `terms_required`;
- `lily_marketing`;
- `share_with_carro_chefe`;
- `analytics_optional`.

Marketing, analytics e compartilhamento podem ser recusados sem impedir a criação da conta.

### API

Implementado:

```text
GET  /api/v1/lily/public/health
GET  /api/v1/lily/public/config
POST /api/v1/lily/auth/register
POST /api/v1/lily/auth/login
GET  /api/v1/lily/auth/me
POST /api/v1/lily/auth/logout
```

Rotas de autenticação possuem rate limit dedicado e continuam protegidas pela validação de origem global da API.

### Integração do monorepo

- `npm run dev:lily`;
- `npm run build:lily`;
- generate/validate/migrate/deploy Prisma agora executam core + Lily;
- build raiz inclui o frontend Lily;
- package-lock contém os novos workspaces;
- CI usa `LILY_DATABASE_URL` separado;
- Fastify serve `/lilyacai/*` antes do catch-all Carro Chefe;
- origem local Vite `:5175` incluída somente para desenvolvimento.

## Testes e evidências

A validação foi executada no draft PR #52, criado exclusivamente para CI e marcado para não ser mergeado na `main`.

Na rodada de validação da implementação:

- policy manifest: passou;
- arquivos sensíveis rastreados: passou;
- `npm ci`: passou;
- migrations Carro Chefe: passaram;
- migration Lily: passou em banco independente;
- `npm run check`: passou;
- testes Lily de auth/sessão/CSRF: passaram;
- regressão do restante do monorepo: passou;
- `npm run build`, incluindo `build:lily`: passou;
- Tool Health: `app-lily` passou;
- Tool Health Linux: 11 checks aprovados, 0 falhas e 1 não aplicável.

O gate oficial permanece configurado para Node 20 e Node 24; o estado final deve ser lido nos checks do PR #52 sobre o head final desta entrega.

### Casos Lily cobertos

- health do banco Lily;
- cadastro válido;
- papel `customer`;
- consentimentos opcionais recusados;
- telefone duplicado;
- credencial inválida;
- sessão autenticada;
- rotação de CSRF;
- logout sem CSRF rejeitado;
- logout com CSRF válido;
- sessão revogada rejeitada;
- sessão externa/arbitrária rejeitada.

## Correções feitas durante o CI

A primeira tentativa de migration Lily revelou que paths do `prisma.config.ts` são resolvidos relativamente ao arquivo de configuração. O path foi corrigido e `LILY_DATABASE_URL` passou a ser normalizado para arquivo absoluto a partir da raiz de execução, garantindo que migration e client abram o mesmo SQLite.

## Observações de segurança

O `npm ci` do repositório reporta quatro advisories de severidade alta na árvore existente. A Entrega 2 não adicionou dependências externas novas. Os advisories precisam de auditoria dedicada antes da publicação comercial, sem aplicar `npm audit fix --force` cegamente.

## Fora do escopo preservado

Continuam fora da Entrega 2:

- catálogo real;
- preços;
- upload de mídia;
- endereços;
- carrinho;
- pedidos;
- pagamento;
- painel de pedidos;
- tracking QR completo.

Esses limites foram mantidos para evitar acoplamento prematuro.
