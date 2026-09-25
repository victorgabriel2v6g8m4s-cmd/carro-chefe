# ADR-001 — Decisões aprovadas do cardápio inicial CookLily

**Data de fechamento:** 24/09/2026  
**Status geral:** FECHADO  
**Escopo:** cardápio inicial, produtos, naming, preços, adicionais, apresentação, catálogo, checkout e regras comerciais associadas.

## Legenda de autoria

- **Humano:** decisão definida diretamente pelo proprietário.
- **IA por delegação humana:** o proprietário autorizou explicitamente a IA a escolher a alternativa mais coerente e considerar a escolha definitiva.
- **Mista — Humano + IA por delegação:** o proprietário definiu o escopo/objetivo e a IA fechou nome, valor, regra ou implementação específica.

Este ADR preserva a origem de cada decisão para auditoria. A aprovação humana geral do fechamento do cardápio não altera a autoria original de uma decisão delegada à IA.

---

## Estrutura do cardápio

### 1. Qual será a estrutura principal do cardápio?

**Resposta:** Batidas de Açaí, LilyShakes e Doces. Doces entra inicialmente como “em breve”.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 2. Quais subcategorias o sistema deverá suportar?

**Resposta:** Simples, Com Nutella, Duo, Trio e Fitness, com arquitetura dinâmica para criar outras subcategorias pelo painel. Fitness é futura e não entra no lançamento.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 3. Qual será o nome definitivo do antigo “Milk-shake de Gelato Caseiro”?

**Resposta:** **LilyShake**. A categoria será **LilyShakes** e o descritor discreto será “Milk-shake de gelato caseiro”.

**Status:** ✅ DEFINITIVO  
**Decidido por:** IA por delegação humana

### 4. Qual é a proposta comercial do LilyShake?

**Resposta:** Base caseira exclusiva CookLily, extremamente cremosa e leve, saborizada no pedido, com frutas verdadeiras quando aplicável e produtos de marca quando nomeados.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 5. Como será tratada a alegação de exclusividade e conservantes?

**Resposta:** Não usar “único em Campo Grande” como alegação objetiva. Comunicar “base/receita exclusiva CookLily”. “Sem adição de conservantes” deve se referir à base preparada pela CookLily, não a todos os ingredientes industrializados da receita.

**Status:** ✅ DIRETRIZ DEFINITIVA DE COMUNICAÇÃO  
**Decidido por:** IA por aplicação técnica

### 6. Haverá uma futura linha Fitness?

**Resposta:** Sim. Será uma família própria com objetivo de desenvolver opções zero açúcares, zero lactose e 100% naturais, sujeitas à validação da formulação antes dessas alegações serem publicadas.

**Status:** 🟡 FUTURO DEFINIDO  
**Decidido por:** Humano

---

## Receita e operação do LilyShake

### 7. Qual é a receita inicial da base LilyShake?

**Resposta:** 800 g de creme de leite, 300 g de açúcar cristal, 750 ml de leite integral, 30 g de liga neutra e 10 g de Emustab. Rendimento conservador de 2,5 L.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 8. Qual é o processo de preparo da base?

**Resposta:** Diluir liga neutra e Emustab em parte do leite, adicionar os demais ingredientes, bater na batedeira por 15 minutos, levar ao freezer e, em cada pedido, bater a base congelada com o sabor, engarrafar e vender.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 9. Quanto tempo a base precisa congelar?

**Resposta:** Até aproximadamente 1h30, variando conforme o equipamento.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 10. Haverá temperatura exata obrigatória?

**Resposta:** Não nesta fase. O tempo operacional é ajustado ao equipamento de congelamento usado.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 11. Qual é a validade operacional inicial da base congelada?

**Resposta:** Aproximadamente duas semanas congelada.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 12. O rendimento poderá chegar a 3 L?

**Resposta:** Pode chegar temporariamente a aproximadamente 3 L se a base congelada for batida novamente, por incorporação de ar, mas o rendimento oficial de custo/estoque permanece 2,5 L.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 13. A produção do LilyShake será antecipada?

**Resposta:** A base é produzida em lote e a saborização é individual por pedido. Pode existir uma quantidade diária de pronta-entrega configurada pelo operador.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Nutella

