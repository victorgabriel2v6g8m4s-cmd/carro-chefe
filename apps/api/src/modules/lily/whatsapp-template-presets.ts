export type WhatsAppTemplatePreset = {
  key: string;
  displayName: string;
  category: "utility" | "authentication";
  bodyTemplate: string;
  variableNames: string[];
  variables: Array<"orderNumber" | "stageLabel" | "itemsSummary" | "totalAmount" | "deliveryEta">;
  components: Array<Record<string, unknown>>;
};

const utility = (
  key: string,
  displayName: string,
  bodyTemplate: string,
  variableNames: string[],
  variables: WhatsAppTemplatePreset["variables"] = ["orderNumber", "stageLabel"],
  extraComponents: Array<Record<string, unknown>> = []
): WhatsAppTemplatePreset => ({
  key, displayName, category: "utility", bodyTemplate, variableNames, variables,
  components: [{ type: "BODY", text: bodyTemplate }, ...extraComponents]
});

const footer = { type: "FOOTER", text: "CookLily · Cremosidade, sabor e qualidade" };
const orderButton = (text: string, url: string) => ({ type: "URL", text, url });
const orderButtons = (...buttons: Array<Record<string, unknown>>) => ({ type: "BUTTONS", buttons });

export const LILY_WHATSAPP_STARTER_TEMPLATES: WhatsAppTemplatePreset[] = [
  utility("account_welcome", "Boas-vindas após criar conta", "Olá, {{1}}! Sua conta CookLily está pronta. Você pode montar seu pedido pelo nosso cardápio e acompanhar tudo por aqui.", ["nome"], []),
  {
    key: "account_verification_code",
    displayName: "Código de verificação da conta",
    category: "authentication",
    bodyTemplate: "{{1}} é seu código de verificação CookLily. Não compartilhe este código com ninguém.",
    variableNames: ["codigo"],
    variables: [],
    components: [
      { type: "BODY", text: "{{1}} é seu código de verificação CookLily. Não compartilhe este código com ninguém.", add_security_recommendation: true, code_expiration_minutes: 10 },
      { type: "FOOTER", text: "Este código expira em 10 minutos." },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] }
    ]
  },
  utility("awaiting_payment", "Pedido recebido", "Olá! Recebemos o pedido {{1}}.\n{{2}}\nTotal: {{3}}.\nO pedido está aguardando pagamento. Use um dos botões para finalizar o pagamento ou editar o pedido.", ["numero_do_pedido", "resumo_dos_itens", "total"], ["orderNumber", "itemsSummary", "totalAmount"], [
    footer,
    orderButtons(
      orderButton("Finalizar pagamento", "https://licalily.com/cook/pagamento/{{1}}"),
      orderButton("Editar pedido", "https://licalily.com/cook/carrinho?editar={{1}}")
    )
  ]),
  utility("restaurant_accepted", "Pedido aceito pela loja", "A loja aceitou o pedido {{1}}. Situação: {{2}}.", ["numero_do_pedido", "etapa"]),
  utility("payment_confirmed", "Pagamento confirmado", "Pagamento do pedido {{1}} confirmado! Seu pedido está {{2}}. Acompanhe o andamento e, se o prazo de cancelamento ainda estiver aberto, solicite o cancelamento pelo site.", ["numero_do_pedido", "etapa"], ["orderNumber", "stageLabel"], [
    footer,
    orderButtons(
      orderButton("Acompanhar pedido", "https://licalily.com/cook/acompanhar/{{1}}"),
      orderButton("Cancelar pedido", "https://licalily.com/cook/acompanhar/{{1}}")
    )
  ]),
  utility("order_modified", "Alteração do pedido", "A alteração do pedido {{1}} foi registrada. Situação atual: {{2}}.", ["numero_do_pedido", "alteracao"]),
  utility("preparing", "Pedido em preparo", "O pedido {{1}} está {{2}}. Avisaremos assim que houver uma nova atualização." , ["numero_do_pedido", "etapa"]),
  utility("ready_for_pickup", "Pedido pronto para retirada", "O pedido {{1}} está {{2}} e pode ser retirado no endereço da CookLily." , ["numero_do_pedido", "etapa"]),
  utility("waiting_courier", "Aguardando entregador", "O pedido {{1}} está {{2}}. Enviaremos outra atualização quando sair para entrega." , ["numero_do_pedido", "etapa"]),
  utility("courier_accepted", "Entregador confirmado", "O pedido {{1}} está {{2}}. Em breve, ele seguirá para o endereço informado." , ["numero_do_pedido", "etapa"]),
  utility("picked_up", "Pedido coletado", "O entregador coletou o pedido {{1}}. Situação: {{2}}." , ["numero_do_pedido", "etapa"]),
  utility("out_for_delivery", "Pedido saiu para entrega", "O pedido {{1}} saiu para entrega. Previsão: {{2}}. Você pode acompanhar o status pelo site." , ["numero_do_pedido", "previsao"], ["orderNumber", "deliveryEta"], [
    footer,
    orderButtons(orderButton("Acompanhar pedido", "https://licalily.com/cook/acompanhar/{{1}}"))
  ]),
  utility("arrived_delivery", "Entregador chegou", "O entregador chegou ao endereço do pedido {{1}}. Fique atento para receber seu pedido." , ["numero_do_pedido"], ["orderNumber"], [
    footer,
    orderButtons(orderButton("Acompanhar pedido", "https://licalily.com/cook/acompanhar/{{1}}"))
  ]),
  utility("delivered", "Pedido entregue", "Pedido {{1}} entregue! Obrigado por escolher a CookLily. Quando puder, conte como foi sua experiência com a loja e com a entrega." , ["numero_do_pedido"], ["orderNumber"], [
    footer,
    orderButtons(
      orderButton("Avaliar loja", "https://licalily.com/cook/acompanhar/{{1}}"),
      orderButton("Avaliar entrega", "https://licalily.com/cook/acompanhar/{{1}}")
    )
  ]),
  utility("cancelled", "Pedido cancelado", "O pedido {{1}} foi cancelado. Situação: {{2}}. A situação pode ser acompanhada no site.", ["numero_do_pedido", "etapa"]),
  utility("refunded", "Pagamento estornado", "O estorno relacionado ao pedido {{1}} foi registrado. Situação: {{2}}." , ["numero_do_pedido", "etapa"])
];
