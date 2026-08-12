const state = {
  plan: null,
  requests: [],
  uploads: [],
  requestStatus: "pending",
  filters: { phase: "", owner: "", status: "", search: "" }
};

const viewTitles = {
  overview: "Visão geral",
  roadmap: "Roteiro",
  tasks: "Tarefas",
  governance: "Decisões & riscos",
  procurement: "Compras",
  agents: "Agentes",
  requests: "Solicitações"
};

const statusLabels = {
  backlog: "Backlog", ready: "Pronta", in_progress: "Em andamento", blocked: "Bloqueada",
  review: "Em revisão", done: "Concluída", cancelled: "Cancelada", pending: "Pendente",
  approved: "Aprovada", rejected: "Rejeitada", open: "Aberto", monitoring: "Monitorando",
  mitigated: "Mitigado", closed: "Fechado", research: "Em pesquisa", shortlisted: "Finalistas",
  ordered: "Comprado", received: "Recebido"
};

const actionLabels = {
  create_task: "Criar tarefa", update_task: "Atualizar tarefa", create_decision: "Registrar decisão",
  update_decision: "Atualizar decisão", create_risk: "Registrar risco", update_risk: "Atualizar risco",
  create_procurement_item: "Criar item de compra", update_procurement_item: "Atualizar compra",
  update_milestone: "Atualizar marco", create_note: "Adicionar nota"
};

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function node(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => element.setAttribute(key, value));
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const type = response.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(body.error || body || "Não foi possível concluir a operação.");
  return body;
}

function toast(message) {
  const target = qs("#toast");
  target.textContent = message;
  target.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => target.classList.remove("is-visible"), 3200);
}

function formatDate(value, withTime = false) {
  if (!value) return "Sem prazo";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function setStatus(target, status) {
  target.className = "status";
  target.dataset.status = status;
  target.textContent = statusLabels[status] || status;
}

function ownerName(id) {
  return state.plan.agents.find((agent) => agent.id === id)?.name || id;
}

function pillarName(id) {
  return state.plan.pillars.find((pillar) => pillar.id === id)?.name || id;
}

function priority(task) {
  return Number(task.impact) * Number(task.urgency);
}

function isTaskActionable(task) {
  return ["ready", "in_progress", "review"].includes(task.status);
}

function renderMetrics() {
  const tasks = state.plan.tasks;
  const metrics = [
    [tasks.filter((task) => task.status === "done").length, "Tarefas concluídas", `de ${tasks.length} mapeadas`],
    [tasks.filter(isTaskActionable).length, "Prontas para agir", "sem dependência bloqueante"],
    [state.plan.decisions.filter((item) => item.status === "open").length, "Decisões abertas", "precisam de responsável"],
    [state.plan.risks.filter((item) => item.status === "open" && item.impact >= 4).length, "Riscos relevantes", "impacto 4 ou 5"]
  ];
  const target = qs("#metrics");
  target.replaceChildren(...metrics.map(([value, label, detail]) => node("div", { className: "metric" }, [node("span", { text: label }), node("strong", { text: value }), node("small", { text: detail })])));
}

function renderGates() {
  const activeIndex = Math.max(0, state.plan.milestones.findIndex((item) => item.status === "in_progress"));
  const target = qs("#overview-gates");
  target.replaceChildren(...state.plan.milestones.map((gate, index) => node("div", { className: `gate ${index === activeIndex ? "is-active" : ""}` }, [node("span", { text: gate.id }), node("b", { text: gate.name })])));

  const roadmap = qs("#roadmap");
  roadmap.replaceChildren(...state.plan.milestones.map((gate) => {
    const content = node("div", { className: "roadmap-content" }, [
      node("div", {}, [node("span", { className: "eyebrow", text: statusLabels[gate.status] || gate.status }), node("h3", { text: gate.name }), node("p", { text: gate.objective })]),
      node("div", { className: "roadmap-exit" }, [node("span", { text: "Critério de saída" }), node("p", { text: gate.exitCriteria })]),
      node("div", {}, [node("span", { className: "score", text: `${state.plan.tasks.filter((task) => task.phase === gate.id).length} tarefas` })])
    ]);
    return node("article", { className: `roadmap-item ${gate.status === "in_progress" ? "is-active" : ""}` }, [node("div", { className: "roadmap-key", text: gate.id }), content]);
  }));
}

function renderOverviewLists() {
  const ranked = [...state.plan.tasks].filter((task) => task.status !== "done" && task.status !== "cancelled").sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id)).slice(0, 5);
  qs("#priority-list").replaceChildren(...ranked.map((task, index) => node("div", { className: "rank-item" }, [
    node("span", { text: String(index + 1).padStart(2, "0") }),
    node("div", {}, [node("strong", { text: task.title }), node("small", { text: `${task.phase} · ${ownerName(task.owner)}` })]),
    node("b", { className: "score", text: priority(task) })
  ])));
  const decisions = state.plan.decisions.filter((item) => item.status === "open").slice(0, 4);
  qs("#decision-preview").replaceChildren(...decisions.map((decision) => node("div", { className: "decision-mini" }, [node("strong", { text: decision.question }), node("span", { text: `${decision.id} · ${ownerName(decision.owner)}` })])));
}

