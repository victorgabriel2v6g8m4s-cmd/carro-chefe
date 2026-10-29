# CookLily — níveis, benefícios e identidade LilyCoin

O painel administrativo de fidelidade permite configurar os marcos de pontos, LilyCoins concedidas ao atingir cada nível, benefícios e artes. O salvamento cria uma nova versão de configuração; os pontos já registrados não são reescritos.

## Benefícios por nível

O botão **Adicionar benefício** abre a lista do catálogo CookLily. A pesquisa filtra a categoria escolhida; a primeira categoria de produto é selecionada automaticamente. O catálogo inclui categorias publicadas de produtos, cupons, descontos disponíveis, ofertas, combos e a classe **Programa VIP**.

Um clique seleciona ou remove um item. Para produtos, dois cliques ou F2 abrem a montagem de uma combinação fixa, em que o operador escolhe tamanho, sabores e adicionais cadastrados. Sem essa montagem, o cliente mantém a escolha das opções permitidas pelo produto. O servidor confere novamente se as entidades e opções ainda existem e estão publicadas antes de salvar.

Ao alcançar um nível, seus benefícios ficam disponíveis em **Meu espaço CookLily → Disponíveis para resgate**, inclusive os de níveis anteriores. Cada benefício define um limite de 1 a 100 resgates por cliente (padrão 1). O resgate cria um código e registra o benefício, nível, configuração e status. Cupons/descontos geram um cupom ativo associado à conta; outros itens mostram o código para apresentação à equipe. Staff/admin pode marcar o atendimento como concluído no painel. Os resgates de nível não consomem LilyCoins.

## Curva e artes

O campo de proporção compara o avanço em pontos desde o nível anterior. Alterar a proporção calcula o limiar em pontos e alterar os pontos atualiza a proporção exibida. O primeiro nível não tem uma proporção anterior.

Artes de ícones são enviadas à biblioteca segura de mídia CookLily. O nome e ícone configuráveis da LilyCoin aparecem no header e no saldo do dashboard. O header mantém a ordem logo, saldo, progresso segmentado, notificações, carrinho, perfil e menu de navegação/redes sociais.

A curva tem um espaço amplo com zoom gradual por controles e slider, Ctrl/Command + roda no desktop, pinça no toque, barras de rolagem, pan arrastável e ajuste à tela. O minimapa mostra a janela visível e permite navegar pelo gráfico.

## Dados e publicação

- Benefícios são persistidos como JSON estruturado em `LilyLevel.benefitsJson`, com compatibilidade de leitura para notas textuais legadas.
- `LilyLevelBenefitRedemption` conserva o histórico dos resgates; códigos são únicos e o limite é conferido pelo servidor em cada solicitação.
- Ícones de nível e moeda referenciam mídia ativa. Nome/ícone da moeda também entram em `LilyLoyaltyConfigVersion`.
- Migration `20261029210000_lily_loyalty_benefit_assets` adiciona os campos de mídia e identidade.
- A configuração comercial atual deve ser preservada durante testes; valide com banco descartável e dados sintéticos.
- O orçamento agregado de build CookLily foi ajustado para comportar o editor de benefícios e as ferramentas da curva, mantendo limite combinado de JS/CSS gzip abaixo de 1,41× da baseline registrada.

## Validação local

Use um arquivo SQLite dedicado e efêmero para a suíte API. Por exemplo, defina `LILY_DATABASE_URL=file:<caminho-absoluto-para-banco-de-teste>` antes de `npm run db:deploy:lily`; rode os testes com a mesma variável. Não use `.runtime/lily-acai.db`, que pode conter dados operacionais locais.