### 14. Qual é a subreceita da mistura de Nutella?

**Resposta:** 375 g de Nutella original + 400 g de creme de leite, rendimento de aproximadamente 775 ml.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 15. Qual a dosagem de Nutella no LilyShake?

**Resposta:** 30 g no 300 ml e 50 g no 500 ml.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 16. Nutella continuará como adicional?

**Resposta:** Sim, inclusive em receitas simples e como extra em receitas que já levam Nutella, respeitando os limites de adicionais.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Batidas de Açaí

### 17. A receita atual das Batidas mudou?

**Resposta:** Não de forma definitiva. A versão atual continua válida enquanto são testadas melhorias de custo, rendimento e textura.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 18. Qual a nova referência de açaí?

**Resposta:** Polpa Norte/Origem, balde de 3,6 L. Para planejamento usar R$ 90 por balde até uma compra real substituir a referência.

**Status:** ✅ DEFINITIVO PARA TESTE/CUSTEIO  
**Decidido por:** Humano

### 19. Por que a marca anterior será substituída?

**Resposta:** Porque deixou a batida com aspecto aguado e percepção excessiva de gelo.

**Status:** ✅ REGISTRADO  
**Decidido por:** Humano

### 20. Quais testes serão feitos para melhorar a batida?

**Resposta:** Testar banana natural em baixa proporção, relações diferentes açaí/banana, ajuste de leite em pó, temperatura, tempo e velocidade de batimento, descanso antes do envase, liga neutra, Emustab, combinação dos dois, medição de rendimento, separação de fases, cristalização e teste cego de sabor/textura.

**Status:** ✅ PLANO DE TESTES DEFINIDO  
**Decidido por:** Mista — Humano + IA por delegação

### 21. Como será usado o mousse?

**Resposta:** Morango usa mousse de morango; maracujá usa mousse de maracujá. A quantidade de mousse é a mesma no 300 e no 500 ml.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 22. Quanto de Nutella entra nas Batidas com Nutella?

**Resposta:** Referência inicial de 50 g por garrafa em ambos os tamanhos, parametrizável para refinamento após teste.

**Status:** ✅ PADRÃO INICIAL  
**Decidido por:** IA por delegação humana

---

## Batidas — produtos, naming e preços

### 23. Quais serão as Batidas iniciais e seus preços?

**Resposta:**  
- **Rosa da Lily** — batida de açaí com mousse de morango: 300 ml R$ 15 / 500 ml R$ 25.  
- **Rosa Nutt** — morango + Nutella: 300 ml R$ 22 / 500 ml R$ 30.  
- **Sol da Lily** — maracujá: 300 ml R$ 15 / 500 ml R$ 25.  
- **Sol Nutt** — maracujá + Nutella: 300 ml R$ 22 / 500 ml R$ 30.  
- **Ninho Nutt** — Leite Ninho + Nutella: 300 ml R$ 25 / 500 ml R$ 35.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Mista — Humano definiu sabores; IA definiu naming e preços por delegação

### 24. Como os nomes aparecerão no cardápio?

**Resposta:** Nome próprio criativo em destaque e nome descritivo minimalista abaixo.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 25. Qual será o estilo das descrições?

**Resposta:** Amigáveis, apetitosas, claras e focadas na experiência real do sabor, como destacar o “toque azedinho” do maracujá quando pertinente.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Sabores do LilyShake

### 26. Quais sabores/componentes estarão disponíveis na inauguração?

**Resposta:** Café 3 Corações, morango, maracujá, doce de leite, frutas vermelhas, Oreo, banana, leite condensado, paçoca, Ovomaltine, Leite Ninho, Creme de Ninho e Nutella.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 27. Como será usado o morango?

**Resposta:** Natural e fresco, deixando pedaços perceptíveis.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 28. Como será usado o maracujá?

**Resposta:** Natural, incluindo sementes visíveis.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 29. Qual café será utilizado?

**Resposta:** Café solúvel 3 Corações, 6 g no 300 ml e 10 g no 500 ml.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## LilyMix

### 30. Todas as combinações terão cards separados?

**Resposta:** Não. O produto configurável **LilyMix** concentrará a personalização com o subtítulo “Monte seu LilyShake com até 3 sabores”, evitando centenas de SKUs/cards duplicados.

