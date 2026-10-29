export const journeyEvents = [
  { id: "site_menu_opened", label: "Abrir cardápio" },
  { id: "order_created", label: "Fazer pedido" },
  { id: "order_modified", label: "Modificar pedido" },
  { id: "tracking_opened", label: "Acompanhar pedido" },
  { id: "order_preparing", label: "Em preparo" },
  { id: "order_ready", label: "Pronto" },
  { id: "order_out_for_delivery", label: "Saiu para entrega" },
  { id: "order_delivered", label: "Entregue" },
] as const;

export type JourneyEventId = (typeof journeyEvents)[number]["id"];

export function journeyEventLabel(id: JourneyEventId) { return journeyEvents.find((event) => event.id === id)?.label ?? "Evento do pedido"; }
