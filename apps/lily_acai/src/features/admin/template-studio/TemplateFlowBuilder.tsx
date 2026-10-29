import type { SimulationBranch, SimulationNode } from "./template-types";
import type { WhatsAppTemplate } from "../whatsapp-api";

type Props = { templates: WhatsAppTemplate[]; nodes: SimulationNode[]; onChange: (nodes: SimulationNode[]) => void; onStart?: () => void };

function newNode(index: number, templateKey: string): SimulationNode {
  return { id: crypto.randomUUID(), name: `Mensagem ${index + 1}`, trigger: index === 0 ? "início" : "manual", templateKey, response: "", nextNodeId: "", branches: [] };
}

export function TemplateFlowBuilder({ templates, nodes, onChange, onStart }: Props) {
  function update(id: string, key: keyof SimulationNode, value: string) {
    onChange(nodes.map((node) => key === "trigger" && value === "início" && node.id !== id
      ? { ...node, trigger: "manual" }
      : node.id === id ? { ...node, [key]: value } : node));
  }

  function addNode() {
    onChange([...nodes, newNode(nodes.length, templates[0]?.key ?? "")]);
  }

  function removeNode(id: string) {
    onChange(nodes.filter((node) => node.id !== id).map((node) => ({ ...node, nextNodeId: node.nextNodeId === id ? "" : node.nextNodeId, branches: node.branches?.filter((branch) => branch.nextNodeId !== id) })));
  }

  function updateBranch(nodeId: string, branchId: string, key: keyof SimulationBranch, value: string) {
    onChange(nodes.map((node) => node.id === nodeId ? { ...node, branches: (node.branches ?? []).map((branch) => branch.id === branchId ? { ...branch, [key]: value } : branch) } : node));
  }

  function addBranch(nodeId: string) {
    onChange(nodes.map((node) => node.id === nodeId ? { ...node, branches: [...(node.branches ?? []), { id: crypto.randomUUID(), trigger: "botão" as const, response: "", nextNodeId: "" }] } : node));
  }

  function removeBranch(nodeId: string, branchId: string) {
    onChange(nodes.map((node) => node.id === nodeId ? { ...node, branches: node.branches?.filter((branch) => branch.id !== branchId) } : node));
  }

  return <section className="template-flow-builder" aria-label="Árvore de mensagens da automação">
    <header><div><strong>Fluxo da automação</strong><small>Defina o gatilho, a resposta e o próximo passo de cada mensagem.</small></div><div><button type="button" className="button ghost" onClick={onStart} disabled={!nodes.some((node) => node.trigger === "início")}>Testar fluxo</button><button type="button" className="button ghost" onClick={addNode}>Adicionar mensagem</button></div></header>
    {nodes.length === 0 && <p>Sem fluxo configurado. Adicione mensagens para montar a árvore de atendimento.</p>}
    <div className="template-flow-tree">{nodes.map((node, index) => <article className="template-flow-node" key={node.id}>
      <span className="template-flow-node-index">{index + 1}</span>
      <label>Nome<input value={node.name} onChange={(event) => update(node.id, "name", event.target.value)} /></label>
      <label>Entrada<select value={node.trigger} onChange={(event) => update(node.id, "trigger", event.target.value)}><option value="início">Início da conversa</option><option value="manual">Acessada por um ramo</option></select></label>
      <label>Template<select value={node.templateKey} onChange={(event) => update(node.id, "templateKey", event.target.value)}><option value="">Mensagem de texto livre</option>{templates.map((template) => <option key={template.key} value={template.key}>{template.displayName || template.key} · {template.category}</option>)}</select></label>
      <div className="template-flow-branches"><strong>Respostas e próximos passos</strong>{(node.branches ?? []).map((branch) => <div className="template-flow-branch" key={branch.id}>
        <select aria-label="Tipo de gatilho" value={branch.trigger} onChange={(event) => updateBranch(node.id, branch.id, "trigger", event.target.value)}><option value="botão">Botão escolhido</option><option value="texto">Palavra ou frase</option><option value="qualquer resposta">Qualquer resposta</option></select>
        <input aria-label="Opção ou palavra-chave" value={branch.response} onChange={(event) => updateBranch(node.id, branch.id, "response", event.target.value)} placeholder={branch.trigger === "botão" ? "Texto igual ao botão" : branch.trigger === "qualquer resposta" ? "Qualquer resposta do cliente" : "Resposta do cliente"} disabled={branch.trigger === "qualquer resposta"} />
        <select aria-label="Mensagem de destino" value={branch.nextNodeId} onChange={(event) => updateBranch(node.id, branch.id, "nextNodeId", event.target.value)}><option value="">Sem destino</option>{nodes.filter((candidate) => candidate.id !== node.id).map((candidate, candidateIndex) => <option key={candidate.id} value={candidate.id}>Mensagem {candidateIndex + 1}: {candidate.name}</option>)}</select>
        <button type="button" onClick={() => removeBranch(node.id, branch.id)} aria-label="Remover resposta">×</button>
      </div>)}<button type="button" className="button ghost" onClick={() => addBranch(node.id)}>Adicionar resposta</button></div>
      <button type="button" className="template-flow-remove" onClick={() => removeNode(node.id)} aria-label={`Remover ${node.name}`}>Remover</button>
    </article>)}</div>
  </section>;
}
