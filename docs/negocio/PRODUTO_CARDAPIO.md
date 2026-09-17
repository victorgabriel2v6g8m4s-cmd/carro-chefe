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
| `PROD-CCC-001` | Sanduíche | Carro‑Chefe Brasa Dourada | baguete 15 cm, gergelim, maionese, um espeto, cheddar, cebola-roxa tostada na parrilla, barbecue e batata palha; gramaturas a validar |
| `PROD-CHF-001` | Sanduíche | Chefão | baguete 30 cm, dois espetos, cheddar, salada, cebola-roxa e batata palha |

O nome legado **Carro‑Chefe com Cheddar** fica aposentado para novas peças e cadastros. O ID `PROD-CCC-001` é preservado para rastreabilidade e para não criar troca desnecessária de identidade técnica antes do cadastro definitivo.

Bebidas receberão IDs após definição de marcas, volumes, sabores, teor alcoólico e forma de controle de estoque.

## Grupos de modificadores

| ID | Grupo | Regra |
|---|---|---|
| `MOD-ESP-1` | Escolha um espeto | exatamente 1; Simples, Brasa Dourada e Completo |
| `MOD-ESP-2` | Escolha dois espetos | exatamente 2; permitir repetição somente após decisão |
| `MOD-GRATIS-2` | Até dois adicionais grátis | 0 a 2 entre picles, requeijão, barbecue e maionese de bacon |
| `MOD-PAGO` | Adicionais pagos | 0 a N; preço, limite e impacto de estoque por opção |
| `MOD-REMOVER` | Remover ingredientes | sem desconto; registrar para cozinha e analytics |
| `MOD-PONTO` | Ponto da carne | só habilitar se operação garantir execução e segurança |

## Estratégia aprovada de precificação e valor — Escada do Chefe

> **Status:** aprovada pelo proprietário em 17/09/2026.  
> **Objetivo:** atender simultaneamente quem prioriza preço baixo e quem procura uma experiência mais completa, aumentando ticket médio sem transformar o produto de entrada em uma escolha ruim nem usar descontos ou alegações artificiais.

A estratégia **Escada do Chefe** organiza os lanches principais em três degraus com papéis diferentes:

1. **Carro‑Chefe Simples — porta de entrada econômica:** deve comunicar que existe uma forma acessível de provar o produto principal da marca sem pagar por complementos que o cliente não quer.
2. **Carro‑Chefe Brasa Dourada — ponte de sabor:** deve parecer uma receita própria, não “o Simples com cheddar”. Ele aumenta sofisticação, textura e assinatura de brasa mantendo o formato de 15 cm e um espeto.
3. **Chefão — experiência completa:** deve concentrar escala, presença visual, dois espetos, 30 cm e benefícios inclusos suficientes para que o aumento de preço pareça pequeno diante do aumento de experiência e quantidade.

A estratégia busca produzir duas leituras igualmente desejáveis:

- cliente sensível a preço: **“o Simples custa pouco para entrar nessa marca; vou nele”**;
- cliente orientado a experiência: **“por essa diferença, o Chefão entrega muito mais; vale a pena subir”**.

O Brasa Dourada existe entre os dois para oferecer uma opção legítima a quem quer mais sabor sem tamanho de Chefão e, ao mesmo tempo, tornar a comparação de valor entre os extremos mais clara.

### Arquitetura relativa de preço

Os valores abaixo são **relações de engenharia de cardápio**, não preços finais aprovados. Preço em reais só pode ser definido depois de ficha técnica, CMV, impostos, embalagem, perda, taxa de pagamento e margem mínima.

Use o preço do Simples como índice `1,00`:

| Produto | Faixa relativa inicial para simulação | Papel econômico |
|---|---:|---|
| Carro‑Chefe Simples | `1,00 × S` | menor barreira de entrada e referência de preço |
| Carro‑Chefe Brasa Dourada | aproximadamente `1,30–1,45 × S` | degrau intermediário com maior margem/valor percebido |
| Chefão | aproximadamente `1,65–1,85 × S` | salto de experiência maior que o salto proporcional de preço |

Essas faixas são ponto de partida para planilha de cenários. Não devem ser publicadas nem transformadas em regra se a margem ficar abaixo do mínimo aprovado.

Princípios:

- o Simples precisa continuar **claramente mais barato em valor absoluto**;
- o Chefão deve, quando a economia unitária permitir, custar **menos que duas vezes o Simples**, porque visualmente já entrega baguete de 30 cm, dois espetos e composição mais completa;
- a diferença de preço entre Brasa Dourada e Chefão deve parecer pequena quando comparada à diferença de tamanho, quantidade de proteína e inclusões;
- se a estrutura de custos não permitir essa relação com margem saudável, deve-se ajustar composição, porção ou benefícios antes de sacrificar margem;
- preço do meio não deve ser uma armadilha deliberadamente ruim: o Brasa Dourada precisa ser um produto que valha o que custa por si só.

### Carro‑Chefe Simples — direção de apresentação

O Simples não deve parecer “produto pobre”. A comunicação deve transmitir **essencial, direto e acessível**.

Direção:

- descrição curta: pão, maionese e o espeto escolhido;
- preço com leitura imediata e alto contraste;
- fotografia limpa, sem tentar simular volume inexistente;
- texto conceitual possível: **“O essencial do Carro‑Chefe.”**;
- evitar palavras como “básico demais”, “econômico inferior” ou qualquer comparação depreciativa;
- após a escolha, oferecer bebida ou adicional compatível como complemento opcional, sem esconder o preço final.

O papel do Simples é proteger conversão de clientes sensíveis a preço. Um cliente que escolhe o Simples não é uma conversão perdida para o Chefão; é uma entrada na marca que pode gerar bebida, adicional, recompra e futura migração de categoria.

