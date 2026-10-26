# Cupons e preços promocionais CookLily

Estado: implementação técnica nesta entrega; ativação de cupons, política comercial e homologação em produção continuam sob controle da equipe.

## Gestão no painel

- A rota `/painel/cupons` permite criar e editar códigos, título, descrição, modalidade percentual/valor fixo/frete grátis, validade, cor, arte de mídia quadrada, estado rascunho/ativo/pausado/desativado e itens elegíveis.
- Escopos por categoria, produto e frete podem coexistir. Categoria e produto são alternativas inclusivas para mercadorias; frete é um escopo adicional.
- O limite total é opcional. O limite por cliente tem recorrência sem reinício, diária, semanal ou mensal; a janela usa o fuso configurado para a operação (padrão `America/Campo_Grande`). Semana começa na segunda-feira.
- Combinação é explicitamente habilitada por cupom. Quando todos os códigos permitem combinação e todos estão marcados como somativos, os valores são somados. Se a combinação é permitida, mas nem todos são somativos, aplica-se o maior desconto individual e os demais aparecem como não aplicados. Um código que proíbe combinação impede a combinação.
- O cálculo, a validação de validade/escopo/limites, a criação do pedido e o resgate são server-side. Usos totais são reservados atomicamente na transação que cria o pedido; os códigos e valores aplicados ficam em snapshot no pedido e em histórico relacionado.

## Aplicação no checkout

- Até cinco códigos podem ser adicionados e removidos antes do pedido. O servidor recalcula os valores no checkout e novamente ao criar o pedido.
- O desconto de mercadoria e o desconto de frete ficam separados. O desconto da forma de pagamento incide sobre o valor de mercadoria que restou após o cupom e nunca sobre a taxa de entrega ainda cobrada.
- Cupons de frete grátis só qualificam pedidos de entrega. Limites e disponibilidade são validados outra vez na criação do pedido, para evitar usar uma cotação antiga.
- O resgate é contabilizado quando o pedido é criado e reservado. Cancelamentos posteriores não devolvem automaticamente a unidade nesta primeira versão; definir expiração e liberação de reservas antes de campanhas com limite muito baixo.

## Preço antigo e apresentação

- O preço antigo é opcional por variante e por faixa de sabor/tamanho LilyMix. Precisa ser maior que o preço atual; a API rejeita valores inconsistentes.
- Catálogo, seleção/configuração de produto, checkout e pagamento usam o mesmo componente de preço: valor anterior menor e riscado, seguido do valor atual em vinho, forte e com animação curta. A animação respeita `prefers-reduced-motion`.
- No checkout, preço por item é atualizado após cotação do servidor; ao aplicar cupom, o total original também aparece riscado. Na escolha de pagamento, o valor de referência considera o total sem cupom, enquanto os descontos de cupom e método aparecem discriminados.

## Salvamento do catálogo

- Edição de produto, variante, regras de configuração, categoria, adicional, combo e oferta é salva automaticamente com debounce.
- A atualização mantém o estado da página e a seleção/abertura dos editores; não busca o catálogo inteiro novamente após cada alteração. Os editores exibem estados salvando/salvo/erro e mantêm os dados para correção em caso de falha.
- Criação de novos registros continua sendo uma ação explícita; após criar, o catálogo pode ser atualizado para disponibilizar o novo registro nos seletores.

## Sugestões e decisões pendentes

1. Definir se pedidos não pagos devem reservar o limite até o cancelamento/expiração e qual é a janela de expiração. A implementação atual reserva no pedido para impedir ultrapassar o limite sob concorrência.
2. Definir se limites de uso devem contar pedidos criados, pagos ou concluídos. A versão atual conta pedidos criados.
3. Antes de campanhas com desconto profundo, ligar o teto do cupom às margens/custos cadastrados por variante e adicional. O atual motor limita valor, subtotal e escopo, mas não projeta CMV por configuração do carrinho; por isso a regra operacional existente de margem mínima de 10% continua exigindo revisão da equipe ao ativar uma campanha.
4. Futuramente, registrar eventos de visualização/aplicação/remoção e conversão sem armazenar o código em plataformas de anúncios; restringir relatórios com dados identificáveis a staff autorizado.
5. Considerar códigos de uso único individualizados, exclusões por campanha e janelas recorrentes de campanha separadas do limite por cliente.

## Aceite técnico

- API exige staff + CSRF para administrar; a criação/alteração registra auditoria.
- Código é único e normalizado em maiúsculas; arte usa mídia CookLily já armazenada, sem URL arbitrária.
- Descontos nunca excedem os valores elegíveis nem levam total do pedido abaixo de zero.
- Migration Lily é aplicada pelo fluxo versionado `npm run db:deploy:lily` no deploy normal.
- Aprovação visual final e testes de compra real dependem da homologação posterior no site.
