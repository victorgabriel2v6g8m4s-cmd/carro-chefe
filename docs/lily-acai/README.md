# Lily Açaí — operação temporária

## Escopo e fronteira

A Lily Açaí é uma operação temporária para geração de caixa antes da inauguração do Carro Chefe. Ela **não faz parte da proposta permanente do Carro Chefe**, não deve ser documentada na `main` e não deve ser tratada como uma nova vertical da marca.

A operação compartilha somente infraestrutura já existente por economia:

- domínio: `carrochefe.com`;
- VPS;
- Nginx/TLS;
- processo/runtime Node quando isso reduzir risco e tempo de implantação.

Todo o restante deve permanecer logicamente separado: identidade visual, aplicação, autenticação, banco transacional, clientes, catálogo, pedidos, pagamentos, tracking, mídia e documentação.

## Endereço público planejado

- cardápio: `https://carrochefe.com/lilyacai/cardapio`;
- raiz da operação: `https://carrochefe.com/lilyacai/`;
- painel interno: `https://carrochefe.com/lilyacai/painel/`.

## Identidade

A identidade da Lily deve ser rosa/roxa e não reutilizar tokens, logotipo, ornamentos, madeira, preto/bronze/ouro, tipografia temática ou linguagem visual do Carro Chefe.

A parceria deve ser transparente, porém discreta e textual, por exemplo no rodapé e nos termos:

> Lily Açaí × Carro Chefe — parceria temporária. Esta experiência usa a infraestrutura digital do Carro Chefe, mas possui cadastro, cardápio e operação próprios.

Não usar a marca Carro Chefe como selo visual dominante.

## Canais informados

- Instagram: `@acai._lily`
- WhatsApp: `+55 67 99928-9187`

## Regras de isolamento

1. Todo código e toda documentação da Lily vivem somente na branch `lily-acai`.
2. Não alterar a narrativa institucional do Carro Chefe para incorporar Lily Açaí.
3. Não compartilhar tabela de usuários, sessão, endereços, pedidos ou pagamentos com o Carro Chefe.
4. Consentimento de compartilhamento de dados com o Carro Chefe deve ser separado, explícito, versionado e revogável.
5. Comprar na Lily não pode depender de aceitar marketing ou compartilhamento com o Carro Chefe.
6. Tracking da Lily usa a mesma metodologia first-party do Carro Chefe, mas com namespace, manifesto e armazenamento próprios.
7. Produtos, fotos, preços, adicionais e taxas ainda não aprovados devem permanecer como conteúdo de demonstração/draft e nunca ser apresentados como oferta real.
8. Dados de cartão nunca são armazenados pela aplicação.
9. Toda alteração futura deve atualizar a documentação desta pasta antes ou junto da implementação.

## Documentos

- `PLANO_24H.md` — arquitetura e sequência de execução.
- próximos documentos previstos: `ARQUITETURA.md`, `MODELO_DADOS.md`, `SEGURANCA_PRIVACIDADE.md`, `DEPLOY.md`, `TESTES.md` e `DECISOES_PENDENCIAS.md`.

## Status atual

Planejamento iniciado em 19/09/2026. Não há produtos, sabores, preços, fotos reais, política de entrega, credenciais de pagamento ou dados operacionais aprovados nesta documentação.
