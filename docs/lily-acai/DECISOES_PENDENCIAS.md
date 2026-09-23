# Decisões e pendências — Lily Gourmet

Este arquivo pertence somente à branch `lily-acai`.

## Confirmado pelo proprietário

- nome público: **Lily Gourmet**;
- namespaces técnicos atuais permanecem por compatibilidade;
- logo oficial será versionada e originará o kit de marca;
- site inteiro seguirá o kit antes da primeira publicação Lily;
- landing captará telefone para cupons/promoções;
- acompanhamento P0 será pelo WhatsApp oficial;
- painel de produtos alimentará automaticamente o cardápio;
- somente itens publicados/ativos e disponíveis aparecem;
- mesma VPS Hostinger e domínio por economia;
- Instagram `@acai._lily`;
- WhatsApp `+55 67 99928-9187`;
- banco/autenticação/dados permanecem separados do Carro Chefe.

## Arquitetura confirmada

- banco Lily separado;
- API `/api/v1/lily`;
- Vite separado;
- tracking `la_qr`, `la_campaign`, `la_variant`;
- lead promocional não exige senha;
- telefone nunca entra em analytics;
- publicação e disponibilidade são controles distintos;
- deploy por SHA aprovado da `lily-acai`;
- conteúdo provisório permanece draft.

## Pendências

| ID | Tema | Informação necessária | Impacto |
|---|---|---|---|
| LILY-PEND-001 | Logo | **resolvida em 23/09/2026:** arquivo raster oficial recebido e catalogado como `LG-MARCA-001` | não bloqueia mais o acervo; naming ainda exige decisão |
| LILY-PEND-002 | Marca | aprovação de paleta/tipografia | bloqueia rebranding final |
| LILY-PEND-003 | Landing | copy final de cupons/promoções | bloqueia texto definitivo |
| LILY-PEND-004 | WhatsApp | confirmar P0 humano e futura automação | define integração futura |
| LILY-PEND-005 | Catálogo | produtos/sabores finais | bloqueia catálogo completo |
| LILY-PEND-006 | Preços | preço por produto/tamanho | bloqueia publicação |
| LILY-PEND-007 | Adicionais | lista e preços | bloqueia configuração final |
| LILY-PEND-008 | Admin | primeira conta staff segura | bloqueia painel produção |
| LILY-PEND-009 | Mídia | duas fotos reais iniciais já recebidas; ainda falta sessão/padrão final de fotografia e demais produtos | placeholders continuam possíveis onde não houver foto aprovada |
| LILY-PEND-010 | Operação | horários/disponibilidade/capacidade | bloqueia promessas |
| LILY-PEND-011 | Entrega | áreas/taxas | Entrega 06 |
| LILY-PEND-012 | Retirada | local/horário/regra | Entrega 06 |
| LILY-PEND-013 | Pagamento | credenciais do provedor | Entrega 07 |
| LILY-PEND-014 | Jurídico | controlador/contato de privacidade | política final |
| LILY-PEND-015 | Retenção | prazos de PII/logs | política final |
| LILY-PEND-016 | Marketing | frequência/política de envios | automação CRM |

| LILY-PEND-017 | Naming da marca | logo recebida contém `cookLily`, enquanto o nome público aprovado é `Lily Gourmet`; definir se o wordmark será mantido, adaptado ou substituído em derivado | bloqueia logo final/web/impresso |
| LILY-PEND-018 | Foto morango | reenviar a foto de morango com nome de arquivo único para preservar bytes, dimensões e SHA-256 | bloqueia incorporação binária canônica dessa mídia |

## Regra

Nunca preencher informação real ausente por suposição. Tornar configurável quando isso reduzir retrabalho.
