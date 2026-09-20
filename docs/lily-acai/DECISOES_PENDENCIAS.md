# Decisões e pendências — Lily Açaí

Este arquivo pertence somente à branch `lily-acai`. Ele não deve ser copiado para a documentação da `main`.

## Confirmado pelo proprietário

- operação temporária para levantar fundos antes da inauguração do Carro Chefe;
- mesma VPS e mesmo domínio por economia;
- rota pública sob `carrochefe.com/lilyacai/`;
- identidade rosa/roxa sem correspondência visual com Carro Chefe;
- parceria Lily Açaí × Carro Chefe deve ser transparente;
- documentação e código apenas na branch Lily;
- Instagram `@acai._lily`;
- WhatsApp `+55 67 99928-9187`;
- login independente;
- consentimento de compartilhamento de informações;
- catálogo com adicionais;
- endereços de entrega salvos;
- pagamento;
- painel com separação entre retirada/balcão e entrega;
- histórico para ofertas futuras;
- tracking de QR equivalente em lógica ao Carro Chefe;
- conteúdo/fotos provisórios até existirem produtos reais;
- ferramenta de administração de produtos, capas, mídias, descrições e adicionais.

## Decisões de arquitetura adotadas para o P0

- banco Lily separado;
- prefixo API `/api/v1/lily`;
- app Vite separado;
- namespace de tracking `la_qr`, `la_campaign`, `la_variant`;
- IDs de QR `LILY-QR-*`;
- consentimentos separados por finalidade;
- compartilhamento com Carro Chefe opcional, nunca condição de compra;
- Checkout Pro do Mercado Pago como primeira integração recomendada, condicionado a credenciais;
- conteúdo provisório permanece `draft` até publicação explícita;
- pagamentos confirmados apenas pelo backend/webhook.

## Pendências obrigatórias antes da venda real

| ID | Tema | Informação necessária | Impacto |
|---|---|---|---|
| LILY-PEND-001 | Catálogo | sabores/produtos reais | impede publicação real |
| LILY-PEND-002 | Preços | preço por produto/tamanho | impede checkout real |
| LILY-PEND-003 | Adicionais | lista e preços | impede configuração final |
| LILY-PEND-004 | Entrega | bairros/CEPs atendidos e taxas | impede cálculo final |
| LILY-PEND-005 | Retirada | regra/local/horário de retirada | impede comunicação final |
| LILY-PEND-006 | Pagamento | conta e credenciais do Mercado Pago | impede confirmação automática |
| LILY-PEND-007 | Jurídico | identificação do controlador/contato de privacidade | impede política definitiva |
| LILY-PEND-008 | Retenção | prazos para conta, endereço, pedidos, logs e tracking | política provisória apenas |
| LILY-PEND-009 | Marketing | regra de ofertas e frequência de contato | impede automação de CRM |
| LILY-PEND-010 | Admin | criação segura da primeira conta staff | bloqueia painel em produção |
| LILY-PEND-011 | Mídia | fotos reais e identidade final | conteúdo provisório permanece |
| LILY-PEND-012 | Operação | horários/disponibilidade/capacidade | impede promessas públicas |

## Regra para informações ainda ausentes

O sistema deve transformar decisões pendentes em configurações administráveis sempre que isso reduzir retrabalho, mas não deve preencher valores reais por suposição.
