export type WhatsAppTemplatePreset = {
  key: string;
  displayName: string;
  category: "utility" | "authentication";
  bodyTemplate: string;
  variableNames: string[];
  variables: Array<"orderNumber" | "stageLabel">;
  components: Array<Record<string, unknown>>;
};

const utility = (
  key: string,
  displayName: string,
  bodyTemplate: string,
  variableNames: string[],
  variables: WhatsAppTemplatePreset["variables"] = ["orderNumber", "stageLabel"]
): WhatsAppTemplatePreset => ({
  key, displayName, category: "utility", bodyTemplate, variableNames, variables,
  components: [{ type: "BODY", text: bodyTemplate }]
});

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
  utility("awaiting_payment", "Pedido recebido", "Recebemos o pedido {{1}}. O total é {{2}} e estamos aguardando a confirmação do pagamento.", ["numero_do_pedido", "total"]),
  utility("restaurant_accepted", "Pedido aceito pela loja", "A loja aceitou o pedido {{1}}. Situação: {{2}}.", ["numero_do_pedido", "etapa"]),
  utility("payment_confirmed", "Pagamento confirmado", "Pagamento confirmado para o pedido {{1}}. Seu pedido está {{2}}.", ["numero_do_pedido", "etapa"]),
  utility("order_modified", "Alteração do pedido", "A alteração do pedido {{1}} foi registrada. Situação atual: {{2}}.", ["numero_do_pedido", "alteracao"]),
  utility("preparing", "Pedido em preparo", "O pedido {{1}} está {{2}}. Avisaremos assim que houver uma nova atualização." , ["numero_do_pedido", "etapa"]),
  utility("ready_for_pickup", "Pedido pronto para retirada", "O pedido {{1}} está {{2}} e pode ser retirado no endereço da CookLily." , ["numero_do_pedido", "etapa"]),
  utility("waiting_courier", "Aguardando entregador", "O pedido {{1}} está {{2}}. Enviaremos outra atualização quando sair para entrega." , ["numero_do_pedido", "etapa"]),
  utility("courier_accepted", "Entregador confirmado", "O pedido {{1}} está {{2}}. Em breve, ele seguirá para o endereço informado." , ["numero_do_pedido", "etapa"]),
  utility("picked_up", "Pedido coletado", "O entregador coletou o pedido {{1}}. Situação: {{2}}." , ["numero_do_pedido", "etapa"]),
  utility("out_for_delivery", "Pedido saiu para entrega", "O pedido {{1}} está {{2}}. Acompanhe as próximas atualizações por aqui." , ["numero_do_pedido", "etapa"]),
  utility("arrived_delivery", "Entregador chegou", "O entregador chegou ao endereço do pedido {{1}}. Situação: {{2}}." , ["numero_do_pedido", "etapa"]),
  utility("delivered", "Pedido recebido", "Pedido {{1}}: {{2}}. Obrigado por escolher a CookLily!" , ["numero_do_pedido", "etapa"]),
  utility("cancelled", "Pedido cancelado", "O pedido {{1}} foi cancelado. Situação: {{2}}. Se precisar, fale com nosso atendimento." , ["numero_do_pedido", "etapa"]),
  utility("refunded", "Pagamento estornado", "O estorno relacionado ao pedido {{1}} foi registrado. Situação: {{2}}." , ["numero_do_pedido", "etapa"])
];
