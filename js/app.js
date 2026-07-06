const STORAGE_KEY = "beautyrecall-crm-state-v2";

const now = new Date();
const iso = (offset = 0) => {
  const date = new Date(now);
  date.setDate(now.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const defaultState = {
  selectedClientId: "c1",
  clients: [
    {
      id: "c1",
      name: "Anna Kowalska",
      phone: "501 122 334",
      email: "anna.kowalska@email.pl",
      channel: "SMS",
      tags: ["VIP", "manicure", "hybryda"],
      birthday: "1992-06-18",
      notes: "Lubi krótkie terminy po pracy, preferuje delikatne róże.",
      createdAt: iso(-48)
    },
    {
      id: "c2",
      name: "Marta Zielińska",
      phone: "603 400 900",
      email: "marta.zielinska@email.pl",
      channel: "Telefon",
      tags: ["koloryzacja", "keratyna"],
      birthday: "1988-11-04",
      notes: "Wrażliwa skóra głowy. Zapisuj produkt użyty przy koloryzacji.",
      createdAt: iso(-32)
    },
    {
      id: "c3",
      name: "Julia Nowak",
      phone: "730 808 120",
      email: "julia.nowak@email.pl",
      channel: "Instagram",
      tags: ["brwi", "laminacja"],
      birthday: "1999-03-21",
      notes: "Najczęściej rezerwuje wizyty online dzień wcześniej.",
      createdAt: iso(-14)
    }
  ],
  appointments: [
    {
      id: "a1",
      clientId: "c1",
      service: "Manicure hybrydowy",
      date: iso(0),
      time: "10:30",
      status: "Potwierdzona",
      price: 150,
      notes: "Kolor nude, baza proteinowa."
    },
    {
      id: "a2",
      clientId: "c2",
      service: "Keratynowe wygładzenie",
      date: iso(0),
      time: "14:00",
      status: "Oczekuje",
      price: 420,
      notes: "Zarezerwować 2,5h."
    },
    {
      id: "a3",
      clientId: "c3",
      service: "Laminacja brwi",
      date: iso(2),
      time: "12:15",
      status: "Potwierdzona",
      price: 120,
      notes: "Dodać farbkę grafitową."
    }
  ],
  reminders: [
    {
      id: "r1",
      clientId: "c1",
      dueDate: iso(1),
      text: "Wysłać przypomnienie o uzupełnieniu hybrydy.",
      done: false
    },
    {
      id: "r2",
      clientId: "c2",
      dueDate: iso(-1),
      text: "Zapytać o efekt po keratynie i zaproponować pielęgnację domową.",
      done: false
    },
    {
      id: "r3",
      clientId: "c3",
      dueDate: iso(4),
      text: "Zaprosić na kontrolę brwi po laminacji.",
      done: true
    }
  ]
};

let state = loadState();
let activeView = "dashboard";
let searchTerm = "";

const el = (selector) => document.querySelector(selector);
const els = (selector) => [...document.querySelectorAll(selector)];
const byId = (id) => document.getElementById(id);
const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const money = (value) => `${Number(value || 0).toLocaleString("pl-PL")} zł`;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.clients)) return saved;
  } catch (error) {
    console.warn("Nie udało się odczytać danych CRM", error);
  }
  return structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  byId("storageStatus").textContent = "Zapisano lokalnie";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

function getClient(clientId) {
  return state.clients.find((client) => client.id === clientId);
}

function getClientName(clientId) {
  return getClient(clientId)?.name || "Nieznany klient";
}

