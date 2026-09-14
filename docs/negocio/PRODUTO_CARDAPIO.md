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

