export function createAgentBrowserRelay(handoffUrl: string, timeoutMs?: number): Promise<{
  browserUrl: string;
  consumed: Promise<boolean>;
  close(): void;
}>;
