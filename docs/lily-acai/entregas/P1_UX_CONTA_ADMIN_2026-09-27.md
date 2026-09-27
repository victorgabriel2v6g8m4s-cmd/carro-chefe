# Patch P1 — UX, conta e administração CookLily

**Data:** 27/09/2026  
**Branch:** `cooklily/canonical`  
**Runtime validado:** `a1176a444d6ab184ab75bdc30b5b0ee8449e05f0`  
**PR técnico:** #82, fechado sem merge.

## Entregue

- focus trap no drawer mobile, mantendo Escape e retorno de foco;
- alvos de toque críticos com mínimo de 44 × 44 px;
- página `/lilyacai/painel/configuracoes`;
- separação entre configurações gerais da loja e entrega/retirada;
- API `/api/v1/lily/admin/store-settings`;
- listagem das sessões da própria conta;
- ação explícita **Encerrar outras sessões**;
- deep-link compartilhável de produto em `/lilyacai/cardapio?produto=<slug>`;
- abertura do produto por slug mesmo quando ele não está na primeira página;
- fechamento do modal preservando busca e filtros.

## Configurações da loja

`/painel/entrega` fica restrito ao domínio de fulfillment: abertura de pedidos, retirada, entrega, horários, taxas e regiões.

`/painel/configuracoes` concentra canais públicos, endereço exibido ao cliente e regras de fidelidade.

As mutações continuam protegidas pelas regras administrativas da CookLily e são auditadas.

## Sessões

O perfil mostra sessões ativas da própria conta com datas de atividade/expiração e permite encerrar todas as outras sem desconectar a sessão atual.

A API não retorna credenciais ou hashes de sessão ao frontend.

## Deep-link de produto

O CTA de produto pode apontar diretamente para `?produto=<slug>`. O catálogo:

1. preserva os demais parâmetros da URL;
2. abre o produto já carregado quando possível;
3. busca o produto por slug quando necessário;
4. remove somente `produto` ao fechar o modal.

## Recuperação de senha

“Esqueci minha senha” continua aberto porque ainda não existe um canal de verificação de titularidade aprovado. Não foi criado um fluxo inseguro baseado apenas no telefone informado.

## Evidências

- CI `36334839141`: **success**;
- CodeQL `36334839168`: **success**;
- Node 20: **27 arquivos / 136 testes**;
- Node 24: **27 arquivos / 136 testes**;
- builds: **success**;
- Tool Health: **success**;
- Workbook Snapshot: **success**;
- Excel Recipe Linux/Windows: **success**;
- Windows Supervisor: **success**.

## QA real ainda necessária

- teclado/foco no drawer;
- ergonomia dos alvos de toque;
- Configurações da loja em 320/360/390/430/768 px;
- encerramento de sessões;
- link compartilhado/reload/voltar de produto;
- preservação de filtros ao abrir/fechar modal.

Nenhum deploy foi executado por este patch.
