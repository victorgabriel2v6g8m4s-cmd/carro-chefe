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
| `PROD-CCS-001` | Sanduíche | Carro‑Chefe Simples | baguete 15 cm com gergelim, pão umedecido com caldo do vinagrete e um espeto escolhido |
| `PROD-CCC-001` | Sanduíche | Brasa Dourada | baguete 15 cm com gergelim, pão umedecido com caldo do vinagrete, um espeto, cheddar, cebola-roxa tostada na parrilla, barbecue, batata palha e queijo de cobertura maçaricado; tipo e gramaturas do queijo a validar |
| `PROD-CHF-001` | Sanduíche | Chefão | baguete 30 cm, pão umedecido com caldo do vinagrete, dois espetos, cheddar, tomate, cebola-roxa e batata palha; sem alface |

O nome **Brasa Dourada** substitui o nome anterior **Carro‑Chefe Brasa Dourada**, que por sua vez já havia substituído **Carro‑Chefe com Cheddar**. O ID `PROD-CCC-001` é preservado para rastreabilidade e para não romper histórico, estoque ou relatórios.

**Alface não integra mais nenhum lanche aprovado.** Referências históricas em snapshots financeiros, código ou materiais legados não alteram esta fonte canônica e devem ser sincronizadas em mudanças de implementação próprias.

Bebidas receberão IDs após definição de marcas, volumes, sabores, teor alcoólico e forma de controle de estoque.

## Grupos de modificadores

| ID | Grupo | Regra |
|---|---|---|
| `MOD-ESP-1` | Escolha um espeto | exatamente 1; Simples, Brasa Dourada e Completo |
| `MOD-ESP-2` | Escolha dois espetos | exatamente 2; permitir repetição somente após decisão |
| `MOD-MOLHO-LIVRE` | Molhos à vontade | cliente pode escolher livremente entre os molhos aprovados na finalização; sem cobrança adicional enquanto a política estiver vigente |
| `MOD-GRATIS-2` | Até dois adicionais grátis | política anterior preservada; opções não-molho e regras finais precisam ser reconciliadas com a nova estação de molhos. Molhos de `MOD-MOLHO-LIVRE` não consomem uma das duas escolhas |
| `MOD-PAGO` | Adicionais pagos | 0 a N; preço, limite e impacto de estoque por opção |
| `MOD-REMOVER` | Remover ingredientes | sem desconto; registrar para cozinha e analytics |
| `MOD-PONTO` | Ponto da carne | só habilitar se operação garantir execução e segurança |

## Sistema aprovado de molhos

### Molhos à vontade — caseiros

Aprovados até 17/09/2026:

- supreme;
- cebola agridoce;
- maionese de bacon;
- molho verde;
- chipotle;
- parmesão;
- maionese temperada;
- molho rosé;
- molho de picles agridoce.

### Molhos à vontade — não caseiros

- barbecue.

Esses molhos pertencem à **finalização do lanche**. O produto é montado na hora diante do cliente e, no fim da montagem, o cliente pode escolher os molhos aprovados para adicionar ao lanche. A forma física de dispensação, utensílio, recipiente, reposição e controle sanitário deve ser validada operacionalmente antes da abertura, sem limitar a escolha de sabores aprovada aqui.

### Molhos de pimenta — categoria separada

Os molhos de pimenta vistos nas fotografias do projeto **não fazem parte do grupo de molhos à vontade da montagem**. Eles ficam no balcão como condimento separado: o cliente escolhe a pimenta que preferir e aplica diretamente no espeto ou no lanche.

Consequências:

- pimenta não deve aparecer em telas/listas como escolha de `MOD-MOLHO-LIVRE`;
- disponibilidade de pimentas no balcão não altera a composição padrão dos produtos;
- estoque, identificação e higiene dos frascos de pimenta devem ser controlados como itens de balcão;
- nenhuma pimenta é considerada ingrediente obrigatório de receita.

