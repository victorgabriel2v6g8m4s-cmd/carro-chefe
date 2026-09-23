# Roadmap oficial — Lily Gourmet

**Aprovado para planejamento:** 23/09/2026  
**Branch exclusiva:** `lily-acai`  
**Nome público:** Lily Gourmet  
**Namespaces técnicos preservados:** `lily-acai`, `/lilyacai/`, `/api/v1/lily/`.

## Objetivo

Colocar a marca oficial e uma presença pública simples no ar antes do checkout completo, e depois ativar um catálogo administrável que alimente automaticamente o cardápio.

Este documento não autoriza publicação por si só. Cada deploy exige autorização explícita para o SHA exato.

## Entrega 03 — logo, kit e rebranding

Resultado:

- logo oficial preservada no Git como original;
- derivados web documentados;
- kit com paleta, tipografia, usos da logo, linguagem visual, fotografia, componentes e acessibilidade;
- tokens UI centralizados;
- frontend inteiro convertido ao padrão Lily Gourmet;
- nenhuma aparência herdada do Carro Chefe;
- sem deploy nesta entrega.

A logo oficial ainda não existe no repositório em 23/09/2026. Não inventar ativo, cor, fonte ou proporção.

## Entrega 04 — landing, leads, WhatsApp e primeira publicação

Resultado:

- landing mobile-first;
- telefone para receber cupons/promoções;
- consentimento específico de marketing;
- normalização/deduplicação server-side;
- atribuição `la_*` sem PII em analytics;
- CTA do WhatsApp oficial;
- acompanhamento P0 por conversa humana no WhatsApp;
- publicação em `carrochefe.com/lilyacai/`.

Atualizações automáticas de status por WhatsApp ficam fora do P0 até existir integração oficial, credenciais, templates e consentimento adequados.

## Entrega 05 — catálogo/admin e segunda publicação

Resultado:

- categorias, produtos, variantes, preços, mídia e adicionais administráveis;
- publicação e disponibilidade separadas;
- produto só aparece quando publicado/ativo e disponível;
- cardápio consumindo exclusivamente API Lily;
- pausa/indisponibilidade refletida sem editar código;
- segunda publicação controlada.

## Sequência posterior

- Entrega 06 — carrinho, endereço e criação de pedido;
- Entrega 07 — pagamento e reconciliação;
- Entrega 08 — painel de pedidos;
- Entrega 09 — tracking QR e analytics first-party;
- Entrega 10 — QA operacional, acessibilidade, observabilidade e hardening.

## Gates de publicação

Antes de deploy:

1. documentação da entrega atualizada;
2. preflight dos escopos alterados;
3. `npm run policy:check`;
4. `npm run check`;
5. `npm test`;
6. `npm run build`;
7. migrations testadas quando aplicável;
8. QA mobile/desktop/teclado/contraste;
9. backup e rollback revisados;
10. autorização explícita para o SHA.

## Infraestrutura de referência

Reutilizar:

- `deploy/README.md`;
- `docs/pre-lancamento/PLANO_HOSTINGER_VPS.md`;
- `docs/pre-lancamento/IMPLEMENTACAO_DEV.md`;
- runbook Lily: `docs/lily-acai/DEPLOY_VPS.md`.
