import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";

export type Bootstrap = { project: any; tasks: any[]; decisions: any[]; risks: any[]; procurement: any[]; runs: any[]; pendingQuestions: number };
const DataContext = createContext<{ data: Bootstrap | null; loading: boolean; error: string | null; refresh: () => Promise<void> } | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setData(await api<Bootstrap>("/api/v1/bootstrap")); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const stream = new EventSource("/api/v1/events");
    const update = () => void refresh();
    ["task.status.changed", "agent.run.created", "agent.run.updated", "agent.question.asked", "agent.answer.submitted", "agent.step.updated", "intent.created", "intent.started", "intent.completed", "intent.failed"].forEach((name) => stream.addEventListener(name, update));
    return () => stream.close();
  }, [refresh]);
  return <DataContext.Provider value={{ data, loading, error, refresh }}>{children}</DataContext.Provider>;
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider ausente");
  return value;
}