function fillSelect(select, entries, label, value) {
  const current = select.value;
  select.replaceChildren(node("option", { text: label, attrs: { value: "" } }), ...entries.map((entry) => node("option", { text: entry.label, attrs: { value: entry.value } })));
  select.value = value ?? current;
}

function renderTaskControls() {
  fillSelect(qs("#filter-phase"), state.plan.milestones.map((item) => ({ value: item.id, label: `${item.id} · ${item.name}` })), "Todas", state.filters.phase);
  fillSelect(qs("#filter-owner"), state.plan.agents.map((item) => ({ value: item.id, label: item.name })), "Todos", state.filters.owner);
  const statuses = [...new Set(state.plan.tasks.map((item) => item.status))].map((value) => ({ value, label: statusLabels[value] || value }));
  fillSelect(qs("#filter-status"), statuses, "Todos", state.filters.status);

  const actorEntries = state.plan.agents.map((item) => ({ value: item.id, label: `${item.id} · ${item.name}` }));
  fillSelect(qs("#request-actor"), actorEntries, "Selecione", qs("#request-actor").value);
  fillSelect(qs("#reviewer"), actorEntries, "Selecione", qs("#reviewer").value || "AG-GESTAO");
  fillSelect(qs("#upload-actor"), actorEntries, "Selecione", qs("#upload-actor").value);
  fillSelect(qs("#upload-task"), state.plan.tasks.map((item) => ({ value: item.id, label: `${item.id} · ${item.title}` })), "Sem vínculo", qs("#upload-task").value);
}

function filteredTasks() {
  const search = state.filters.search.toLocaleLowerCase("pt-BR");
  return state.plan.tasks.filter((task) => (!state.filters.phase || task.phase === state.filters.phase) &&
    (!state.filters.owner || task.owner === state.filters.owner) && (!state.filters.status || task.status === state.filters.status) &&
    (!search || `${task.id} ${task.title}`.toLocaleLowerCase("pt-BR").includes(search)));
}

function renderTasks() {
  const tasks = filteredTasks().sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id));
  qs("#task-summary").textContent = `${tasks.length} de ${state.plan.tasks.length} tarefas visíveis.`;
  const tbody = qs("#task-table");
  if (!tasks.length) {
    const row = node("tr");
    const cell = node("td", { className: "empty", text: "Nenhuma tarefa corresponde aos filtros.", attrs: { colspan: "6" } });
    row.append(cell); tbody.replaceChildren(row);
  } else {
    tbody.replaceChildren(...tasks.map((task) => {
      const status = node("span"); setStatus(status, task.status);
      const action = node("button", { className: "table-action", text: "Propor atualização", attrs: { type: "button", "data-update-task": task.id } });
      const row = node("tr");
      row.append(
        node("td", { className: "task-title" }, [node("strong", { text: task.title }), node("span", { text: `${task.id} · ${pillarName(task.pillar)}` })]),
        node("td", { text: task.phase }), node("td", { text: ownerName(task.owner) }), node("td", {}, node("span", { className: "score", text: priority(task) })),
        node("td", {}, status), node("td", {}, action)
      );
      return row;
    }));
  }

  const matrix = qs("#priority-matrix");
  const plotted = [...tasks].sort((a, b) => priority(b) - priority(a)).slice(0, 20);
  matrix.replaceChildren(...plotted.map((task) => {
    const dot = node("button", { className: "matrix-dot", text: task.id.replace("TASK-", ""), attrs: { type: "button", "aria-label": `${task.id}: ${task.title}. Impacto ${task.impact}, urgência ${task.urgency}`, title: task.title } });
    dot.style.left = `${8 + ((task.urgency - 1) / 4) * 84}%`;
    dot.style.bottom = `${8 + ((task.impact - 1) / 4) * 84}%`;
    return dot;
  }));
}

