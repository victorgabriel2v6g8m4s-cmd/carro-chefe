# Produto e cardápio

Este documento converte o rascunho em uma arquitetura cadastrável no ERP. IDs são preliminares, porém, uma vez usados em produção, não devem ser reutilizados.

## Produtos-base

| ID | Família | Nome | Estrutura inicial |
|---|---|---|---|
| `PROD-ESP-BOV` | Espeto | Espeto de carne bovina | um espeto; corte/gramatura pendentes |
| `PROD-ESP-FRA` | Espeto | Espeto de frango | um espeto; gramatura pendente |
| `PROD-ESP-MED` | Espeto | Medalhão de frango | um espeto; composição pendente |
| `PROD-ESP-LIN` | Espeto | Espeto de linguiça | confirmar se “Seara” será marca comunicada |
| `PROD-ESP-COA` | Espeto | Espeto de queijo coalho | confirmar unidade/gramatura |
| `PROD-COM-001` | Refeição | Espeto Completo | arroz, vinagrete, mandioca, farofa, espeto e queijo coalho |
| `PROD-CCS-001` | Sanduíche | Carro‑Chefe Simples | baguete 15 cm, gergelim, maionese e um espeto |
| `PROD-CCC-001` | Sanduíche | Carro‑Chefe com Cheddar | Simples mais cheddar |
| `PROD-CHF-001` | Sanduíche | Chefão | baguete 30 cm, dois espetos, cheddar, salada, cebola-roxa e batata palha |

Bebidas receberão IDs após definição de marcas, volumes, sabores, teor alcoólico e forma de controle de estoque.

## Grupos de modificadores

| ID | Grupo | Regra |
|---|---|---|
| `MOD-ESP-1` | Escolha um espeto | exatamente 1; Simples, Cheddar e Completo |
| `MOD-ESP-2` | Escolha dois espetos | exatamente 2; permitir repetição somente após decisão |
| `MOD-GRATIS-2` | Até dois adicionais grátis | 0 a 2 entre picles, requeijão, barbecue e maionese de bacon |
| `MOD-PAGO` | Adicionais pagos | 0 a N; preço, limite e impacto de estoque por opção |
| `MOD-REMOVER` | Remover ingredientes | sem desconto; registrar para cozinha e analytics |
| `MOD-PONTO` | Ponto da carne | só habilitar se operação garantir execução e segurança |

## Estratégia aprovada de cardápio e canais — 17/09/2026

O cardápio inicial será deliberadamente enxuto no material físico: poucas combinações de lanches e espetos, com uma opção visualmente destacada para **montar um lanche personalizado**.

A personalização não precisa ser espremida no cardápio impresso. O material físico deve funcionar como porta de entrada: a opção destacada aponta por QR Code para uma experiência digital mobile-first, simples e rápida, capaz de aplicar as mesmas regras de modificadores, disponibilidade e preço usadas pelos demais canais.

Também está aprovado que:

- cada mesa terá um QR próprio para o cardápio digital;
- o QR da personalização no cardápio físico terá origem rastreável;
- o cardápio digital por mesa terá origem rastreável e estado da mesa consultado no momento do scan;
- o totem de autoatendimento terá origem rastreável sem exigir login;
- conta/cadastro no totem serão opcionais;
- a atribuição deve distinguir aquisição, entrada do pedido e superfície de conversão;
- a operação não deve inventar identidade cross-device quando não houver vínculo confiável.

### Experiência esperada do cliente

```text
CARDÁPIO FÍSICO
├── poucas combinações prontas de lanches
├── poucos espetos/combinações principais
└── destaque: MONTE SEU LANCHE
    └── QR → construtor digital

MESA
└── QR próprio → cardápio digital

TOTEM
└── cardápio/pedido sem login obrigatório

ONLINE
└── cardápio e construtor com origem própria
```

### Regras comerciais de origem

- QR de personalização vindo do material físico: origem `physical_menu_custom_qr`;
- QR de mesa sem pedido aberto: `table_qr_digital_first`;
- QR de mesa com pedido aberto: `table_qr_after_order`;
- totem sem evidência anterior vinculável na visita: `kiosk_direct`;
- totem com vínculo confiável a um QR anterior: `kiosk_after_qr`;
- construtor iniciado online sem QR físico: `online_custom_builder`.