**Status:** ✅ DEFINITIVO  
**Decidido por:** IA por delegação humana

### 31. Quantos sabores podem ser misturados?

**Resposta:** Um, dois ou três sabores.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 32. Quais são os preços do LilyShake/LilyMix?

**Resposta:**  
- 1 sabor: 300 ml R$ 15 / 500 ml R$ 22.  
- 2 sabores: 300 ml R$ 18 / 500 ml R$ 25.  
- 3 sabores: 300 ml R$ 20 / 500 ml R$ 28.  
- Nutella na receita: + R$ 5.

**Status:** ✅ DEFINITIVO  
**Decidido por:** IA por delegação humana

### 33. Qualquer sabor poderá ser combinado com qualquer outro?

**Resposta:** Não. Haverá matriz de compatibilidade editável. Um trio só é válido quando todos os pares internos forem compatíveis.

**Status:** ✅ DEFINITIVO  
**Decidido por:** IA por delegação humana

### 34. Quais componentes terão maior compatibilidade?

**Resposta:** Nutella, Leite Ninho e Creme de Ninho são tratados como componentes de alta compatibilidade.

**Status:** ✅ PADRÃO INICIAL  
**Decidido por:** IA por delegação humana

### 35. Como serão calculadas as porções nas misturas?

**Resposta:** Um sabor usa 100% da porção padrão; Duo usa 60% da porção de cada sabor; Trio usa 45% de cada. A quantidade de base se ajusta para manter o volume nominal.

**Status:** ✅ PADRÃO INICIAL  
**Decidido por:** IA por delegação humana

---

## Adicionais

### 36. Os adicionais aparecerão no catálogo como produtos?

**Resposta:** Não. Eles aparecem apenas dentro da configuração do produto e cada produto possui sua lista de adicionais permitidos.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 37. Haverá adicionais gratuitos?

**Resposta:** Não inicialmente. Todos são pagos.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 38. Qual será o limite de adicionais?

**Resposta:** Até 3 tipos diferentes, máximo de 2 porções do mesmo adicional e máximo de 4 porções extras no total. Quando a receita já tiver Nutella, no máximo uma porção extra de Nutella.

**Status:** ✅ DEFINITIVO  
**Decidido por:** IA por delegação humana

### 39. Quais serão os adicionais e preços iniciais?

**Resposta:**  
- Nutella R$ 5  
- Creme de Ninho R$ 4  
- Leite Ninho R$ 3  
- Doce de leite R$ 4  
- Oreo R$ 3  
- Ovomaltine R$ 3  
- Paçoca R$ 2  
- Leite condensado R$ 2  
- Morango R$ 4  
- Maracujá R$ 3  
- Frutas vermelhas R$ 4  
- Banana R$ 2  
- Café extra R$ 2

**Status:** ✅ DEFINITIVO COMO TABELA INICIAL  
**Decidido por:** IA por delegação humana

### 40. O cliente poderá remover ingredientes?

**Resposta:** Não haverá botão sugestivo. O cliente poderá escrever a solicitação no campo de observações e o atendimento dependerá da possibilidade operacional.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 41. O cliente poderá pedir ingredientes extras pelas observações?

**Resposta:** Não. Aumentos de quantidade devem passar pelos adicionais pagos; observações não podem burlar cobrança.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 42. Haverá opção “menos doce”?

**Resposta:** Não nos produtos atuais. Essa necessidade será atendida futuramente pela linha Fitness, com receitas próprias.

**Status:** 🟡 FUTURO DEFINIDO  
**Decidido por:** Humano

---

## Preços, margem e mix

### 43. Qual será o estilo de preço?

**Resposta:** Produtos regulares usam preferencialmente valores redondos. Valores quebrados podem ser usados em campanhas/ofertas quando fizer sentido comercial.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 44. Existe margem mínima?

**Resposta:** Sim. Nenhum produto, oferta, combo ou cupom deve ser publicado com margem líquida projetada inferior a 10%, salvo decisão futura explícita do proprietário.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 45. Como será estruturado o mix de preços?