function renderGovernance() {
  const decisions = state.plan.decisions.filter((item) => item.status === "open");
  qs("#decision-count").textContent = `${decisions.length} abertas`;
  qs("#decision-list").replaceChildren(...decisions.map((item) => node("article", { className: "record-card" }, [
    node("header", {}, [node("strong", { text: item.question }), node("span", { text: item.id })]),
    node("p", { text: item.recommendation || "Sem recomendação registrada." }),
    node("p", { text: `Responsável: ${ownerName(item.owner)} · ${item.due ? `até ${formatDate(item.due)}` : "prazo a definir"}` })
  ])));
  const risks = state.plan.risks.filter((item) => item.status === "open").sort((a, b) => b.impact * b.probability - a.impact * a.probability);
  qs("#risk-count").textContent = `${risks.length} ativos`;
  qs("#risk-list").replaceChildren(...risks.map((item) => {
    const meter = node("div", { className: "risk-meter", attrs: { "aria-label": `Exposição ${item.impact * item.probability} de 25` } }, Array.from({ length: 5 }, (_, index) => node("i", { className: index < Math.ceil(item.impact * item.probability / 5) ? "on" : "" })));
    return node("article", { className: "record-card" }, [node("header", {}, [node("strong", { text: item.title }), node("span", { text: item.id })]), node("p", { text: item.mitigation }), meter, node("p", { text: `P ${item.probability} × I ${item.impact} · ${ownerName(item.owner)}` })]);
  }));
}

function renderProcurement() {
  qs("#procurement-list").replaceChildren(...state.plan.procurement.map((item) => {
    const status = node("span"); setStatus(status, item.status);
    return node("article", { className: "purchase-card" }, [
      node("header", {}, [node("span", { className: "eyebrow", text: `${item.id} · ${item.category}` }), node("span", { className: "score", text: item.options?.length ? `${item.options.length} opções` : "cotação" })]),
      node("h3", { text: item.item }), node("ul", {}, item.requirements.slice(0, 5).map((requirement) => node("li", { text: requirement }))), status
    ]);
  }));
}

function renderAgents() {
  qs("#agent-list").replaceChildren(...state.plan.agents.map((agent) => node("article", { className: "agent-card" }, [
    node("span", { className: "agent-id", text: agent.id }), node("h3", { text: agent.name }), node("p", { text: agent.mission }),
    node("footer", {}, [node("span", { text: "Cadência" }), node("strong", { text: agent.cadence })])
  ])));
}

function requestSummary(request) {
  const p = request.payload;
  return p.title || p.question || p.item || p.content || p.id || request.reason;
}

function renderRequests() {
  const pending = state.requests.filter((item) => item.status === "pending").length;
  qs("#pending-badge").textContent = pending;
  const visible = state.requestStatus ? state.requests.filter((item) => item.status === state.requestStatus) : state.requests;
  const target = qs("#request-list");
  if (!visible.length) {
    target.replaceChildren(node("div", { className: "empty", text: state.requestStatus === "pending" ? "A fila está limpa. Nenhuma solicitação aguarda revisão." : "Nenhum registro neste filtro." }));
  } else {
    target.replaceChildren(...visible.map((request) => {
      const status = node("span"); setStatus(status, request.status);
      const actions = node("div", { className: "request-actions" });
      if (request.status === "pending") {
        actions.append(node("button", { className: "approve", text: "Aprovar", attrs: { type: "button", "data-review": request.id, "data-decision": "approve" } }), node("button", { className: "reject", text: "Rejeitar", attrs: { type: "button", "data-review": request.id, "data-decision": "reject" } }));
      } else actions.append(status);
      return node("article", { className: "request-card" }, [
        node("div", {}, [node("span", { className: "request-type", text: actionLabels[request.action] || request.action }), node("div", { className: "request-meta" }, node("span", { text: request.id }))]),
        node("div", {}, [node("h3", { text: requestSummary(request) }), node("p", { text: request.reason }), node("div", { className: "request-meta" }, [node("span", { text: request.actor }), node("span", { text: formatDate(request.createdAt, true) }), request.reviewer ? node("span", { text: `Revisado por ${request.reviewer}` }) : null])]), actions
      ]);
    }));
  }

  const uploads = qs("#upload-list");
  if (!state.uploads.length) uploads.replaceChildren(node("div", { className: "empty", text: "Nenhuma evidência enviada." }));
  else uploads.replaceChildren(...state.uploads.slice(0, 12).map((item) => node("a", { className: "upload-item", attrs: { href: `/api/uploads/${item.id}` } }, [node("span", { text: item.filename }), node("small", { text: `${(item.size / 1024).toFixed(0)} KB` })])));
}

