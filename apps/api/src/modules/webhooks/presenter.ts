type EndpointRecord = {
  id: string;
  name: string;
  url: string;
  eventsJson: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function presentWebhookEndpoint(endpoint: EndpointRecord) {
  return {
    id: endpoint.id,
    name: endpoint.name,
    url: endpoint.url,
    events: JSON.parse(endpoint.eventsJson) as string[],
    enabled: endpoint.enabled,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt
  };
}
