export function isSupportedAgentAuthOrigin(origin: string): boolean;
export function buildAgentHandoffUrl(origin: string, ticket: string): string;
export function buildAgentApiHeaders(origin: string): Record<string, string>;
export function createAgentBrowserRelay(
  handoffUrl: string,
  timeoutMs?: number
): Promise<{
  browserUrl: string;
  consumed: Promise<boolean>;
  close(): void;
}>;
