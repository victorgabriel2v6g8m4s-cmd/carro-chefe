import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../api/client";

export type Bootstrap = { project: any; tasks: any[]; decisions: any[]; risks: any[]; procurement: any[]; runs: any[]; pendingQuestions: number };
const DataContext = createContext<{ data: Bootstrap | null; loading: boolean; error: string | null; refresh: () => Promise<void> } | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refresh = useCallback(async () => {
    try { setData(await api<Bootstrap>("/api/v1/bootstrap")); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const stream = new EventSource("/api/v1/events");
    const update = () => {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => void refresh(), 250);
    };
    ["task.status.changed", "agent.run.created", "agent.run.updated", "agent.run.completed", "agent.run.attention", "agent.question.asked", "agent.answer.submitted", "agent.step.updated", "agent.report.updated", "agent.communication.created", "decision.context.added", "decision.status.changed", "intent.created", "intent.started", "intent.completed", "intent.failed", "knowledge.node.created", "knowledge.node.updated", "knowledge.node.archived", "knowledge.node.captured"].forEach((name) => stream.addEventListener(name, update));
    return () => { clearTimeout(refreshTimer.current); stream.close(); };
  }, [refresh]);
  return <DataContext.Provider value={{ data, loading, error, refresh }}>{children}</DataContext.Provider>;
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider ausente");
  return value;
}