**Resposta:** Deve permitir produtos de entrada/tráfego, incentivo ao tamanho maior, premium, alta margem, ticket médio e campanhas para girar perecíveis.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Mista — objetivo humano, estrutura comercial consolidada pela IA

---

## Combos e destaque semanal

### 46. Quais combos permanentes entram inicialmente?

**Resposta:**  
- **Dupla Lily:** 2 LilyShakes simples de 500 ml, de R$ 44 por R$ 40.  
- **Trio Lily:** 3 LilyShakes simples de 300 ml, de R$ 45 por R$ 40.  
- **Dupla Açaí:** 2 Batidas simples de 500 ml, de R$ 50 por R$ 48.

**Status:** ✅ DEFINITIVO COMO COMBOS INICIAIS  
**Decidido por:** IA por delegação humana

### 47. Haverá Produto Destaque?

**Resposta:** Sim. Haverá um Produto Destaque por semana, escolhido com participação dos seguidores por comentários, enquetes e outras interações.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 48. O Destaque pode usar ingredientes fora do cardápio-base?

**Resposta:** Sim, desde que antes da publicação existam receita, custo, preço, margem mínima, disponibilidade e mídia/placeholder.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 49. O produto herói permanente já foi definido?

**Resposta:** Não, e isso não bloqueia a inauguração.

**Status:** 🟡 FUTURO NÃO BLOQUEANTE  
**Decidido por:** Humano

---

## Ofertas

### 50. Como as ofertas aparecerão?

**Resposta:** Como etiqueta no canto da capa, priorizando a economia em reais, por exemplo “R$ 5 OFF”.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 51. Poderá aparecer preço anterior riscado?

**Resposta:** Sim, desde que represente o preço regular real/configurado; não criar preço artificial apenas para simular desconto.

**Status:** ✅ DIRETRIZ DEFINITIVA  
**Decidido por:** Mista — oferta definida pelo humano; regra de integridade definida pela IA

---

## Embalagem e apresentação

### 52. Quanto custa a garrafa?

**Resposta:** R$ 1,00 tanto para 300 ml quanto para 500 ml.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 53. Tampa/lacre têm custo separado?

**Resposta:** Não. Já estão incluídos no custo da garrafa.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 54. Todos os produtos recebem canudo?

**Resposta:** Sim, canudo grosso.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 55. Todos os produtos recebem adesivo?

**Resposta:** Sim. A arte pode variar, mas inicialmente todas as artes são tratadas com o mesmo custo.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 56. Quantas sacolas serão usadas?

**Resposta:** Uma por pedido, não por produto. Pequena, média ou grande são tratadas inicialmente com o mesmo custo simplificado.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 57. Haverá topping fora da garrafa?

**Resposta:** Não. O produto é entregue completamente fechado; nada consumível fica do lado de fora, salvo eventual brinde embalado separadamente.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 58. Como valorizar o produto sem elevar muito o custo?

**Resposta:** Variações de adesivo, veios/marbling usando ingredientes já previstos na receita, pedaços de morango visíveis, sementes de maracujá e uso da transparência da embalagem para destacar cor e textura.

**Status:** ✅ DIRETRIZ DE APRESENTAÇÃO  
**Decidido por:** IA por delegação humana

---

## Fotos e mídia

### 59. As fotos existentes de morango e maracujá estão aprovadas?

**Resposta:** Sim.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 60. É obrigatório fotografar todos os produtos antes de publicar?

**Resposta:** Não. Produtos sem foto usam placeholder oficial e recebem fotos oficiais progressivamente pelo painel administrativo.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 61. São necessárias fotos diferentes para 300 e 500 ml?

**Resposta:** Não. O tamanho é uma variação selecionável do mesmo produto.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 62. Como devem ser as fotos?

**Resposta:** Mostrar somente o produto, buscando aspecto real e evitando cenário artificial ou aparência de IA.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 63. A mídia poderá abrir em tela cheia?

**Resposta:** Sim.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Catálogo digital

### 64. Como será o catálogo principal?

**Resposta:** Rolagem contínua/incremental, valorizando primeiro a imagem, depois nome próprio, nome descritivo, preço e descrição.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 65. Haverá pesquisa?