function renderMeta() {
  qs("#plan-version").textContent = state.plan.meta.version;
  qs("#updated-at").textContent = `Plano v${state.plan.meta.version} · atualizado ${formatDate(state.plan.meta.updatedAt, true)}`;
}

function renderAll() {
  renderMeta(); renderMetrics(); renderGates(); renderOverviewLists(); renderTaskControls(); renderTasks(); renderGovernance(); renderProcurement(); renderAgents(); renderRequests(); renderDynamicFields();
}

function showView(name) {
  qsa(".view").forEach((view) => view.classList.toggle("is-visible", view.id === `view-${name}`));
  qsa(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === name));
  qs("#view-title").textContent = viewTitles[name];
  document.body.classList.remove("menu-open");
  qs("#menu-button").setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function optionMarkup(entries, placeholder = "Selecione") {
  return `<option value="">${placeholder}</option>${entries.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}`;
}

function renderDynamicFields() {
  if (!state.plan) return;
  const kind = qs("#request-kind").value;
  const target = qs("#dynamic-fields");
  const agents = state.plan.agents.map((item) => [item.id, item.name]);
  const phases = state.plan.milestones.map((item) => [item.id, `${item.id} · ${item.name}`]);
  const pillars = state.plan.pillars.map((item) => [item.id, item.name]);
  const tasks = state.plan.tasks.map((item) => [item.id, `${item.id} · ${item.title}`]);

  if (kind === "create_task") target.innerHTML = `<div class="form-grid"><label class="span-2">Título<input name="title" required maxlength="180"></label><label>Pilar<select name="pillar" required>${optionMarkup(pillars)}</select></label><label>Fase<select name="phase" required>${optionMarkup(phases)}</select></label><label>Responsável<select name="owner" required>${optionMarkup(agents)}</select></label><label>Impacto<select name="impact" required>${optionMarkup([[1,"1 · baixo"],[2,"2"],[3,"3 · médio"],[4,"4"],[5,"5 · crítico"]])}</select></label><label>Urgência<select name="urgency" required>${optionMarkup([[1,"1 · sem pressa"],[2,"2"],[3,"3 · nesta fase"],[4,"4"],[5,"5 · imediato"]])}</select></label><label>Dependências<input name="dependencies" placeholder="TASK-..., separadas por vírgula"></label><label class="span-2">Critério de aceite<textarea name="acceptance" rows="3" required></textarea></label></div>`;
  else if (kind === "update_task") target.innerHTML = `<div class="form-grid"><label class="span-2">Tarefa<select name="id" id="update-task-id" required>${optionMarkup(tasks)}</select></label><label>Novo status<select name="status">${optionMarkup([["backlog","Backlog"],["ready","Pronta"],["in_progress","Em andamento"],["blocked","Bloqueada"],["review","Em revisão"],["done","Concluída"],["cancelled","Cancelada"]],"Manter")}</select></label><label>Evidências<input name="evidence" placeholder="UP-... ou caminho, separados por vírgula"></label><label class="span-2">Novo critério de aceite (opcional)<textarea name="acceptance" rows="2"></textarea></label></div><p class="field-note">Pelo menos um campo de atualização precisa ser preenchido.</p>`;
  else if (kind === "create_decision") target.innerHTML = `<div class="form-grid"><label class="span-2">Pergunta a decidir<textarea name="question" rows="2" required></textarea></label><label>Responsável<select name="owner" required>${optionMarkup(agents)}</select></label><label>Prazo<input name="due" type="date"></label><label class="span-2">Recomendação inicial<textarea name="recommendation" rows="3"></textarea></label></div>`;
  else if (kind === "create_risk") target.innerHTML = `<div class="form-grid"><label class="span-2">Risco<input name="title" required></label><label>Responsável<select name="owner" required>${optionMarkup(agents)}</select></label><label>Probabilidade<select name="probability" required>${optionMarkup([[1,"1 · rara"],[2,"2"],[3,"3 · possível"],[4,"4"],[5,"5 · provável"]])}</select></label><label>Impacto<select name="impact" required>${optionMarkup([[1,"1 · baixo"],[2,"2"],[3,"3"],[4,"4"],[5,"5 · crítico"]])}</select></label><label>Gatilho observável<input name="trigger"></label><label class="span-2">Mitigação<textarea name="mitigation" rows="3" required></textarea></label></div>`;
  else if (kind === "create_procurement_item") target.innerHTML = `<div class="form-grid"><label class="span-2">Item ou serviço<input name="item" required></label><label>Categoria<select name="category" required>${optionMarkup([["equipamento","Equipamento"],["insumo","Insumo"],["consumível","Consumível"],["assinatura","Assinatura"],["tecnologia","Tecnologia"],["serviço","Serviço"]])}</select></label><label>Responsável<select name="owner" required>${optionMarkup(agents)}</select></label><label>Necessário até<input name="neededBy" type="date"></label><label>Teto de orçamento<input name="budgetCeiling" type="number" min="0" step="0.01"></label><label class="span-2">Requisitos eliminatórios<textarea name="requirements" rows="3" required placeholder="Um por linha"></textarea></label></div>`;
  else target.innerHTML = `<div class="form-grid"><label class="span-2">Título<input name="title" required></label><label>Responsável<select name="owner" required>${optionMarkup(agents)}</select></label><label class="span-2">Conteúdo<textarea name="content" rows="5" required></textarea></label></div>`;
}

