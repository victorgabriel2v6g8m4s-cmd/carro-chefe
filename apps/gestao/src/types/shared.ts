export type EntityId = string;

export type NamedEntity = {
  id: EntityId;
  name: string;
};

export type Upload = {
  id: EntityId;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  actor: string;
  runId?: EntityId | null;
};

export type ScopedReference = {
  type: string;
  id: EntityId;
  label: string;
  route?: string | null;
  description?: string | null;
  detail?: string | null;
};

export type UiState = {
  route?: string | null;
  search?: string | null;
  hash?: string | null;
  sidebarOpen?: boolean | null;
  scrollY?: number | null;
};

export type ExecutionShortcut = {
  id: EntityId;
  label: string;
  description: string;
  route: string;
  emphasis: string;
};
