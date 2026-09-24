# Entrega 04 — Landing, leads, WhatsApp e primeira publicação

**Status:** implementação técnica concluída; publicação pendente de autorização para SHA final  
**Destino planejado:** `https://carrochefe.com/lilyacai/`

## Objetivo

Disponibilizar uma landing CookLily que capta telefone de interessados em cupons e promoções sem exigir conta/senha, preserva atribuição QR/campanha e direciona acompanhamento de pedidos para o WhatsApp oficial.

## Implementado

### Landing pública

A rota raiz `/lilyacai/` deixou de redirecionar para o cardápio e passou a apresentar:

- identidade CookLily;
- proposta de entrada na lista;
- telefone;
- consentimento explícito e não pré-marcado;
- aviso de privacidade;
- estados de envio, sucesso e erro;
- honeypot antiabuso;
- acesso ao cardápio;
- acompanhamento P0 no WhatsApp;
- transparência da parceria CookLily × Carro Chefe.

A copy não promete percentual de desconto, cupom específico, escassez nem prazo inexistente.

### Lead sem conta

Novo modelo `LilyMarketingLead` no banco Lily:

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

O telefone não entra em analytics nem no banco do Carro Chefe.

### API

```text
POST /api/v1/lily/public/leads
```

Regras:

- Zod;
- normalização BR do telefone;
- `marketingConsent: true` obrigatório;
- versões de marketing e privacidade obrigatórias;
- rate limit de 8/min;
- honeypot;
- índice único por telefone;
- repetição atualiza consentimento/atribuição sem criar segunda linha;
- resposta igual para telefone novo/repetido;
- `Cache-Control: no-store`.

### Tracking

Aceita `la_qr`/ `cc_qr`, `la_campaign`/ `cc_campaign` e `la_variant`/ `cc_variant`. O namespace `la_*` tem precedência e o banco persiste somente `laQr`, `laCampaign` e `laVariant`.

### WhatsApp

Número oficial: `+55 67 99928-9187`.

O P0 abre conversa com mensagem genérica de acompanhamento. Nome, telefone, endereço e total não são colocados na URL. Automação de status por WhatsApp permanece fora do P0.

### Nginx preparado

O template passou a liberar explicitamente `/api/v1/lily/public/*` antes do bloqueio genérico de `/api/`. Auth e admin continuam bloqueados no P0 público.

## Migração

Criada:

```text
packages/lily-database/prisma/migrations/20260924143000_lily_marketing_leads/migration.sql
```

A migração só deve ser aplicada em produção depois de backup do banco Lily.

## Testes específicos

- lead válido persiste;
- opt-in explícito obrigatório;
- telefone inválido rejeitado;
- `cc_*` normaliza para `la*`;
- `la_*` vence quando coexistem;
- repetição não duplica;
- resposta não revela histórico;
- honeypot não persiste PII;
- regressão da autenticação Lily permanece coberta.

## Evidência

- preflight frontend/API/database: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36012876471 — **success**;
- primeira rodada de CI no commit `6d01a6d5e47c88ab846e0bf281cba62c09508724`: detectou uma expectativa incorreta do teste de telefone inválido; a implementação estava rejeitando corretamente e o teste foi corrigido;
- CodeQL após a correção: https://github.com/victorgabriel2v6g8m4s-cmd/carro-chefe/actions/runs/36013416649 — **success**;
- CI final do head limpo será registrado após a remoção dos artefatos temporários de preflight.

## Não executado

- deploy na VPS;
- migration no banco real;
- `nginx -t` na VPS;
- restart do serviço;
- smoke externo por HTTPS;
- QA visual em dispositivos físicos;
- API WhatsApp Business, pois o P0 é atendimento humano por link.

## Publicação

Nenhum deploy foi executado. A publicação exige autorização explícita para o SHA final e segue `docs/lily-acai/DEPLOY_VPS.md`.

## Próxima entrega

**Entrega 05 — catálogo, mídia, painel administrativo e cardápio dinâmico.**

A sequência aprovada prevê primeiro publicar e estabilizar esta landing antes da publicação da Entrega 05.
