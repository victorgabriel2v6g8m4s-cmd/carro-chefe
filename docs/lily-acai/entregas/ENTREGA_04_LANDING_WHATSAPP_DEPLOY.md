# Entrega 04 — Landing, leads, WhatsApp e primeira publicação

**Status:** planejada  
**Dependência:** Entrega 03 concluída  
**Destino:** `https://carrochefe.com/lilyacai/`

## Objetivo

Publicar uma landing CookLily que capte telefone de interessados em cupons/promoções e direcione acompanhamento de pedidos ao WhatsApp oficial.

## Landing

- logo/proposta;
- benefício claro;
- campo telefone;
- consentimento de marketing não pré-marcado;
- privacidade;
- CTA;
- success/duplicate/error;
- Instagram/WhatsApp;
- parceria discreta no rodapé.

Não prometer percentual, cupom específico, prazo ou escassez não aprovados.

## Lead sem senha

Planejar `LilyMarketingLead`:

- `id`;
- `phoneNormalized` único;
- `status`;
- `marketingConsentAt`;
- `consentVersion`;
- `privacyVersion`;
- `laQr?`;
- `laCampaign?`;
- `laVariant?`;
- timestamps.

Telefone nunca vai para analytics nem para o banco Carro Chefe.

## API prevista

```text
GET  /api/v1/lily/public/config
POST /api/v1/lily/public/leads
GET  /api/v1/lily/public/health
```

Com Zod, normalização, rate limit, antiabuso e deduplicação.

## WhatsApp

Número atual: `+55 67 99928-9187`.

P0:

- CTA abre conversa oficial;
- quando houver pedido, pode incluir somente código público/seguro;
- não colocar nome completo, endereço ou PII na URL;
- acompanhamento é humano.

Automação por WhatsApp fica para integração futura oficial.

## Deploy

Seguir `docs/lily-acai/DEPLOY_VPS.md`: SHA exato, backup, gates, migration, Nginx, restart, saúde, smoke e rollback.

## Testes previstos

```bash
npm run policy:preflight -- --agent AG-DEV --scope apps/lily_acai
npm run policy:preflight -- --agent AG-DEV --scope apps/api/src/modules/lily
npm run policy:preflight -- --agent AG-DEV --scope packages/lily-database
npm run policy:check
npm run db:validate
npm run check
npm test
npm run build
npm run tools:status:check
```

## Critérios de aceite

- identidade oficial aplicada;
- telefone válido persiste;
- duplicata não duplica;
- opt-in explícito;
- `la_*` sem PII;
- WhatsApp correto;
- UI mobile-first e estados completos;
- Nginx abre somente API necessária;
- Carro Chefe sem regressão;
- rollback documentado;
- deploy somente após autorização do SHA.

## Próxima entrega

Entrega 05 — catálogo/admin/cardápio dinâmico e segunda publicação.
