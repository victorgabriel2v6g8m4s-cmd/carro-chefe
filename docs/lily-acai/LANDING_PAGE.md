# Configuração da Landing Page CookLily

O editor administrativo fica em `/lilyacai/painel/landing` e exige sessão staff/admin. A leitura e gravação usam `/api/v1/lily/admin/landing`; o endpoint de gravação valida sessão, CSRF, mídias ativas, destinos permitidos e produtos publicados/disponíveis.

## Banner

1. Em **Banner e links**, envie uma imagem ou selecione uma mídia de imagem já enviada.
2. Marque **Usar a mesma arte** para compartilhar uma imagem entre dispositivos; desmarque para carregar uma arte independente de celular.
3. Alterne a prévia entre desktop e celular. Ajuste posição horizontal, posição vertical e zoom em cada enquadramento.
4. Escolha a ação do clique. A lista de destino busca apenas páginas internas permitidas, redes sociais configuradas ou produtos do cardápio publicados e disponíveis. Se não houver destino válido, o painel bloqueia o salvamento.
5. Preencha a descrição acessível da arte.

Até que uma arte seja enviada, a landing mostra um banner provisório com a marca, distinguível da arte final.

## Identidade e produtos

Na aba **Marca e texto**, edite a frase e a descrição. A descrição reutiliza o editor e renderizador Markdown do estúdio WhatsApp (negrito, itálico, tachado, monoespaçado, citações, listas e links).

Em **Produtos em destaque**, escolha o produto semanal já configurado no catálogo ou selecione produtos para o carrossel. Os controles definem quantos cartões aparecem por vez em desktop/celular e quais elementos do cartão ficam visíveis. Produtos indisponíveis não podem ser adicionados ao carrossel; a API valida novamente no salvamento.

## Comunidade, Reels e localização

Em **Seções da página**, o admin pode ocultar o ranking, os Reels ou endereço/mapa. O ranking público respeita a opção de participação e é carregado por páginas conforme a pessoa percorre a página; **Ver ranking completo** abre a tela de ranking, que tem sua própria paginação. O endereço incorporado ao mapa só vem do campo público de localização das configurações da loja; o endereço interno de coleta não é publicado pela landing.

As opções do painel são persistidas no campo `LilyOperationalSettings.landingPageJson`, com a migration `20261031130000_lily_landing_page`. A mídia permanece na biblioteca CookLily. Arte promocional, preço, disponibilidade e texto publicitário final ainda precisam ser revisados antes da publicação comercial.
