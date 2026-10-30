const adminAutosaveTimers = new WeakMap<HTMLFormElement, number>();
export function queueAdminFormSave(form: HTMLFormElement) {
  const prior = adminAutosaveTimers.get(form);
  if (prior) window.clearTimeout(prior);
  const status = form.querySelector<HTMLElement>("[data-autosave-status]");
  if (status) status.textContent = "Alteração pendente…";
  adminAutosaveTimers.set(form, window.setTimeout(() => {
    if (status) status.textContent = "Salvando automaticamente…";
    form.requestSubmit();
  }, 650));
}

export function setFormAutosaveStatus(form: HTMLFormElement, text: string, state: "saved" | "saving" | "error") {
  const status = form.querySelector<HTMLElement>("[data-autosave-status]");
  if (status) { status.textContent = text; status.dataset.state = state; }
}