## Princípio de montagem ao vivo

Os lanches são preparados **na hora e na frente do cliente** sempre que o fluxo físico permitir. O preparo visível é parte da experiência de marca: espeto sai da parrilla, pão é finalizado, ingredientes são montados e a escolha de molhos encerra o ritual.

A sequência deve minimizar espera, retrabalho e perda de textura. Gramaturas, tempos, temperaturas e pontos exatos que ainda não foram aprovados permanecem pendentes de ficha técnica e homologação operacional.

### Regra do pão — caldo do vinagrete

A maionese deixa de ser aplicada como base padrão no pão. Em todos os lanches, o pão deve ser **umedecido com o caldo do vinagrete**, em quantidade padronizada suficiente para sabor e umidade sem encharcar ou romper a estrutura.

Objetivos aprovados:

- aproveitar um componente já existente na operação;
- eliminar o custo da maionese usada especificamente como base do pão;
- criar uma assinatura de sabor comum aos lanches;
- manter a possibilidade de o cliente escolher maioneses e outros molhos apenas na etapa final de molhos à vontade.

A ficha técnica deve definir volume por tamanho de pão, utensílio de aplicação, drenagem/filtragem necessária, tempo máximo entre aplicação e entrega e critério visual de pão excessivamente úmido.

## Método de preparo e sequência de montagem

### Espeto bovino — `PROD-ESP-BOV`

1. receber comanda e confirmar tipo/ponto somente se a opção de ponto estiver operacionalmente liberada;
2. levar o espeto à parrilla seguindo a sequência de produção;
3. concluir cocção conforme padrão de segurança e ficha técnica ainda a homologar;
4. retirar, conferir visualmente e direcionar imediatamente ao destino da comanda;
5. se vendido sozinho, entregar como espeto e disponibilizar pimentas de balcão separadamente;
6. se destinado a lanche ou Completo, encaminhar sem descanso excessivo para a montagem correspondente.

### Espeto de frango — `PROD-ESP-FRA`

1. identificar a comanda e manter fluxo separado de produto cru/pronto;
2. cozinhar na parrilla pelo padrão de segurança homologado para frango;
3. conferir cocção e integridade;
4. encaminhar imediatamente para venda avulsa, lanche ou Espeto Completo;
5. pimentas permanecem opção de balcão, não ingrediente da receita.

### Medalhão de frango — `PROD-ESP-MED`

1. identificar a comanda e composição final do medalhão quando homologada;
2. levar à parrilla sem misturar utensílio de cru e pronto;
3. concluir cocção pelo padrão sanitário aprovado;
4. conferir estrutura e acabamento do medalhão;
5. encaminhar à montagem/entrega correspondente.

### Espeto de linguiça — `PROD-ESP-LIN`

1. confirmar o item da comanda;
2. assar na parrilla conforme ficha técnica futura;
3. verificar cocção e acabamento externo sem depender apenas de cor;
4. direcionar para venda avulsa, lanche ou Completo;
5. oferecer pimentas somente como condimento separado de balcão.

### Espeto de queijo coalho — `PROD-ESP-COA`

1. retirar da refrigeração/armazenamento conforme plano de segurança aprovado;
2. levar à parrilla e dourar preservando estrutura para não perder o produto entre grelhas;
3. virar/manusear pelo procedimento homologado;
4. retirar quando atingir o padrão visual definido;
5. servir avulso ou integrar o Espeto Completo conforme cadastro final.

### Carro‑Chefe Simples — `PROD-CCS-001`

