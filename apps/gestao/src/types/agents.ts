import type { ExecutionShortcut, ScopedReference, Upload } from "./shared";

export type Agent = {
  id: string;
  name: string;
  mission: string;
  enabled: boolean;
  role?: string | null;
  model?: string | null;
  reasoningEffort?: string | null;
  browserEnabled?: boolean | null;
  workspaceMode?: string | null;
};

export type RunReport = {
  outcome: string;
  summary: string;
  diagnosis?: string | null;
  successes?: string[];
  failures?: string[];
  recommendations?: string[];
  evidence?: string[];
  source?: string | null;
  derived?: boolean;
  generatedBy?: string | null;
};

export type RunStep = {
  id: string;
  order: number;
  title: string;
  status: string;
  description?: string | null;
  procedure?: string | null;
  result?: string | null;
  detail?: string | null;
};

export type RunMessage = {
  id: string;
  sender: string;
  kind: string;
  content: string;
  createdAt: string;
};

export type AgentCommunication = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: string;
  status: string;
  summary: string;
  createdAt: string;
};

export type AgentLog = {
  id: string;
  channel: string;
  eventType: string;
  title?: string | null;
  content: string;
  createdAt: string;
};

export type AgentQuestion = {
  id: string;
  taskId?: string | null;
  status: string;
  question: string;
  context?: string | null;
  recommendation?: string | null;
  options?: string[];
  answer?: string | null;
  answerReferences?: ScopedReference[];
  uploads?: Upload[];
};

export type RunUsage = {
  totalTokens?: number | null;
  durationMs?: number | null;
};

export type AgentRun = {
  id: string;
  agentId: string;
  taskId?: string | null;
  title: string;
  objective: string;
  provider: string;
  status: string;
  currentStep?: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: Agent | null;
  task?: { id: string; title: string; ownerAgentId?: string; pillarId?: string; milestoneId?: string } | null;
  report?: RunReport | null;
  steps: RunStep[];
  journey?: RunStep[];
  messages: RunMessage[];
  communications?: AgentCommunication[];
  logs?: AgentLog[];
  usage: RunUsage[];
  questions: AgentQuestion[];
  uploads?: Upload[];
  intent?: { uploads?: Upload[] } | null;
  shortcuts?: ExecutionShortcut[];
};

export type AgentStats = {
  agent: Agent;
  interactions: number;
  succeeded: number;
  failed: number;
  successRate: number | null;
  performance: string;
  terminalRuns: number;
  recentRuns: Array<AgentRun & { outcome?: string | null }>;
};

export type UsageSummary = {
  planQuota?: string | null;
  source?: string | null;
};