function splitList(value, delimiter = /[,\n]/) {
  return String(value || "").split(delimiter).map((item) => item.trim()).filter(Boolean);
}

function buildRequest(form) {
  const data = new FormData(form);
  const action = data.get("kind");
  const base = { actor: data.get("actor"), action, reason: data.get("reason"), payload: {} };
  if (action === "create_task") base.payload = { title: data.get("title"), pillar: data.get("pillar"), phase: data.get("phase"), owner: data.get("owner"), impact: Number(data.get("impact")), urgency: Number(data.get("urgency")), acceptance: data.get("acceptance"), dependencies: splitList(data.get("dependencies")) };
  if (action === "update_task") {
    const patch = {};
    if (data.get("status")) patch.status = data.get("status");
    if (data.get("acceptance")) patch.acceptance = data.get("acceptance");
    if (data.get("evidence")) patch.evidence = splitList(data.get("evidence"));
    base.payload = { id: data.get("id"), patch };
  }
  if (action === "create_decision") base.payload = { question: data.get("question"), owner: data.get("owner"), due: data.get("due") || null, recommendation: data.get("recommendation") || null };
  if (action === "create_risk") base.payload = { title: data.get("title"), owner: data.get("owner"), probability: Number(data.get("probability")), impact: Number(data.get("impact")), trigger: data.get("trigger") || null, mitigation: data.get("mitigation") };
  if (action === "create_procurement_item") base.payload = { item: data.get("item"), category: data.get("category"), owner: data.get("owner"), neededBy: data.get("neededBy") || null, budgetCeiling: data.get("budgetCeiling") ? Number(data.get("budgetCeiling")) : null, requirements: splitList(data.get("requirements"), /\n/) };
  if (action === "create_note") base.payload = { title: data.get("title"), content: data.get("content"), owner: data.get("owner") };
  return base;
}

async function refresh() {
  const [plan, requests, uploads] = await Promise.all([api("/api/plan"), api("/api/requests"), api("/api/uploads")]);
  state.plan = plan; state.requests = requests; state.uploads = uploads;
  renderAll();
}

