import type { Agent, AgentRun } from "./agents";
import type { NamedEntity, Upload } from "./shared";

export type Pillar = NamedEntity;

export type Milestone = NamedEntity & {
  objective: string;
  exitCriteria: string;
  status: string;
};

export type Project = {
  northStar: string;
  stage?: string | null;
  agents: Agent[];
  pillars: Pillar[];
  milestones: Milestone[];
};

export type TaskTransition = {
  id: string;
  fromStatus: string;
  toStatus: string;
  justification: string;
  evidenceJson?: string | null;
  actor: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  status: string;
  statusJustification?: string | null;
  statusChangedBy?: string | null;
  statusChangedAt?: string | null;
  version: number;
  impact: number;
  urgency: number;
  acceptance: string;
  ownerAgentId: string;
  pillarId: string;
  milestoneId: string;
  owner?: Agent | null;
  pillar?: Pillar | null;
  milestone?: Milestone | null;
  dependencies?: Pick<Task, "id" | "title" | "status">[];
  transitions: TaskTransition[];
  runs?: AgentRun[];
  uploads?: Upload[];
};

export type DecisionContext = {
  id: string;
  content: string;
  sourceUrl?: string | null;
  actor: string;
  createdAt: string;
};

export type Decision = {
  id: string;
  question: string;
  recommendation?: string | null;
  resolution?: string | null;
  status: string;
  contexts?: DecisionContext[];
  uploads?: Upload[];
};

export type Risk = {
  id: string;
  title: string;
  mitigation?: string | null;
  trigger?: string | null;
  probability: number;
  impact: number;
  status: string;
};

export type ProcurementItem = {
  id: string;
  item: string;
  category: string;
  recommendation?: string | null;
  requirements?: string[];
  status: string;
  budget?: string | number | null;
  ownerAgentId: string;
};

export type Bootstrap = {
  project: Project;
  tasks: Task[];
  decisions: Decision[];
  risks: Risk[];
  procurement: ProcurementItem[];
  runs: AgentRun[];
  pendingQuestions: number;
};
