import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { DataProvider } from "./app/data";
import { Layout } from "./app/Layout";
import { Agents } from "./routes/Agents";
import { AgentRunDetail } from "./routes/AgentRunDetail";
import { Governance } from "./routes/Governance";
import { Overview } from "./routes/Overview";
import { Procurement } from "./routes/Procurement";
import { Questions } from "./routes/Questions";
import { Roadmap } from "./routes/Roadmap";
import { TaskDetail } from "./routes/TaskDetail";
import { Tasks } from "./routes/Tasks";
import { api } from "./api/client";
import { Commands } from "./routes/Commands";
import { CommandDetail } from "./routes/CommandDetail";
import { IntegratedBrowser } from "./routes/IntegratedBrowser";
import { Registry } from "./routes/Registry";
import { ResourceViewer } from "./routes/ResourceViewer";
import { Knowledge } from "./routes/Knowledge";
import { messages } from "./i18n";
import type { UiState } from "./types";
import "./styles.css";

function Resume() {
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => { api<UiState>("/api/v1/me/ui-state/gestao").then((state) => setTarget(state.route ? `${state.route}${state.search ?? ""}${state.hash ?? ""}` : "/gestao/visao-geral")).catch(() => setTarget("/gestao/visao-geral")); }, []);
  return target ? <Navigate replace to={target} /> : <section className="panel loading">{messages.common.states.loading}</section>;
}

const router = createBrowserRouter([
  { path: "/gestao", element: <Resume /> },
  {
    path: "/gestao",
    element: <Layout />,
    children: [
      { path: "visao-geral", element: <Overview /> },
      { path: "comandos", element: <Commands /> },
      { path: "comandos/:intentId", element: <CommandDetail /> },
      { path: "roteiro", element: <Roadmap /> },
      { path: "tarefas", element: <Tasks /> },
      { path: "tarefas/:taskId", element: <TaskDetail /> },
      { path: "agentes", element: <Agents /> },
      { path: "agentes/execucoes/:runId", element: <AgentRunDetail /> },
      { path: "perguntas", element: <Questions /> },
      { path: "governanca", element: <Governance /> },
      { path: "compras", element: <Procurement /> },
      { path: "registro", element: <Registry /> },
      { path: "navegador", element: <IntegratedBrowser /> },
      { path: "conhecimento", element: <Knowledge /> },
      { path: "visualizador", element: <ResourceViewer /> },
      { index: true, element: <Navigate replace to="visao-geral" /> },
      { path: "*", element: <section className="panel empty"><p>Página não encontrada.</p></section> }
    ]
  }
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode><DataProvider><RouterProvider router={router} /></DataProvider></StrictMode>
);
