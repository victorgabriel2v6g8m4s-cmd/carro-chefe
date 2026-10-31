# ADR 004 — logística própria, ofertas sequenciais e avaliações

- **Estado:** aprovado pelo proprietário
- **Data:** 30/10/2026
- **Responsável pela decisão:** proprietário CookLily
- **Escopo:** operação temporária CookLily em `/lilyacai/*` e `/api/v1/lily/*`.

## Motivo e impacto

A logística deve operar com as contas de entregador da própria plataforma. Isso exige disponibilidade explícita, localização temporária para ordenar ofertas e configuração do ponto de coleta; o sistema não assume capacidade de operador externo nem promete rastreamento ao vivo na primeira versão.

## Alternativas avaliadas

- Operador terceirizado/agregador e raio de corte fixo: rejeitados pelo proprietário.
- GPS ao vivo para o cliente na V1: adiado; V1 usa etapas e ETA estimado.

## Decisões

1. A operação usará apenas couriers cadastrados na CookLily com conta/papel de entregador. Não haverá integração com iFood, agregador ou outro operador.
2. Não haverá raio fixo de 5 km nem outro corte arbitrário de distância. Cada entrega elegível é oferecida a um courier disponível por vez, ordenado pela menor distância ao ponto de coleta.
3. O courier controla disponibilidade no painel. Ao ativar, o navegador solicita geolocalização e a plataforma usa a posição somente para ordenar despachos enquanto disponível. Ao desativar, coordenadas e timestamp são apagados. Coordenadas com mais de 90 segundos deixam de habilitar o courier automaticamente.
4. O prazo para aceitar/recusar é configurável por staff/admin. Recusa ou expiração registra tentativa e chama o próximo courier, sem reenviar ao mesmo courier para o mesmo despacho. A atribuição final é atômica.
5. A versão 1 do tracking ao cliente é timeline de status + ETA estimado, sem transmissão de GPS do courier ao cliente. GPS ao vivo é uma fase posterior e só poderá substituir a versão atual depois de homologação integral específica.
6. Após status de entrega concluída, o cliente pode avaliar independentemente loja, entrega e plataforma, escolhendo uma ou mais dimensões. Cada dimensão terá nota própria e comentário opcional; somente o titular autenticado do pedido pode submeter uma avaliação por pedido.

## Regras de falha e privacidade

- Sem coordenada configurada do ponto de coleta, a entrega não é oferecida automaticamente; o painel administrativo deve apontar a configuração ausente.
- Sem localização válida/recente de courier, ele não participa da ordenação. Falha do navegador não deve inventar coordenadas ou expor entregas fora de ordem.
- A posição do courier não é exibida a clientes nem salva como histórico. Registrar apenas a posição operacional atual e apagá-la ao ficar indisponível; a confirmação de disponibilidade é explícita.
- Cancelamento/rejeição de pedido já pago não marca reembolso concluído sem retorno autoritativo do meio de pagamento. O time recebe indicação clara da ação financeira pendente.
- Depois de `picked_up`, preservar a cadeia de custódia e não reatribuir automaticamente.
- Notificações por WhatsApp seguem consentimento/outbox; indisponibilidade do provider não bloqueia cozinha ou entrega.

## Critérios de aceite

- Duas sessões de courier concorrentes nunca recebem nem aceitam simultaneamente a mesma oferta.
- Ofertas respeitam ordenação por distância crescente, exclusão de courier recusado/expirado e timeout configurado.
- Toggle indisponível apaga imediatamente localização; sessões expiradas não entram no próximo despacho.
- Painel expõe timeout, coordenadas do ponto de coleta, aceite/rejeição do restaurante e checklist de expedição.
- Cliente vê status/ETA e nenhuma coordenada do courier.
- Avaliação exige pedido entregue e permite combinações de dimensões sem duplicidade.
- Migration é aditiva, compatível com SQLite de produção e validada em banco isolado antes do deploy.