1. iniciar o espeto escolhido na parrilla;
2. preparar a baguete de 15 cm e abrir sem separar completamente as metades, se esse corte for confirmado na homologação;
3. imediatamente antes de receber o recheio, umedecer o interior do pão com a quantidade padronizada de **caldo do vinagrete**;
4. retirar o espeto pronto e posicionar a proteína no pão conforme padrão fotográfico;
5. levar o lanche aberto à etapa de finalização diante do cliente;
6. perguntar/permitir que o cliente escolha os **molhos à vontade** aprovados e aplicá-los/dispensá-los conforme o procedimento operacional homologado;
7. fechar/acomodar o pão, conferir pedido e entregar;
8. molhos de pimenta não entram nessa etapa: permanecem disponíveis no balcão para aplicação pelo próprio cliente.

### Brasa Dourada — `PROD-CCC-001`

1. iniciar o espeto escolhido na parrilla;
2. durante o mesmo ciclo, preparar a cebola-roxa para tostagem na parrilla conforme procedimento e porção ainda a homologar;
3. preparar a baguete de 15 cm e umedecer o interior com a quantidade padronizada de **caldo do vinagrete** imediatamente antes da montagem;
4. posicionar o espeto pronto no pão;
5. adicionar cheddar, cebola-roxa tostada, barbecue e batata palha nas quantidades definidas pela ficha técnica;
6. posicionar o **queijo de cobertura** sobre a montagem; tipo, formato e gramatura permanecem pendentes;
7. **maçaricar o queijo de cobertura** até obter acabamento dourado padronizado, usando procedimento seguro que proteja pão, embalagem, cliente e demais ingredientes da chama/calor direto;
8. apresentar o lanche ainda aberto para a etapa de molhos à vontade; o cliente pode escolher os molhos aprovados, inclusive nenhum;
9. fechar/acomodar, conferir estabilidade da cobertura maçaricada e entregar;
10. pimentas permanecem no balcão, fora da montagem padrão.

O queijo maçaricado é elemento central da identidade visual **Dourada**; o padrão fotográfico deve mostrar douramento real obtido no produto servido, sem exagero cenográfico.

### Chefão — `PROD-CHF-001`

1. iniciar os dois espetos escolhidos na parrilla, respeitando a regra de repetição quando ela for decidida;
2. preparar a baguete de 30 cm e organizar a estação para receber duas proteínas sem atrasar a entrega;
3. imediatamente antes da montagem, umedecer o interior do pão com a quantidade padronizada de **caldo do vinagrete**;
4. posicionar os dois espetos/proteínas ao longo do comprimento do pão;
5. adicionar cheddar, tomate, cebola-roxa e batata palha conforme ficha técnica; **não adicionar alface**;
6. apresentar o lanche aberto para a etapa final de escolha dos molhos à vontade;
7. aplicar/disponibilizar os molhos escolhidos conforme procedimento homologado, sem transformar pimenta em molho da montagem;
8. fechar/acomodar preservando o comprimento, distribuição uniforme e aparência real do produto;
9. conferir dois espetos, remoções, adicionais e molhos antes de entregar;
10. cliente pode complementar com a pimenta preferida no balcão.

### Espeto Completo — `PROD-COM-001`

1. iniciar o espeto escolhido na parrilla;
2. porcionar arroz, mandioca e farofa conforme fichas técnicas, respeitando temperatura/armazenamento homologados;
3. porcionar o vinagrete sem comprometer a reserva de caldo usada na finalização dos pães; a produção deve definir como separar/medir o caldo sem deteriorar o vinagrete servido;
4. preparar o queijo coalho conforme a composição final aprovada do Completo;
5. retirar o espeto pronto e montar o prato/embalagem em posição padronizada;
6. adicionar arroz, vinagrete, mandioca, farofa e queijo coalho nas porções homologadas;
7. conferir a comanda e entregar;
8. pimentas ficam disponíveis no balcão para o cliente aplicar no espeto; os molhos à vontade dos lanches não entram automaticamente no Espeto Completo até decisão específica.

### Bebidas

Bebidas industrializadas devem ser retiradas do estoque correto, conferidas por marca/volume/sabor, entregues fechadas salvo procedimento aprovado diferente e vinculadas à mesma comanda. Sucos naturais exigirão método próprio depois que sabores, receita, volume e cadeia de frio forem aprovados.

