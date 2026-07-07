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
      instagram: "anna.beauty",
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
      instagram: "marta.hair",
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
      instagram: "julia.brows",
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
let activeCampaignSegment = "vip";
let searchTerm = "";

const el = (selector) => document.querySelector(selector);
const els = (selector) => [...document.querySelectorAll(selector)];
const byId = (id) => document.getElementById(id);
const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const money = (value) => `${Number(value || 0).toLocaleString("pl-PL")} zł`;
const defaultMessage = "Cześć {imię}, przypominamy o wizycie w BeautyRecall. Daj znać, czy termin nadal pasuje.";

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

function firstName(client) {
  return (client?.name || "").trim().split(/\s+/)[0] || "tam";
}

function cleanPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9) return `48${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

function cleanInstagram(value) {
  return String(value || "").trim().replace(/^@/, "");
}

function messageForClient(message, client) {
  return String(message || defaultMessage)
    .replaceAll("{imię}", firstName(client))
    .replaceAll("{imie}", firstName(client))
    .replaceAll("{name}", firstName(client));
}

function contactUrl(client, channel, message) {
  const phone = cleanPhone(client.phone);
  const text = encodeURIComponent(messageForClient(message, client));
  if (channel === "call") return phone ? `tel:+${phone}` : "";
  if (channel === "sms") return phone ? `sms:+${phone}?&body=${text}` : "";
  if (channel === "whatsapp") return phone ? `https://wa.me/${phone}?text=${text}` : "";
  if (channel === "email") {
    if (!client.email) return "";
    return `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent("BeautyRecall")}&body=${text}`;
  }
  if (channel === "instagram") {
    const username = cleanInstagram(client.instagram);
    return username ? `https://ig.me/m/${encodeURIComponent(username)}` : "";
  }
  return "";
}

function contactLabel(channel) {
  return {
    call: "numeru telefonu",
    sms: "numeru telefonu",
    whatsapp: "numeru telefonu",
    email: "adresu e-mail",
    instagram: "nazwy użytkownika Instagram"
  }[channel] || "danych kontaktowych";
}

