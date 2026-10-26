# Programa VIP CookLily

- Status: especificação registrada e implementação local validada; integração/deploy pendentes
- Responsável técnico: AG-DEV
- Registro: 26/10/2026

## Objetivo

Formar um grupo de clientes voluntários para conhecer lançamentos e ofertas antes do público geral, testar ideias e resgatar benefícios. O programa é separado do ranking público e não torna respostas de pesquisas públicas.

## Entrada e benefícios

1. A pessoa precisa ter uma conta CookLily.
2. No perfil, informa um código de convite ou campanha.
3. Código promocional pode creditar um ou mais cupons existentes como benefícios individuais da conta. O cupom conserva validade, limite, escopo e condições definidos no painel.
4. Código VIP cria um convite pendente. A pessoa abre os termos, concede consentimento explícito e então escolhe “Inscrever-me no VIP”. Só após esse passo a conta fica ativa como VIP.
5. Clientes comuns podem solicitar o VIP quando atingem a pontuação mínima configurada no painel. A ativação segue o mesmo consentimento explícito.
6. VIPs têm acesso antecipado aos produtos marcados como lançamento VIP, campanhas, cupons e ofertas especiais disponibilizados pela equipe. O código de convite não promete quantidade ou valor de benefícios.
7. A coroa dourada é um indicador de status VIP junto à foto, sem expor dados de adesão no ranking público.

## Lançamentos antecipados

- Cada produto pode ser marcado no catálogo como exclusivo de lançamento VIP e ter uma frase teaser para pessoas não inscritas.
- Pessoas comuns veem a imagem desfocada, nome substituído por `???`, frase teaser e selo dourado VIP.
- Pessoas VIP veem imagem, título, opções e chamada de compra normais, mantendo o selo VIP.
- O servidor deve validar a autorização no catálogo, detalhes, combos e cotação do pedido; ocultação visual não é controle de acesso.
- Produtos sem disponibilidade publicada ou com status diferente de publicado continuam indisponíveis a todos.

## Consentimento e dados do programa

Consentimento VIP é específico, versionado, explícito, separado dos consentimentos de marketing/WhatsApp e pode ser revogado a qualquer momento pela página `/vip/termos` ou pelo perfil. O aceite cobre analytics próprios necessários para medir o piloto:

- adesão, cancelamento e elegibilidade;
- impressão/abertura de conteúdo VIP e interação com ofertas;
- eventos de navegação e compra necessários para avaliar os experimentos;
- respostas de pesquisas somente quando a pesquisa e seu aviso de consentimento próprio autorizarem esse vínculo.

Os registros devem ficar na base CookLily, com acesso restrito a staff/admin autorizado e trilha de auditoria. Eventos de analytics são agregados no painel sem expor a identidade de participantes, têm retenção configurável de 30 a 3.650 dias (padrão de 180 dias) e são excluídos quando a inscrição é cancelada. Não enviar telefone, identidade, respostas abertas ou eventos individualizados para plataformas de anúncios. Relatórios para decisão devem preferir agregação. O consentimento VIP não autoriza compartilhar dados com a operação Carro Chefe nem com terceiros.

O acesso aos benefícios depende da coleta própria indicada acima. A pessoa pode recusar ou cancelar; nesse caso, a inscrição e os benefícios VIP terminam. Dados de consentimento e transações podem ser mantidos pelo período necessário para comprovação, segurança e obrigações legais; eventos experimentais expiram conforme o prazo configurado e são excluídos quando a inscrição é cancelada.

## Cancelamento e saída

- A pessoa pode cancelar a inscrição sem precisar justificar.
- O cancelamento remove a elegibilidade para lançamentos, ofertas e campanhas VIP imediatamente.
- Cupons já creditados seguem as regras e validade próprias, salvo se a oferta estabelecer claramente o contrário antes do resgate.
- Registros mínimos de consentimento, resgate e transação podem permanecer para auditoria e obrigações legais; analytics não necessários devem ser removidos ou agregados conforme a política de retenção.
- Um novo convite pode permitir reinscrição, desde que os termos vigentes sejam novamente aceitos.

## Segurança e integridade

- Códigos são tratados como credenciais: armazenar hash, limitar tentativas e nunca registrar o código completo em logs.
- Resgates são idempotentes por conta/código; limite global e validade devem ser aplicados em transação.
- A ativação depende de sessão autenticada e proteção CSRF. Ações administrativas exigem papel staff/admin, MFA conforme política existente e auditoria.
- Benefícios de cupons são vinculados à conta que resgatou o código e não podem ser transferidos.
- A configuração de limite de pontos não substitui aceite dos termos.

## Regras para o painel

- Criar, pausar e desativar códigos; definir validade, máximo de resgates e modalidade (convite VIP ou crédito de cupons existentes).
- Para códigos de cupons, selecionar um ou mais cupons ativos/planejados; não copiar regras de desconto para outro lugar.
- Configurar pontuação mínima para candidatura VIP; zero desativa a candidatura por pontos.
- Configurar retenção dos eventos próprios do piloto (padrão de 180 dias).
- Marcar produto como lançamento VIP e definir texto teaser individual.
- Exibir contadores agregados de resgates/adesões sem divulgar respostas ou identidade a usuários comuns.

## Políticas recomendadas

1. Iniciar com códigos limitados e janela de validade curta; revisar taxa de adesão e saída antes de expandir.
2. Separar convite de ativação para garantir que ninguém se torne VIP sem consentimento informado.
3. Publicar critérios de elegibilidade de experimentos, duração estimada e como enviar feedback em cada campanha.
4. Não usar pontuação como compra de consentimento; os pontos apenas habilitam candidatura, sujeita à decisão do cliente.
5. Evitar exclusividade de preço enganosa: exibir claramente condições, validade e estoque de cada oferta.
6. Revisar periodicamente retenção de eventos e atualizar a política de privacidade pública se as finalidades ou categorias de dados mudarem.

## Fluxo técnico

`ProfilePage` chama API autenticada de resgate → serviço VIP normaliza/hash o código e executa a concessão idempotente → registro pendente gera modal dourado → página de termos registra consentimento versionado → ação explícita ativa a membership. A configuração vem do painel staff e da tabela operacional dedicada; catálogo público aplica projeção por membership e endpoints de cotação revalidam o acesso. Cupons concedidos são direitos por conta verificados no servidor no orçamento e na criação do pedido.

## Critérios de aceite

- Código inválido, expirado, pausado ou esgotado não concede benefício; repetição segura não duplica concessões.
- Código de cupom credita somente os cupons configurados ao cliente autenticado.
- Convite VIP não ativa membership até consentimento versionado e ação de inscrição.
- Página de termos oferece cancelamento e a saída desativa imediatamente acesso VIP.
- Perfil mostra coroa apenas para membership ativa.
- Produto VIP não revela título/detalhes/opções nem permite cotação/pedido sem VIP; cliente VIP acessa normalmente.
- Threshold de candidatura é configurável, aplicado no servidor, e `0` oculta/desabilita o fluxo.
- Ações administrativas são autorizadas e auditadas; dados privados não aparecem para outros clientes.