## Estratégia aprovada de precificação e valor — Escada do Chefe

> **Status:** aprovada pelo proprietário em 17/09/2026 e revisada na mesma data.  
> **Objetivo:** atender simultaneamente quem prioriza preço baixo e quem procura uma experiência mais completa, aumentando ticket médio sem transformar o produto de entrada em uma escolha ruim nem usar descontos ou alegações artificiais.

A estratégia **Escada do Chefe** organiza os lanches principais em três degraus com papéis diferentes:

1. **Carro‑Chefe Simples — porta de entrada econômica:** deve comunicar que existe uma forma acessível de provar o produto principal da marca sem pagar por complementos que o cliente não quer.
2. **Brasa Dourada — ponte de sabor:** mantém formato de 15 cm e um espeto, com cheddar, cebola tostada, barbecue, batata palha e a assinatura visual do queijo maçaricado.
3. **Chefão — experiência completa:** concentra escala, presença visual, dois espetos, 30 cm e composição mais completa.

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
| Brasa Dourada | aproximadamente `1,30–1,45 × S` | degrau intermediário com maior valor percebido; recalcular após definir o queijo maçaricado |
| Chefão | aproximadamente `1,65–1,85 × S` | salto de experiência maior que o salto proporcional de preço |

Essas faixas são ponto de partida para planilha de cenários. Não devem ser publicadas nem transformadas em regra se a margem ficar abaixo do mínimo aprovado.

Princípios:

- o Simples precisa continuar **claramente mais barato em valor absoluto**;
- o Chefão deve, quando a economia unitária permitir, custar **menos que duas vezes o Simples**;
- a diferença entre Brasa Dourada e Chefão deve parecer pequena quando comparada à diferença de tamanho e quantidade de proteína;
- o custo do queijo maçaricado precisa entrar na ficha técnica do Brasa Dourada antes de aprovar sua faixa final;
- o preço do meio não deve ser uma armadilha deliberadamente ruim.

### Carro‑Chefe Simples — direção de apresentação

O Simples deve transmitir **essencial, direto e acessível**. A descrição deve destacar pão umedecido com caldo do vinagrete e espeto escolhido, sem tratar a retirada da maionese-base como perda de valor. O cliente continua podendo escolher maioneses e outros molhos aprovados na finalização.

### Brasa Dourada — direção de apresentação

**Nome aprovado:** **Brasa Dourada**.

O nome curto funciona como assinatura de produto. **Brasa** conecta a receita à parrilla; **Dourada** é reforçada fisicamente pelo queijo maçaricado visível no topo do lanche, além dos tons do cheddar e tostado. O produto deve parecer uma receita própria, e não um Simples acrescido de molho.

### Chefão — direção de valor percebido

O Chefão deve ser o herói visual da Escada do Chefe. A comunicação deve mostrar fatos de valor — **30 cm • 2 espetos • composição completa** — antes do preço. A retirada do alface deve ser refletida em fotografia, descrição e ficha técnica.

### Hierarquia visual recomendada no cardápio

```text
CARRO‑CHEFE SIMPLES      BRASA DOURADA              CHEFÃO
15 cm • 1 espeto         15 cm • 1 espeto           30 cm • 2 espetos
essencial da casa        QUEIJO MAÇARICADO           EXPERIÊNCIA COMPLETA
PREÇO VISÍVEL            BRASA + DOURADO             FOTO/HERO + BENEFÍCIOS
```

### Ticket médio e validação da Escada

- Simples: priorizar bebida e adicionais pagos coerentes depois da escolha;
- Brasa Dourada: bebida e comparação transparente com Chefão quando houver diferença real calculada;
- Chefão: bebida e acompanhamento/combinação somente após margem validada;
- molhos à vontade não são upsell enquanto permanecerem incluídos;
- personalização digital deve manter preço atualizado a cada modificação;
- combos só entram após cálculo de margem e não devem usar “economia” se a diferença não for real.

