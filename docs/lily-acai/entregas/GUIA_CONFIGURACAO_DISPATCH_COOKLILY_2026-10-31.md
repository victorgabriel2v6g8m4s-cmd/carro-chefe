# Configuração do despacho próprio CookLily

Este guia cobre a primeira versão do despacho sequencial e das avaliações. O fluxo usa entregadores cadastrados na CookLily, sem operador externo e sem raio máximo. O courier mais próximo recebe uma oferta por vez; recusa ou expiração passa ao próximo.

## 1. Preparar contas e ambiente

1. Crie/promova uma conta autorizada para o papel `courier` no painel de equipe. O entregador deve concluir a troca de senha e MFA exigidos para contas privilegiadas.
2. Confirme que as contas de entregador estão ativas e conseguem entrar em `/lilyacai/entregas`.
3. Antes da primeira publicação, confirme que a migration `20261031000000_lily_dispatch_ratings` foi aplicada ao banco dedicado CookLily e que o processo da API foi reiniciado com o build publicado.
4. Configure `COOKLILY_LOGISTICS_CODE_KEY` na VPS, se ainda não estiver configurada. Ela deve continuar estável enquanto houver pedidos em andamento; não a copie para Git ou para o painel.
5. A versão 1 não transmite a localização do courier ao cliente. A localização atual só participa da ordenação do despacho e é removida quando o courier fica indisponível.

## 2. Configurar o ponto de coleta e prazo da oferta

1. Acesse `/lilyacai/painel/entrega` como staff/admin.
2. Em **Entrega e retirada**, preencha latitude e longitude do ponto de coleta. Use as coordenadas exatas do estabelecimento; os dois campos são obrigatórios em conjunto.
3. Defina **Prazo para entregador aceitar ou recusar** entre 15 e 300 segundos. O padrão é 60 segundos.
4. Salve e recarregue a página para confirmar que os valores persistiram.
5. Sem coordenadas válidas, a API não despacha ofertas. Não há fallback por CEP, endereço aproximado ou raio fixo.

## 3. Configurar ETA (opcional para despacho)

O despacho funciona sem serviço de mapas. Para mostrar a estimativa de rota na versão 1, configure o provider e suas credenciais conforme [`ENTREGA_11G_ETA_MAPAS_2026-09-28.md`](ENTREGA_11G_ETA_MAPAS_2026-09-28.md) e o runbook [`DEPLOY_VPS.md`](../DEPLOY_VPS.md). Uma falha do provider não deve bloquear aceite, preparo ou entrega. O ETA é estimativa de rota, nunca posição ao vivo.

## 4. Rotina do entregador

1. No início do turno, entre em `/lilyacai/entregas` e toque em **Ficar disponível**.
2. Autorize a localização no navegador e mantenha essa página aberta durante a disponibilidade. A posição é renovada periodicamente; se deixar de ser atualizada ou o acesso falhar, o sistema desativa a disponibilidade e apaga as coordenadas.
3. Uma oferta mostra o pedido, a região de destino e o prazo para responder. Rua, número e referência permanecem ocultos até o aceite.
4. Toque em **Aceitar entrega** ou recuse com um motivo. Recusa e timeout registram histórico e avançam para o próximo courier elegível; o mesmo courier não recebe a oferta novamente para aquele despacho.
5. Toque novamente em **Disponível · ficar offline** ao terminar o turno. A localização operacional é apagada imediatamente.

O navegador não oferece notificação push nesta versão. A página consulta novas ofertas enquanto está aberta. Se o aparelho fechar a página, perder rede ou suspender o navegador, a localização envelhece e o courier deixa de ser elegível.

## 5. Rotina da cozinha e expedição

1. Em cada novo pedido de entrega, registre **Aceitar pedido** com a previsão inicial de preparo ou **Recusar pedido** com motivo.
2. Pedido pago recusado entra como cancelado com `refundStatus=pending_confirmation`. A equipe financeira deve confirmar o estorno no provedor e usar o fluxo financeiro existente; a aplicação não declara o estorno concluído por conta própria.
3. Aceite o pedido antes de iniciar o preparo. As etapas de cozinha existentes avançam o pedido até pronto para expedição.
4. Antes de abrir ofertas, marque os itens conferidos, informe o número de volumes, confirme embalagem/lacre e bag térmica, e conclua o checklist.
5. A oferta só começa depois do checklist completo, do pedido pago/pronto e da configuração do ponto de coleta.
6. Entregador e cozinha seguem os códigos de coleta/entrega já documentados em [`ENTREGA_11D_LOGISTICA_2026-09-28.md`](ENTREGA_11D_LOGISTICA_2026-09-28.md). Depois da coleta, não há reatribuição automática.

## 6. Cliente e avaliação

1. Cliente acompanha a timeline e o ETA quando disponível na página do pedido. O produto não apresenta GPS ao vivo.
2. Após a confirmação de entrega (ou conclusão de retirada), o titular autenticado abre **Avaliar pedido**.
3. Pode selecionar loja, entrega e plataforma, em qualquer combinação permitida. Cada dimensão recebe nota de 1 a 5 e comentário opcional de até 500 caracteres.
4. Cada pedido aceita uma avaliação. Comentários não são publicados automaticamente; moderação e política de retenção ainda precisam de decisão operacional antes de expor avaliações publicamente.

## 7. Homologação antes de ativar para clientes

Use contas de teste, pedido identificável como homologação e provedor/pagamento de teste autorizado. Não crie pedido real nem inicie cobrança para testar.

- [ ] Coordenadas do ponto de coleta revisadas por staff autorizado.
- [ ] Courier de teste ativa/desativa disponibilidade e confirma que a localização é apagada ao ficar offline.
- [ ] Com dois couriers, confirmar que o mais próximo recebe primeiro; recusar e verificar que o próximo recebe; deixar uma oferta expirar e verificar o mesmo avanço.
- [ ] Testar recarga/rede interrompida e verificar que não há oferta para posição antiga.
- [ ] Cozinha aceita, define ETA de preparo, avança estados, completa checklist e confirma que só então o despacho abre.
- [ ] Testar recusa de pedido pago e confirmar que o painel deixa explícito que o estorno está pendente, sem mostrar pagamento reembolsado.
- [ ] Confirmar aceite, coleta, rota/ETA, código de entrega, entrega e avaliação em desktop e celular.
- [ ] Verificar que courier não vê rua antes do aceite e cliente nunca recebe coordenadas do entregador.
- [ ] Confirmar que falhas de WhatsApp/mapas não impedem a operação manual.

## 8. Limites conhecidos da versão 1

- Sem push quando o painel do courier está fechado.
- Sem cancelamento/devolução/ausência do cliente com fluxo completo de ponta a ponta; esses casos precisam de instrução de suporte e trilha de auditoria antes da ativação ampla.
- Avaliações são privadas e únicas por pedido; moderação, retenção e encaminhamento de reclamações aguardam política operacional.
- GPS ao vivo continua fora do escopo até homologação integral, decisão de privacidade, retenção, acesso e fallback.

## Mapa de implementação

```text
CourierAvailabilityToggle -> /courier/availability -> courier-dispatch -> LilyUser + LilyOrder
AdminFulfillmentPage -> /admin/fulfillment -> LilyOperationalSettings
KitchenDeliveryControls -> /admin/kitchen/orders/* -> decision/checklist -> WhatsApp outbox
CourierPage -> /courier/deliveries -> offer/accept/reject -> delivery events/assignments
OrderDetailPage -> /customer/orders/:id -> status + ETA -> OrderReviewPage -> LilyOrderReview
```