**Resposta:** Sim. A busca deve localizar produtos por nome próprio, nome descritivo, descrição, sabores, ingredientes e tags, com tolerância a acentos.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Mista — requisito humano; critérios técnicos detalhados pela IA

### 66. Quais filtros existirão inicialmente?

**Resposta:** Categoria, subcategoria, sabor, Simples, Com Nutella, Duo, Trio, tamanho 300/500 ml, oferta, disponibilidade e faixa de preço.

**Status:** ✅ DEFINITIVO COMO CONJUNTO INICIAL  
**Decidido por:** IA por delegação humana

### 67. O que acontece quando um produto acaba?

**Resposta:** Continua visível, perde contraste, recebe estado “Esgotado” e não pode ser adicionado ao pedido.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 68. O sistema suportará produtos com preparação antecipada?

**Resposta:** Sim, mesmo que inicialmente nenhum sabor dependa disso.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Landing page

### 69. A landing exibirá o cardápio completo?

**Resposta:** Não. Exibirá somente destaques, Produto da Semana, ofertas, combos e campanhas selecionadas.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 70. Como esses destaques aparecerão?

**Resposta:** Em carrossel automático com controles manuais e pausa/interrupção quando o usuário interagir.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Estoque e produção

### 71. A CookLily controlará estoque de forma definitiva por conta própria?

**Resposta:** Não. Inicialmente pode haver lançamento manual, mas o destino é a integração com o ERP do Carro Chefe.

**Status:** ✅ DEFINITIVO DE ARQUITETURA  
**Decidido por:** Humano

### 72. A quantidade diária de pronta-entrega será fixa?

**Resposta:** Não. Será configurável pelo usuário no sistema.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Pedidos, checkout e logística

### 73. Quais canais receberão pedidos?

**Resposta:** Balcão, WhatsApp, cardápio online e totem de autoatendimento.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 74. O cardápio online será apenas visual?

**Resposta:** Não. Permitirá configurar o item e montar o pedido.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 75. Haverá checkout online?

**Resposta:** Sim. Faz parte do lançamento comercial completo.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 76. Haverá entrega e retirada?

**Resposta:** Sim, ambas.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 77. Onde será a retirada?

**Resposta:** No mesmo endereço operacional do Carro Chefe.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 78. Horários, bairros, taxas e pedido mínimo ficam documentados como valores fixos?

**Resposta:** Não. Devem ser configurações do sistema.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 79. O sistema deve aceitar diferentes formas de cálculo de entrega?

**Resposta:** Sim.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 80. Dados de entrega/retirada aparecem no catálogo?

**Resposta:** Não como conteúdo principal do cardápio; são tratados no checkout.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Conta do cliente

### 81. Criar conta é obrigatório para comprar?

**Resposta:** Não. Compra como convidado é permitida.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 82. Telefone é obrigatório no pedido?

**Resposta:** Sim, para acompanhamento pelo site/WhatsApp e contato operacional.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 83. Quais benefícios podem incentivar a criação de conta?

**Resposta:** Checkout mais rápido, histórico, recompra, favoritos, acompanhamento centralizado, endereços salvos quando aplicável e acesso a campanhas elegíveis.

**Status:** ✅ DIRETRIZ INICIAL  
**Decidido por:** IA por delegação humana

### 84. Cupom ou brinde pode ser usado como incentivo?

**Resposta:** Sim, desde que o benefício não consuma mais de 5% do lucro líquido estimado do pedido.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 85. Clientes CookLily poderão consentir com promoções do Carro Chefe?

**Resposta:** Sim, mediante consentimento separado.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

---

## Parceria com Carro Chefe

### 86. Como a parceria será apresentada?

**Resposta:** “CookLily × Carro Chefe — parceria temporária.”

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 87. A separação técnica das bases precisa ser destaque comercial?

**Resposta:** Não. Deve ficar nos documentos adequados de privacidade/termos.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 88. Produtos CookLily poderão permanecer no Carro Chefe após a inauguração?

**Resposta:** Sim. Existe intenção de manter alguns, ainda sem definir quais.

**Status:** ✅ INTENÇÃO APROVADA  
**Decidido por:** Humano

---

## QR e tracking

### 89. O QR atual continuará funcionando?

**Resposta:** Sim.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 90. Cada sabor terá QR físico diferente?