### Carro‑Chefe Brasa Dourada — substituto aprovado do “com Cheddar”

**Nome aprovado:** **Carro‑Chefe Brasa Dourada**.

Conceito de composição:

- baguete de 15 cm com gergelim;
- maionese;
- um espeto escolhido;
- cheddar;
- cebola-roxa tostada na parrilla;
- barbecue;
- batata palha para crocância.

As gramaturas e a execução final ainda dependem de ficha técnica e teste operacional.

O nome **Brasa Dourada** comunica duas ideias sem depender de explicar “adicionamos cheddar”:

- **brasa:** conecta o lanche ao ritual da parrilla e ao diferencial sensorial da marca;
- **dourada:** remete ao cheddar, tostado e acabamento quente da receita.

A receita usa principalmente insumos já previstos no portfólio, reduzindo a necessidade de criar SKUs exclusivos apenas para o produto intermediário. A cebola tostada cria uma assinatura de preparo e deve ser testada quanto a tempo de estação, consistência e impacto na fila.

### Chefão — direção de valor percebido

O Chefão deve ser o herói visual da Escada do Chefe, mas não precisa esconder nem diminuir o Simples.

A comunicação deve mostrar os fatos que justificam o salto:

**30 cm • 2 espetos • composição completa • até 2 adicionais inclusos**, conforme regra final aprovada.

Direção:

- maior fotografia entre os três lanches;
- espaço visual superior ao Brasa Dourada e ao Simples;
- nome e medidas visíveis antes do preço;
- usar rótulos factuais como **“Experiência completa”** ou **“30 cm • 2 espetos”**;
- não usar “mais vendido”, “favorito” ou porcentagens de economia antes de existirem dados reais;
- não inventar preço riscado, promoção anterior ou urgência artificial;
- quando houver diferença de preço calculada em tempo real no digital, o sistema pode mostrar o benefício do upgrade de forma transparente, por exemplo indicando o que é acrescentado pelo valor adicional.

### Hierarquia visual recomendada no cardápio

A primeira leitura deve permitir comparar os três produtos sem esforço:

```text
CARRO‑CHEFE SIMPLES      BRASA DOURADA              CHEFÃO
15 cm • 1 espeto         15 cm • 1 espeto           30 cm • 2 espetos
essencial da casa        receita de brasa            EXPERIÊNCIA COMPLETA
PREÇO VISÍVEL            composição em destaque      FOTO/HERO + BENEFÍCIOS
```

Regras de design:

- manter os três produtos próximos para favorecer comparação;
- Simples com composição visual mais limpa e preço muito fácil de localizar;
- Brasa Dourada com tratamento bronze/brasa e foco nos ingredientes que justificam seu nome;
- Chefão com maior área, fotografia mais forte e detalhes dourados já compatíveis com a identidade;
- não aumentar artificialmente o tamanho tipográfico do preço do Chefão a ponto de ele parecer caro antes que os benefícios sejam lidos;
- no Chefão, apresentar primeiro os elementos quantitativos de valor e depois o preço;
- manter o CTA de **Monte seu lanche** separado da escada principal para não destruir a comparação rápida entre os produtos prontos.

### Ticket médio sem forçar upgrade

A estratégia deve aumentar ticket também dentro de cada degrau:

- **Simples:** priorizar bebida e um adicional coerente depois da escolha;
- **Brasa Dourada:** permitir comparação transparente com Chefão e oferecer bebida;
- **Chefão:** sugerir bebida e acompanhamentos quando existirem com margem validada;
- personalização digital deve manter preço atualizado a cada modificação;
- combos só entram após cálculo de margem e não devem usar “economia” se a diferença não for real.

### Métricas da Escada do Chefe

O C.O./ERP deve acompanhar, quando disponível:

- visualizações e seleção por produto;
- participação do Simples, Brasa Dourada e Chefão no mix;
- ticket médio e margem de contribuição por degrau;
- taxa de bebida/adicional por produto;
- migração entre produtos no fluxo digital antes de pagar;
- abandono após visualizar preço;
- taxa de personalização versus receitas prontas;
- tempo de produção do Brasa Dourada, especialmente por causa da cebola tostada;
- recompra por primeiro produto adquirido.

Após volume suficiente, testar isoladamente foto, ordem, descrição, badge e arquitetura de preço. Não mudar preço, foto e composição ao mesmo tempo em um teste, porque isso impede saber o que provocou a mudança.

### Critérios para aprovar preços finais

Nenhum preço final é aprovado por esta decisão. Antes da publicação:

1. concluir ficha técnica e gramaturas dos três lanches;
2. calcular custo variável completo e margem de contribuição;
3. simular a Escada do Chefe usando as faixas relativas acima;
4. validar que nenhum degrau destrói a margem mínima;
5. fazer prova de cardápio físico e digital;
6. executar teste com clientes-piloto sem promessas falsas;
7. aprovar preços finais com Gestão/Finanças.

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
- gramaturas finais e procedimento de cebola tostada do Brasa Dourada;
- diferença entre “parmesão” e “queijo ralado” no estoque;
- marca do requeijão cremoso e uso permitido do nome Catupiry;
- política de remoções e substituições;
- níveis de cocção oferecidos;
- itens vendidos isoladamente e combos com bebida;
- disponibilidade e controle de cervejas;
- preços finais e margens de cada degrau da Escada do Chefe.

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

A Escada do Chefe deve ser revisada junto dessa análise. Se o Brasa Dourada canibalizar Chefão sem melhorar margem, ou se o Chefão crescer em participação sem margem adequada, composição, preço e apresentação devem ser recalibrados com dados reais.

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
