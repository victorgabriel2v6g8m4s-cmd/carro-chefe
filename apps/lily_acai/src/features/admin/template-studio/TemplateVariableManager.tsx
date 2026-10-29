import { useState, type DragEvent, type KeyboardEvent, type MouseEvent, type MutableRefObject } from "react";
import type { MetaTemplateComponent } from "./template-types";
import { normalizeVariableName, removeVariable, variableUsage } from "./template-text";

type Props = {
  names: string[];
  components: MetaTemplateComponent[];
  onChange: (names: string[], components: MetaTemplateComponent[]) => void;
  activeInsertRef: MutableRefObject<((number: number, name?: string) => void) | null>;
  disabled?: boolean;
};

export function TemplateVariableManager({ names, components, onChange, activeInsertRef, disabled }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function addVariable() {
    const name = normalizeVariableName(value);
    if (!name) { setError("Digite um nome para a variável."); return; }
    if (names.includes(name)) { setError("Esse nome já está cadastrado."); return; }
    if (names.length >= 50) { setError("O template atingiu o limite de 50 variáveis."); return; }
    setError(""); setValue(""); onChange([...names, name], components);
  }

  function submitVariable(event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    event.stopPropagation();
    addVariable();
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, index: number) {
    event.dataTransfer.setData("application/x-cooklily-template-variable", String(index + 1));
    event.dataTransfer.effectAllowed = "copy";
  }

  function remove(index: number) {
    const result = removeVariable(components, names, index + 1);
    onChange(result.variableNames, result.components as MetaTemplateComponent[]);
  }

  function insertAtCurrentEditor(index: number, name: string) {
    activeInsertRef.current?.(index + 1, name);
  }

  return <fieldset className="template-variable-manager template-span-two">
    <legend>Variáveis do template</legend>
    <p>Crie nomes simples e insira no texto: arraste uma ficha ou toque nela depois de posicionar o cursor. O painel converte tudo para variáveis numeradas da Meta.</p>
    <div className="template-variable-create">
      <label>Nome da variável<input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitVariable(event); }} maxLength={60} placeholder="ex.: numero_do_pedido" disabled={disabled} /></label>
      <button className="button ghost" type="button" onClick={submitVariable} disabled={disabled}>Adicionar variável</button>
    </div>
    {error && <small className="error" role="alert">{error}</small>}
    <div className="template-variable-list" aria-label="Variáveis disponíveis">
      {names.map((name, index) => {
        const used = variableUsage(components, index + 1);
        return <div className="template-variable-item" key={`${name}-${index}`}>
          <button type="button" draggable={!disabled} onDragStart={(event) => startDrag(event, index)} onMouseDown={(event) => event.preventDefault()} onClick={() => insertAtCurrentEditor(index, name)} disabled={disabled} title="Arraste ou toque para inserir no texto">
            <span aria-hidden="true">⠿</span><code>{name}</code><small>{used ? `${used} uso${used === 1 ? "" : "s"}` : "toque para inserir"}</small>
          </button>
          <button type="button" className="template-variable-remove" onClick={() => remove(index)} disabled={disabled} aria-label={`Remover variável ${name}`} title="Remove a variável e suas ocorrências do texto">×</button>
        </div>;
      })}
      {names.length === 0 && <small>Nenhuma variável criada ainda.</small>}
    </div>
  </fieldset>;
}