**Resposta:** Não como regra. O mesmo QR pode continuar nas etiquetas para evitar reimpressão.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 91. Como será o tracking online?

**Resposta:** Mais discriminativo que o QR físico, distinguindo produto, tamanho, sabores, combinação, adicionais, combo/oferta, campanha, origem, superfície e pedido.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 92. PII pode ser colocada na URL de tracking?

**Resposta:** Não. Nome, telefone, endereço e outros dados pessoais não devem integrar parâmetros de tracking em URL.

**Status:** ✅ DIRETRIZ TÉCNICA DEFINITIVA  
**Decidido por:** IA por aplicação técnica

---

## Custos e cotações

### 93. Como tratar ingredientes sem compra real atual?

**Resposta:** Usar referência aproximada, priorizando preço local/regional, depois média regional e cotação online. Compra real sempre substitui a estimativa.

**Status:** ✅ DEFINITIVO COMO MÉTODO  
**Decidido por:** Humano

### 94. Quais referências provisórias de custo foram adotadas?

**Resposta:**  
- Açaí 3,6 L: R$ 90  
- Doce de leite: ~R$ 38/kg  
- Frutas vermelhas: ~R$ 40/kg  
- Oreo: ~R$ 55/kg  
- Banana: ~R$ 12/kg  
- Leite condensado: ~R$ 14,60/kg  
- Paçoca: ~R$ 38/kg  
- Ovomaltine: ~R$ 72/kg  
- Leite Ninho: ~R$ 49/kg  
- Nutella: R$ 80/kg operacional  
- Creme de Ninho CookLily: ~R$ 24/kg

**Status:** 🟡 REFERÊNCIA PROVISÓRIA  
**Decidido por:** IA por delegação humana

### 95. Qual será a receita inicial do Creme de Ninho?

**Resposta:** Referência inicial de 200 g de creme de leite + 200 g de leite condensado + 100 g de Leite Ninho, rendimento estimado em ~500 g, sujeita a refinamento de textura em teste.

**Status:** 🟡 RECEITA INICIAL PARA HOMOLOGAÇÃO  
**Decidido por:** IA por delegação humana

---

## Escopos futuros e fechamento

### 96. A categoria Doces entra na inauguração?

**Resposta:** A categoria pode aparecer como “em breve”, mas nenhum doce está aprovado como produto do cardápio inicial.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 97. Os alergênicos fazem parte desta definição de cardápio?

**Resposta:** Não. Terão uma configuração/sessão separada antes da publicação comercial completa quando aplicável.

**Status:** 🟡 ESCOPO FUTURO DEFINIDO  
**Decidido por:** Humano

### 98. Essas decisões viram requisitos da Entrega 05?

**Resposta:** Sim. A Entrega 05 deve implementar categorias/subcategorias, produtos/variantes, LilyMix, compatibilidade, adicionais, preços, ofertas, combos, busca, filtros, mídia, disponibilidade, esgotado, Destaque da Semana e administração dinâmica.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 99. Tudo que não foi explicitamente aprovado fica fora do cardápio inicial?

**Resposta:** Sim, até nova decisão formal.

**Status:** ✅ DEFINITIVO  
**Decidido por:** Humano

### 100. O cardápio inicial está oficialmente fechado?

**Resposta:** Sim. Estrutura, naming, produtos, sabores, tamanhos, preços, adicionais, limites, combos, apresentação, catálogo, mídia, disponibilidade, pedido, checkout, parceria e tracking estão fechados. O restante é implementação ou homologação técnica.

**Status:** ✅ FECHADO  
**Decidido por:** Humano

---

## Aprovação geral

O proprietário autorizou expressamente:

- considerar as respostas fornecidas como definitivas;
- marcar como fora do cardápio inicial tudo que não fosse explicitamente aprovado;
- transformar receitas, nomes, preços, tamanhos, regras de disponibilidade e adicionais em requisitos da Entrega 05;
- permitir que decisões delegadas à IA fossem escolhidas e registradas como definitivas.

Por isso, decisões marcadas como **IA por delegação humana** são definitivas no escopo atual, preservando porém a autoria de quem efetivamente escolheu a alternativa específica.