Essas classificações são regras de atribuição, não prova absoluta do comportamento visual da pessoa. Por exemplo, `table_qr_digital_first` significa que não havia pedido aberto naquela mesa quando o QR foi lido; não permite afirmar que o cliente nunca viu o cardápio físico.

### Requisitos do construtor personalizado

A primeira versão deve priorizar velocidade de decisão:

- abrir diretamente a montagem quando o QR dedicado for lido;
- funcionar bem em celular e rede móvel;
- usar controles grandes e linguagem simples;
- apresentar regras e limites de modificadores sem ambiguidade;
- atualizar preço quando aplicável;
- permitir revisão antes de confirmar;
- preservar escolhas ao voltar uma etapa;
- não exigir criação de conta;
- medir início, conclusão e abandono sem enviar PII a analytics.

O contrato técnico completo de tracking, modelo de atribuição, privacidade, eventos, fases de implementação e testes está em [`../tecnologia/ATRIBUICAO_OMNICANAL.md`](../tecnologia/ATRIBUICAO_OMNICANAL.md).

## Decisões necessárias antes do cadastro final

- corte e gramatura da carne bovina;
- gramatura de todos os espetos e pães;
- composição/marca do medalhão e linguiça;
- se queijo coalho do Espeto Completo é parte do espeto ou porção adicional;
- se dois espetos do Chefão podem ser iguais;
- quantidade/gramatura de cada adicional;
- diferença entre “parmesão” e “queijo ralado” no estoque;
- marca do requeijão cremoso e uso permitido do nome Catupiry;
- política de remoções e substituições;
- níveis de cocção oferecidos;
- itens vendidos isoladamente e combos com bebida;
- disponibilidade e controle de cervejas.

## Ficha técnica mínima

Cada produto e modificador exige:

- ingredientes com ID, unidade e quantidade bruta/líquida;
- rendimento e fator de correção;
- perda esperada e destino de sobra;
- custo atualizado e fonte da última compra;
- embalagem, etiqueta e consumíveis;
- tempo de parrilla, montagem e total;
- estação responsável e utensílios;
- alérgenos e risco de contato cruzado;
- temperatura/condição de armazenamento;
- fotografia de referência da montagem;
- preço, CMV e margem aprovados;
- disponibilidade por canal e horário.

## Engenharia de cardápio

Após 30 dias, classificar cada item por popularidade e margem, sem usar apenas faturamento:

- **estrela:** alta popularidade e alta margem — destacar;
- **cavalo de batalha:** alta popularidade e baixa margem — revisar custo/porção;
- **quebra-cabeça:** baixa popularidade e alta margem — testar foto/nome/posição;
- **abacaxi:** baixa popularidade e baixa margem — simplificar ou retirar sem reutilizar o ID.

## Padrão fotográfico

- produto real e porção vendida, sem ingredientes ausentes ou exagerados;
- ângulo principal consistente, luz quente, textura de madeira/metal e contraste alto;
- versão 4:5 para feed, 9:16 para stories/reels, 1:1 para catálogo e horizontal para site;
- uma foto limpa e uma foto contextual por item principal;
- nome do arquivo: `AAAA-MM-DD_produto_formato_versao_autor.ext`;
- aprovação de Marca e Operações antes da publicação.

## Referência fotográfica real — Chefão

Em 11/09/2026 foi recebido um conjunto de **10 fotografias sem edição** do Chefão, cobrindo vistas frontais, três quartos, superior/lateral e variações de montagem com maior presença de molho cheddar. O catálogo, metadados, hashes e regras de preservação ficam em [`mídias/produtos/chefao/README.md`](../../mídias/produtos/chefao/README.md).

Em 14/09/2026 o proprietário decidiu que os 10 JPEGs não são requisito para a consolidação atual do repositório. A documentação pode permanecer como referência mesmo sem os binários versionados; caso sejam incorporados futuramente, devem ser preservados como originais e validados pelos hashes documentados.

Essas imagens têm status `review`: servem como referência real de montagem e proporção, mas não constituem automaticamente o padrão publicitário aprovado. Originais e derivados efetivamente utilizados devem passar por inspeção visual e revisão de Marca/Marketing e Operações antes da publicação.