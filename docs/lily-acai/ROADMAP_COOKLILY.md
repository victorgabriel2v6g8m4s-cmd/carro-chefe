# Roadmap oficial — CookLily

**Nome público definitivo:** CookLily  
**Wordmark oficial:** cookLily  
**Branch exclusiva:** `lily-acai`  
**Namespaces técnicos preservados:** `/lilyacai/`, `/api/v1/lily/`, `lily-acai.db`.

## Entrega 03 — marca e rebranding

- logo e acervo inicial catalogados;
- nome CookLily definitivo;
- tokens de cor aprovados;
- tema web centralizado;
- frontend migrado para o padrão CookLily;
- aliases de tracking documentados e testados;
- nenhuma publicação.

## Entrega 04 — landing, leads, WhatsApp e primeira publicação

- landing mobile-first;
- telefone para cupons/promoções;
- consentimento explícito;
- entrada aceita `la_*` e legado `cc_*`;
- persistência canônica somente em campos `la*`;
- CTA/acompanhamento P0 via WhatsApp;
- deploy controlado por SHA.

## Entrega 05 — catálogo/admin e segunda publicação

- categorias, produtos, variantes, preços, mídia e adicionais;
- publicação e disponibilidade separadas;
- cardápio consumindo somente API CookLily;
- alteração administrativa refletida sem rebuild;
- segunda publicação controlada.

## Posterior

- Entrega 06 — carrinho, endereço e pedido;
- Entrega 07 — pagamento;
- Entrega 08 — painel de pedidos;
- Entrega 09 — QR e analytics first-party;
- Entrega 10 — QA, observabilidade e hardening.

Cada deploy exige gates completos, backup/rollback e autorização explícita para o SHA exato.