function filteredClients() {
  if (!searchTerm) return state.clients;
  const term = searchTerm.toLowerCase();
  return state.clients.filter((client) => {
    const appointmentText = state.appointments
      .filter((appointment) => appointment.clientId === client.id)
      .map((appointment) => appointment.service)
      .join(" ");
    return [client.name, client.phone, client.email, client.channel, client.notes, client.tags.join(" "), appointmentText]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
}

function filteredAppointments() {
  const appointments = [...state.appointments].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  if (!searchTerm) return appointments;
  const term = searchTerm.toLowerCase();
  return appointments.filter((appointment) =>
    [getClientName(appointment.clientId), appointment.service, appointment.status, appointment.notes, appointment.date]
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

function statusClass(status) {
  if (status === "Oczekuje") return "waiting";
  if (status === "Anulowana") return "cancelled";
  return "";
}

function render() {
  renderMetrics();
  renderTimeline();
  renderReminderStack();
  renderClients();
  renderAppointments();
  renderReminderBoard();
  renderCampaigns();
  renderSelectOptions();
  refreshIcons();
}

function renderMetrics() {
  const today = iso(0);
  const monthRevenue = state.appointments
    .filter((appointment) => appointment.status !== "Anulowana" && appointment.date.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, appointment) => sum + Number(appointment.price || 0), 0);
  const openReminders = state.reminders.filter((reminder) => !reminder.done).length;
  const todayAppointments = state.appointments.filter((appointment) => appointment.date === today && appointment.status !== "Anulowana").length;
  const vipClients = state.clients.filter((client) => client.tags.some((tag) => tag.toLowerCase() === "vip")).length;

  const metrics = [
    ["users", state.clients.length, "klientów w bazie"],
    ["calendar-check", todayAppointments, "wizyty dzisiaj"],
    ["wallet", money(monthRevenue), "obrót w tym miesiącu"],
    ["bell-ring", openReminders, "otwarte przypomnienia"],
    ["sparkles", vipClients, "klientki VIP"]
  ];

  byId("metricGrid").innerHTML = metrics
    .map(([icon, value, label]) => `
      <article class="metric-card">
        <div class="metric-icon"><i data-lucide="${icon}"></i></div>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `)
    .join("");
}

function renderTimeline() {
  const upcoming = filteredAppointments()
    .filter((appointment) => appointment.status !== "Anulowana" && appointment.date >= iso(0))
    .slice(0, 5);

  byId("todayTimeline").innerHTML = upcoming.length
    ? upcoming.map((appointment) => `
        <article class="timeline-item">
          <span class="time-chip">${escapeHtml(appointment.date === iso(0) ? appointment.time : formatDate(appointment.date))}</span>
          <div>
            <strong>${escapeHtml(getClientName(appointment.clientId))}</strong>
            <span class="muted">${escapeHtml(appointment.service)} · ${escapeHtml(appointment.notes || "bez notatki")}</span>
          </div>
          <span class="status-chip ${statusClass(appointment.status)}">${escapeHtml(appointment.status)}</span>
        </article>
      `).join("")
    : `<div class="empty-state">Brak nadchodzących wizyt dla aktualnego filtra.</div>`;
}

function renderReminderStack() {
  const open = state.reminders
    .filter((reminder) => !reminder.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  byId("reminderStack").innerHTML = open.length
    ? open.map((reminder) => reminderCard(reminder)).join("")
    : `<div class="empty-state">Wszystkie przypomnienia są odhaczone.</div>`;
}

function reminderCard(reminder) {
  const overdue = reminder.dueDate < iso(0) && !reminder.done;
  return `
    <article class="stack-item ${overdue ? "overdue" : ""}">
      <strong>${escapeHtml(getClientName(reminder.clientId))}</strong>
      <span class="muted">${escapeHtml(reminder.text)}</span>
      <div class="tag-row">
        <span class="tag-chip">${formatDate(reminder.dueDate)}</span>
        ${overdue ? `<span class="tag-chip">Po terminie</span>` : ""}
      </div>
    </article>
  `;
}

function renderClients() {
  const clients = filteredClients();
  if (!clients.some((client) => client.id === state.selectedClientId) && clients[0]) {
    state.selectedClientId = clients[0].id;
  }

  byId("clientList").innerHTML = clients.length
    ? clients.map((client) => `
        <button class="client-card ${client.id === state.selectedClientId ? "active" : ""}" type="button" data-select-client="${client.id}">
          <strong>${escapeHtml(client.name)}</strong>
          <span class="muted">${escapeHtml(client.phone || "brak telefonu")} · ${escapeHtml(client.channel)}</span>
          <div class="tag-row">${client.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>
        </button>
      `).join("")
    : `<div class="empty-state">Brak klientów dla aktualnego wyszukiwania.</div>`;

  renderClientDetails();
}

function renderClientDetails() {
  const client = getClient(state.selectedClientId);
  const target = byId("clientDetails");
  if (!client) {
    target.innerHTML = `<div class="empty-state">Wybierz klienta z listy.</div>`;
    return;
  }

  const appointments = state.appointments.filter((appointment) => appointment.clientId === client.id);
  const revenue = appointments.reduce((sum, appointment) => sum + Number(appointment.price || 0), 0);
  const lastVisit = appointments.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))[0];

  target.innerHTML = `
    <div class="panel-header">
      <div>
        <p class="eyebrow">Profil klienta</p>
        <h3>${escapeHtml(client.name)}</h3>
      </div>
      <button class="icon-button danger-button" type="button" data-delete-client="${client.id}" aria-label="Usuń klienta">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
    <div class="detail-grid">
      <div class="detail-cell"><span>Telefon</span><strong>${escapeHtml(client.phone || "brak")}</strong></div>
      <div class="detail-cell"><span>E-mail</span><strong>${escapeHtml(client.email || "brak")}</strong></div>
      <div class="detail-cell"><span>Kontakt</span><strong>${escapeHtml(client.channel)}</strong></div>
      <div class="detail-cell"><span>Przychód</span><strong>${money(revenue)}</strong></div>
      <div class="detail-cell"><span>Ostatnia wizyta</span><strong>${lastVisit ? formatDate(lastVisit.date) : "brak"}</strong></div>
      <div class="detail-cell"><span>Urodziny</span><strong>${client.birthday ? formatDate(client.birthday) : "brak"}</strong></div>
    </div>
    <p class="muted">${escapeHtml(client.notes || "Brak notatki.")}</p>
    <div class="tag-row">${client.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>
  `;
}

function renderAppointments() {
  const rows = filteredAppointments();
  byId("appointmentRows").innerHTML = rows.length
    ? rows.map((appointment) => `
        <tr>
          <td><strong>${formatDate(appointment.date)}</strong><br><span class="muted">${escapeHtml(appointment.time)}</span></td>
          <td>${escapeHtml(getClientName(appointment.clientId))}</td>
          <td><strong>${escapeHtml(appointment.service)}</strong><br><span class="muted">${escapeHtml(appointment.notes || "")}</span></td>
          <td><span class="status-chip ${statusClass(appointment.status)}">${escapeHtml(appointment.status)}</span></td>
          <td>${money(appointment.price)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-complete-appointment="${appointment.id}" aria-label="Oznacz jako zakończoną">
                <i data-lucide="check"></i>
              </button>
              <button class="icon-button danger-button" type="button" data-delete-appointment="${appointment.id}" aria-label="Usuń wizytę">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="6"><div class="empty-state">Brak wizyt dla aktualnego filtra.</div></td></tr>`;
}

function renderReminderBoard() {
  const columns = [
    ["Po terminie", (reminder) => !reminder.done && reminder.dueDate < iso(0)],
    ["Do zrobienia", (reminder) => !reminder.done && reminder.dueDate >= iso(0)],
    ["Zrobione", (reminder) => reminder.done]
  ];

  byId("reminderBoard").innerHTML = columns.map(([title, predicate]) => {
    const reminders = state.reminders.filter(predicate);
    return `
      <section class="kanban-column">
        <h4>${title}</h4>
        <div class="stack-list">
          ${reminders.length ? reminders.map((reminder) => `
            <article class="stack-item ${reminder.dueDate < iso(0) && !reminder.done ? "overdue" : ""}">
              <strong>${escapeHtml(getClientName(reminder.clientId))}</strong>
              <span class="muted">${escapeHtml(reminder.text)}</span>
              <div class="tag-row">
                <span class="tag-chip">${formatDate(reminder.dueDate)}</span>
              </div>
              <div class="row-actions">
                <button class="icon-button" type="button" data-toggle-reminder="${reminder.id}" aria-label="Zmień status przypomnienia">
                  <i data-lucide="${reminder.done ? "rotate-ccw" : "check"}"></i>
                </button>
                <button class="icon-button danger-button" type="button" data-delete-reminder="${reminder.id}" aria-label="Usuń przypomnienie">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </article>
          `).join("") : `<div class="empty-state">Pusto</div>`}
        </div>
      </section>
    `;
  }).join("");
}

function renderCampaigns() {
  const segments = [
    ["VIP", state.clients.filter((client) => client.tags.some((tag) => tag.toLowerCase() === "vip")).length],
    ["Bez kolejnej wizyty", state.clients.filter((client) => !state.appointments.some((appointment) => appointment.clientId === client.id && appointment.date >= iso(0))).length],
    ["Urodziny w bazie", state.clients.filter((client) => client.birthday).length]
  ];

  const templates = [
    {
      title: "Przypomnienie o wizycie",
      text: "Cześć {imię}, przypominamy o wizycie w BeautyRecall. Jeśli chcesz zmienić termin, daj nam znać."
    },
    {
      title: "Follow-up po usłudze",
      text: "Cześć {imię}, jak efekt po ostatniej wizycie? Mamy dla Ciebie rekomendację pielęgnacji i wolny termin na kontrolę."
    },
    {
      title: "Powrót po przerwie",
      text: "Cześć {imię}, dawno Cię u nas nie było. Przygotowaliśmy kilka nowych terminów i mały bonus przy kolejnej rezerwacji."
    },
    {
      title: "Urodzinowa wiadomość",
      text: "Cześć {imię}, wszystkiego pięknego z okazji urodzin. Czeka na Ciebie urodzinowy rabat w salonie BeautyRecall."
    }
  ];

  byId("campaignGrid").innerHTML = templates.map((template) => `
    <article class="campaign-card">
      <strong>${escapeHtml(template.title)}</strong>
      <textarea readonly>${escapeHtml(template.text)}</textarea>
      <button class="secondary-button" type="button" data-copy-template="${escapeHtml(template.text)}">
        <i data-lucide="copy"></i>
        <span>Kopiuj</span>
      </button>
    </article>
  `).join("");

  byId("segmentList").innerHTML = segments.map(([name, count]) => `
    <article class="stack-item">
      <strong>${escapeHtml(name)}</strong>
      <span class="muted">${count} kontaktów</span>
    </article>
  `).join("");
}

function renderSelectOptions() {
  const options = state.clients
    .map((client) => `<option value="${client.id}">${escapeHtml(client.name)}</option>`)
    .join("");
  byId("appointmentClientSelect").innerHTML = options;
  byId("reminderClientSelect").innerHTML = options;
}

function switchView(view) {
  activeView = view;
  els(".view").forEach((item) => item.classList.toggle("active", item.id === `${view}View`));
  els(".nav-item").forEach((item) => {
    const selected = item.dataset.view === view;
    item.classList.toggle("active", selected);
    item.toggleAttribute("aria-current", selected);
  });
  byId("viewTitle").textContent = byId(`${view}View`).dataset.title;
}

function openModal(name) {
  const modal = byId(`${name}Modal`);
  if (!modal) return;
  const today = iso(0);
  if (name === "appointment") {
    byId("appointmentForm").elements.date.value = today;
    byId("appointmentForm").elements.time.value = "10:00";
  }
  if (name === "reminder") byId("reminderForm").elements.dueDate.value = iso(7);
  modal.showModal();
  refreshIcons();
}

function closeModals() {
  els("dialog[open]").forEach((dialog) => dialog.close());
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  byId("toastRegion").append(node);
  setTimeout(() => node.remove(), 3600);
}

function handleClientSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const client = {
    id: uid("c"),
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email.trim(),
    channel: data.channel,
    tags: data.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    birthday: data.birthday,
    notes: data.notes.trim(),
    createdAt: iso(0)
  };
  state.clients.unshift(client);
  state.selectedClientId = client.id;
  saveState();
  event.currentTarget.reset();
  closeModals();
  switchView("clients");
  render();
  toast("Klient zapisany.");
}

function handleAppointmentSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.appointments.push({
    id: uid("a"),
    clientId: data.clientId,
    service: data.service.trim(),
    date: data.date,
    time: data.time,
    status: data.status,
    price: Number(data.price || 0),
    notes: data.notes.trim()
  });
  saveState();
  event.currentTarget.reset();
  closeModals();
  switchView("appointments");
  render();
  toast("Wizyta dodana do terminarza.");
}

function handleReminderSubmit(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  state.reminders.push({
    id: uid("r"),
    clientId: data.clientId,
    dueDate: data.dueDate,
    text: data.text.trim(),
    done: false
  });
  saveState();
  event.currentTarget.reset();
  closeModals();
  switchView("reminders");
  render();
  toast("Przypomnienie dodane.");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `beautyrecall-crm-${iso(0)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Eksport gotowy.");
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const nextState = JSON.parse(reader.result);
      if (!Array.isArray(nextState.clients) || !Array.isArray(nextState.appointments)) {
        throw new Error("Nieprawidłowy format pliku");
      }
      state = nextState;
      saveState();
      render();
      toast("Dane zaimportowane.");
    } catch (error) {
      toast(error.message || "Nie udało się zaimportować danych.");
    }
  });
  reader.readAsText(file);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.view) switchView(target.dataset.view);
  if (target.dataset.openModal) openModal(target.dataset.openModal);
  if (target.dataset.closeModal !== undefined) closeModals();
  if (target.dataset.selectClient) {
    state.selectedClientId = target.dataset.selectClient;
    renderClients();
    refreshIcons();
  }
  if (target.dataset.deleteClient && confirm("Usunąć klienta oraz jego wizyty i przypomnienia?")) {
    const id = target.dataset.deleteClient;
    state.clients = state.clients.filter((client) => client.id !== id);
    state.appointments = state.appointments.filter((appointment) => appointment.clientId !== id);
    state.reminders = state.reminders.filter((reminder) => reminder.clientId !== id);
    state.selectedClientId = state.clients[0]?.id || "";
    saveState();
    render();
    toast("Klient usunięty.");
  }
  if (target.dataset.completeAppointment) {
    const appointment = state.appointments.find((item) => item.id === target.dataset.completeAppointment);
    if (appointment) appointment.status = "Zakończona";
    saveState();
    render();
    toast("Wizyta oznaczona jako zakończona.");
  }
  if (target.dataset.deleteAppointment && confirm("Usunąć wizytę?")) {
    state.appointments = state.appointments.filter((appointment) => appointment.id !== target.dataset.deleteAppointment);
    saveState();
    render();
    toast("Wizyta usunięta.");
  }
  if (target.dataset.toggleReminder) {
    const reminder = state.reminders.find((item) => item.id === target.dataset.toggleReminder);
    if (reminder) reminder.done = !reminder.done;
    saveState();
    render();
  }
  if (target.dataset.deleteReminder && confirm("Usunąć przypomnienie?")) {
    state.reminders = state.reminders.filter((reminder) => reminder.id !== target.dataset.deleteReminder);
    saveState();
    render();
    toast("Przypomnienie usunięte.");
  }
  if (target.dataset.copyTemplate) {
    navigator.clipboard.writeText(target.dataset.copyTemplate);
    toast("Szablon skopiowany.");
  }
});

byId("globalSearch").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  render();
});

byId("quickAddButton").addEventListener("click", () => openModal("client"));
byId("exportData").addEventListener("click", exportData);
byId("importDataButton").addEventListener("click", () => byId("importData").click());
byId("importData").addEventListener("change", (event) => importData(event.target.files[0]));
byId("clientForm").addEventListener("submit", handleClientSubmit);
byId("appointmentForm").addEventListener("submit", handleAppointmentSubmit);
byId("reminderForm").addEventListener("submit", handleReminderSubmit);

els("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

render();