Acompanhar visualização, seleção, pagamento, mix dos três degraus, ticket, margem, taxa de bebida/adicional, consumo de molhos, abandono após preço, tempo de produção e recompra. Testes devem isolar variáveis sempre que possível.

Nenhum preço final é aprovado por esta estratégia. Antes da publicação: concluir fichas técnicas/gramaturas, calcular custo variável e margem, simular as faixas relativas, validar margem mínima, provar cardápio físico/digital, testar com clientes-piloto e aprovar preços finais com Gestão/Finanças.

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

Essas classificações são regras de atribuição, não prova absoluta do comportamento visual da pessoa.

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
- quantidade/gramatura de cada ingrediente e adicional;
- reconciliar a composição definitiva de `MOD-GRATIS-2` com a nova política de molhos à vontade, preservando que molhos livres não contam no limite de dois adicionais;
- tipo, formato e gramatura do queijo maçaricado do Brasa Dourada;
- quantidade padrão de caldo do vinagrete por pão e método de aplicação;
- procedimento/porção de cebola tostada do Brasa Dourada;
- fichas técnicas dos nove molhos caseiros aprovados;
- embalagem/recipiente, validade, rendimento e rotina de reposição de cada molho;
- catálogo de pimentas de balcão e regra de controle dos frascos;
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

Para molhos caseiros, incluir também receita por lote, rendimento, validade definida por procedimento tecnicamente validado, recipiente, identificação de lote e descarte. Para o caldo do vinagrete, registrar explicitamente o custo/volume aproveitado na receita dos lanches para evitar considerar a economia de maionese sem contabilizar o consumo real do vinagrete.

## Engenharia de cardápio

Após 30 dias, classificar cada item por popularidade e margem, sem usar apenas faturamento:

- **estrela:** alta popularidade e alta margem — destacar;
- **cavalo de batalha:** alta popularidade e baixa margem — revisar custo/porção;
- **quebra-cabeça:** baixa popularidade e alta margem — testar foto/nome/posição;
- **abacaxi:** baixa popularidade e baixa margem — simplificar ou retirar sem reutilizar o ID.

A Escada do Chefe deve ser revisada junto dessa análise. Medir também consumo médio de molho por pedido, custo real do queijo maçaricado, redução de custo com a retirada da maionese-base e impacto do caldo do vinagrete sobre perdas e rendimento.

## Padrão fotográfico

- produto real e porção vendida, sem ingredientes ausentes ou exagerados;
- **nenhum lanche deve ser fotografado/comunicado com alface**;
- Brasa Dourada deve mostrar o queijo realmente maçaricado e dourado no produto vendido;
- ângulo principal consistente, luz quente, textura de madeira/metal e contraste alto;
- versão 4:5 para feed, 9:16 para stories/reels, 1:1 para catálogo e horizontal para site;
- uma foto limpa e uma foto contextual por item principal;
- nome do arquivo: `AAAA-MM-DD_produto_formato_versao_autor.ext`;
- aprovação de Marca e Operações antes da publicação.

## Referência fotográfica real — Chefão

Em 11/09/2026 foi recebido um conjunto de **10 fotografias sem edição** do Chefão. Essas fotos são referência histórica da montagem observada naquele momento e podem conter elementos que foram alterados por decisões posteriores; a receita canônica atual é a deste documento.

O catálogo, metadados, hashes e regras de preservação ficam em [`mídias/produtos/chefao/README.md`](../../mídias/produtos/chefao/README.md). Em 14/09/2026 o proprietário decidiu que os JPEGs não são requisito para a consolidação atual do repositório.

Essas imagens têm status `review`: servem como referência real de forma e proporção, mas não substituem a composição aprovada nem constituem automaticamente padrão publicitário atual.