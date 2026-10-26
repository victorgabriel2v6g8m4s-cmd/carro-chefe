import { useCallback, useEffect, useRef, useState } from "react";

export type AdminAutosaveState = "saved" | "saving" | "error";

export function useAdminAutosave<T>(value: T, save: (value: T) => Promise<void>, delayMs = 650) {
  const serialized = JSON.stringify(value);
  const saveRef = useRef(save);
  const latestRef = useRef(value);
  const savedRef = useRef(serialized);
  const queueRef = useRef<{ value: T; serialized: string } | null>(null);
  const runningRef = useRef(false);
  const [state, setState] = useState<AdminAutosaveState>("saved");
  const [error, setError] = useState("");

  saveRef.current = save;
  latestRef.current = value;

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    while (queueRef.current) {
      const next = queueRef.current;
      queueRef.current = null;
      setState("saving");
      setError("");
      try {
        await saveRef.current(next.value);
        savedRef.current = next.serialized;
        if (!queueRef.current) setState("saved");
      } catch (cause) {
        if (!queueRef.current) {
          queueRef.current = next;
          setState("error");
          setError(cause instanceof Error ? cause.message : "Não foi possível salvar esta alteração.");
          break;
        }
      }
    }
    runningRef.current = false;
  }, []);

  const enqueue = useCallback((nextValue: T, nextSerialized = JSON.stringify(nextValue)) => {
    queueRef.current = { value: nextValue, serialized: nextSerialized };
    void drain();
  }, [drain]);

  useEffect(() => {
    if (serialized === savedRef.current) return;
    const timer = window.setTimeout(() => enqueue(latestRef.current, serialized), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, enqueue, serialized]);

  const retry = useCallback(() => {
    setError("");
    enqueue(value, serialized);
  }, [enqueue, serialized, value]);

  return { state, error, retry };
}

export function AdminAutosaveStatus({ state, error, retry }: {
  state: AdminAutosaveState;
  error?: string;
  retry?: () => void;
}) {
  return <span className={`admin-autosave-status is-${state}`} role={state === "error" ? "alert" : "status"} aria-live="polite">
    {state === "saving" ? "Salvando automaticamente…" : state === "error" ? <>
      {error || "Falha ao salvar."} {retry && <button type="button" onClick={retry}>Tentar novamente</button>}
    </> : "Alterações salvas"}
  </span>;
}