function openDialog(id) {
  const dialog = qs(`#${id}`);
  if (id === "request-dialog") { qs("#request-message").textContent = ""; renderDynamicFields(); }
  if (id === "upload-dialog") qs("#upload-message").textContent = "";
  dialog.showModal();
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]"); if (nav) showView(nav.dataset.view);
  const go = event.target.closest("[data-go-view]"); if (go) showView(go.dataset.goView);
  const opener = event.target.closest("[data-open-dialog]"); if (opener) openDialog(opener.dataset.openDialog);
  const closer = event.target.closest(".close-dialog"); if (closer) closer.closest("dialog").close();
  const update = event.target.closest("[data-update-task]");
  if (update) {
    qs("#request-kind").value = "update_task"; renderDynamicFields();
    qs("#request-form [name=reason]").value = `Atualizar ${update.dataset.updateTask} com evidência verificável`;
    qs("#update-task-id").value = update.dataset.updateTask; openDialog("request-dialog");
  }
  const review = event.target.closest("[data-review]");
  if (review) {
    const form = qs("#review-form"); form.elements.requestId.value = review.dataset.review; form.elements.decision.value = review.dataset.decision;
    qs("#review-title").textContent = review.dataset.decision === "approve" ? `Aprovar ${review.dataset.review}` : `Rejeitar ${review.dataset.review}`;
    qs("#review-submit").textContent = review.dataset.decision === "approve" ? "Aprovar e aplicar" : "Confirmar rejeição";
    qs("#review-message").textContent = ""; openDialog("review-dialog");
  }
  const tab = event.target.closest("[data-request-status]");
  if (tab) { state.requestStatus = tab.dataset.requestStatus; qsa("[data-request-status]").forEach((item) => item.classList.toggle("is-active", item === tab)); renderRequests(); }
});

qs("#menu-button").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open"); qs("#menu-button").setAttribute("aria-expanded", String(open));
});
qs("#request-kind").addEventListener("change", renderDynamicFields);

for (const [id, key] of [["#filter-phase", "phase"], ["#filter-owner", "owner"], ["#filter-status", "status"]]) {
  qs(id).addEventListener("change", (event) => { state.filters[key] = event.target.value; renderTasks(); });
}
qs("#filter-search").addEventListener("input", (event) => { state.filters.search = event.target.value; renderTasks(); });

qs("#request-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const message = qs("#request-message"); message.textContent = "Enviando…";
  try {
    const body = buildRequest(form);
    await api("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    form.reset(); qs("#request-kind").value = "create_task"; await refresh();
    message.textContent = "Solicitação criada."; toast("Solicitação enviada para revisão."); setTimeout(() => qs("#request-dialog").close(), 500);
  } catch (error) { message.textContent = error.message; }
});

qs("#review-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const message = qs("#review-message"); message.textContent = "Aplicando…";
  try {
    await api(`/api/requests/${data.get("requestId")}/${data.get("decision")}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewer: data.get("reviewer"), note: data.get("note") }) });
    await refresh(); toast(data.get("decision") === "approve" ? "Mudança aprovada e aplicada." : "Solicitação rejeitada e registrada."); qs("#review-dialog").close(); form.reset();
  } catch (error) { message.textContent = error.message; }
});

qs("#upload-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get("file"); const message = qs("#upload-message"); message.textContent = "Enviando…";
  try {
    const extension = file.name.split(".").pop().toLowerCase();
    const fallbackTypes = { md: "text/markdown", csv: "text/csv", txt: "text/plain", json: "application/json", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
    const mime = file.type || fallbackTypes[extension] || "application/octet-stream";
    const params = new URLSearchParams({ filename: file.name, actor: data.get("actor") }); if (data.get("taskId")) params.set("taskId", data.get("taskId"));
    await api(`/api/uploads?${params}`, { method: "POST", headers: { "Content-Type": mime }, body: file });
    await refresh(); toast("Evidência enviada e registrada."); qs("#upload-dialog").close(); form.reset();
  } catch (error) { message.textContent = error.message; }
});

refresh().catch((error) => {
  qs("#sync-state").textContent = "Falha ao carregar"; toast(error.message); console.error(error);
});