function filteredClients() {
  if (!searchTerm) return state.clients;
  const term = searchTerm.toLowerCase();
  return state.clients.filter((client) => {
    const appointmentText = state.appointments
      .filter((appointment) => appointment.clientId === client.id)
      .map((appointment) => appointment.service)
      .join(" ");
    return [client.name, client.phone, client.email, client.instagram, client.channel, client.notes, client.tags.join(" "), appointmentText]
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
      ${reminderContactActions(reminder)}
    </article>
  `;
}

function reminderContactActions(reminder) {
  const client = getClient(reminder.clientId);
  if (!client) return "";
  return `
    <div class="reminder-actions" aria-label="Kontakt do przypomnienia">
      ${contactButton(client, "whatsapp", "send", "WhatsApp", reminder.text)}
      ${contactButton(client, "sms", "message-square", "SMS", reminder.text)}
      ${contactButton(client, "call", "phone-call", "Dzwoń", reminder.text)}
      ${contactButton(client, "email", "mail", "E-mail", reminder.text)}
      ${contactButton(client, "instagram", "instagram", "IG", reminder.text)}
    </div>
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
          <span class="muted">${escapeHtml(client.phone || "brak telefonu")} · ${escapeHtml(client.channel)}${client.instagram ? ` · @${escapeHtml(cleanInstagram(client.instagram))}` : ""}</span>
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
      <div class="detail-cell"><span>Instagram</span><strong>${client.instagram ? `@${escapeHtml(cleanInstagram(client.instagram))}` : "brak"}</strong></div>
      <div class="detail-cell"><span>Kontakt</span><strong>${escapeHtml(client.channel)}</strong></div>
      <div class="detail-cell"><span>Przychód</span><strong>${money(revenue)}</strong></div>
      <div class="detail-cell"><span>Ostatnia wizyta</span><strong>${lastVisit ? formatDate(lastVisit.date) : "brak"}</strong></div>
      <div class="detail-cell"><span>Urodziny</span><strong>${client.birthday ? formatDate(client.birthday) : "brak"}</strong></div>
    </div>
    <p class="muted">${escapeHtml(client.notes || "Brak notatki.")}</p>
    <div class="tag-row">${client.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>
    <section class="contact-panel" aria-label="Komunikacja z klientem">
      <div class="panel-header compact-header">
        <div>
          <p class="eyebrow">Kontakt</p>
          <h3>Kanały klienta</h3>
        </div>
      </div>
      <div class="contact-fields">
        <label>Telefon
          <input data-contact-input="phone" value="${escapeHtml(client.phone || "")}" placeholder="500 000 000" inputmode="tel" />
        </label>
        <label>E-mail
          <input data-contact-input="email" value="${escapeHtml(client.email || "")}" placeholder="anna@email.pl" type="email" />
        </label>
        <label>Instagram
          <input data-contact-input="instagram" value="${escapeHtml(cleanInstagram(client.instagram))}" placeholder="nazwa_uzytkownika" />
        </label>
        <button class="secondary-button" type="button" data-save-contact="${client.id}">
          <i data-lucide="save"></i>
          <span>Zapisz kanały</span>
        </button>
      </div>
    </section>
  `;
}

function contactButton(client, channel, icon, label, message = "") {
  const disabled = !contactUrl(client, channel, message || defaultMessage);
  const messageAttribute = message ? ` data-contact-message="${escapeHtml(message)}"` : "";
  return `
    <button class="contact-button ${disabled ? "disabled" : ""}" type="button" data-contact-channel="${channel}" data-contact-client="${client.id}"${messageAttribute} ${disabled ? "disabled" : ""}>
      <i data-lucide="${icon}"></i>
      <span>${escapeHtml(label)}</span>
    </button>
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
                ${reminderContactActions(reminder)}
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
  const segments = campaignSegments();
  const activeSegment = segments.find((segment) => segment.id === activeCampaignSegment) || segments[0];
  activeCampaignSegment = activeSegment.id;

  byId("campaignGrid").innerHTML = segments.map((segment) => `
    <button class="campaign-card segment-card ${segment.id === activeCampaignSegment ? "active" : ""}" type="button" data-campaign-segment="${segment.id}" aria-pressed="${segment.id === activeCampaignSegment}">
      <strong>${escapeHtml(segment.name)}</strong>
      <span class="muted">${segment.clients.length} kontaktów</span>
    </button>
  `).join("");

  byId("segmentList").innerHTML = `
    <div class="segment-header">
      <p class="eyebrow">Lista</p>
      <h3>${escapeHtml(activeSegment.name)}</h3>
      <span class="muted">${activeSegment.clients.length} kontaktów w segmencie</span>
    </div>
    <div class="stack-list segment-client-list">
      ${activeSegment.clients.length ? activeSegment.clients.map((client) => segmentClientCard(client)).join("") : `<div class="empty-state">Brak klientów w tym segmencie.</div>`}
    </div>
    <article class="stack-item">
      <strong>Wysyłka jest w przypomnieniach</strong>
      <span class="muted">Kanały kontaktu są dostępne tylko przy zadaniach follow-up.</span>
    </article>
  `;
}

function campaignSegments() {
  const hasFutureAppointment = (client) => state.appointments.some((appointment) =>
    appointment.clientId === client.id && appointment.status !== "Anulowana" && appointment.date >= iso(0)
  );

  return [
    {
      id: "vip",
      name: "VIP",
      clients: state.clients.filter((client) => client.tags.some((tag) => tag.toLowerCase() === "vip"))
    },
    {
      id: "no-next-visit",
      name: "Bez kolejnej wizyty",
      clients: state.clients.filter((client) => !hasFutureAppointment(client))
    },
    {
      id: "birthdays",
      name: "Urodziny w bazie",
      clients: state.clients.filter((client) => client.birthday)
    }
  ];
}

function segmentClientCard(client) {
  return `
    <article class="segment-client-card">
      <div>
        <strong>${escapeHtml(client.name)}</strong>
        <span class="muted">${escapeHtml(client.phone || "brak telefonu")} · ${escapeHtml(client.email || "brak e-maila")}</span>
        ${client.instagram ? `<span class="muted">@${escapeHtml(cleanInstagram(client.instagram))}</span>` : ""}
      </div>
      <div class="tag-row">
        ${client.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </article>
  `;
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
    instagram: cleanInstagram(data.instagram),
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

function openContact(clientId, channel, messageOverride = "") {
  const client = getClient(clientId);
  if (!client) {
    toast("Najpierw wybierz klienta.");
    return;
  }

  const message = messageOverride || defaultMessage;
  const url = contactUrl(client, channel, message);

  if (!url) {
    toast(`Brakuje ${contactLabel(channel)} u klienta.`);
    return;
  }

  window.open(url, "_blank", "noopener");
  if (channel === "instagram") {
    navigator.clipboard?.writeText(messageForClient(message, client)).catch(() => {});
    toast("Otwieram Instagram. Treść skopiowana do schowka.");
    return;
  }
  toast("Otwieram aplikację do kontaktu.");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.view) switchView(target.dataset.view);
  if (target.dataset.openModal) openModal(target.dataset.openModal);
  if (target.dataset.closeModal !== undefined) closeModals();
  if (target.dataset.contactChannel) {
    openContact(target.dataset.contactClient, target.dataset.contactChannel, target.dataset.contactMessage || "");
  }
  if (target.dataset.campaignSegment) {
    activeCampaignSegment = target.dataset.campaignSegment;
    renderCampaigns();
    refreshIcons();
  }
  if (target.dataset.saveContact) {
    const client = getClient(target.dataset.saveContact);
    if (client) {
      client.phone = document.querySelector('[data-contact-input="phone"]')?.value.trim() || "";
      client.email = document.querySelector('[data-contact-input="email"]')?.value.trim() || "";
      client.instagram = cleanInstagram(document.querySelector('[data-contact-input="instagram"]')?.value || "");
      saveState();
      render();
      toast("Kanały kontaktu zapisane.");
    }
  }
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
