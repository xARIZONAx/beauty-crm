const STORAGE_KEY = 'beauty_recall_crm_v1';

function uid() {
  return crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function q(id) {
  return document.getElementById(id);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date((dateString || todayISO()) + 'T12:00:00');
  date.setDate(date.getDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('pl-PL').format(new Date(dateString + 'T12:00:00'));
}

function esc(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  if (value === undefined || value === null || value === '') return '—';
  return Number(value).toLocaleString('pl-PL') + ' zł';
}

function fullName(client) {
  return `${client.firstName || ''} ${client.lastName || ''}`.trim();
}

function clientTitle(client) {
  return client && client.gender === 'male' ? 'Pan' : 'Pani';
}

function defaultTemplates() {
  return [
    {
      id: uid(),
      name: 'Przypomnienie o kolejnej wizycie',
      content: '{zwrot} {imie}, minął już odpowiedni czas od zabiegu: {zabieg}. Jeśli chce się Pan/Pani umówić na kolejną wizytę, proszę odpisać TAK albo zaproponować dogodny termin.'
    },
    {
      id: uid(),
      name: 'Kontrola po zabiegu',
      content: '{zwrot} {imie}, piszę z krótkim przypomnieniem o kontroli po zabiegu: {zabieg}. Proszę dać znać, czy wszystko jest w porządku.'
    },
    {
      id: uid(),
      name: 'Prośba o opinię Google',
      content: '{zwrot} {imie}, dziękujemy za wizytę. Będzie nam bardzo miło, jeśli podzieli się Pan/Pani krótką opinią w Google.'
    }
  ];
}

function normalizeState(data) {
  return {
    clinicName: data.clinicName || 'Gabinet Beauty',
    clients: (data.clients || []).map(function (client) {
      return { ...client, gender: client.gender || 'female' };
    }),
    treatments: data.treatments || [],
    reminders: data.reminders || [],
    templates: data.templates && data.templates.length ? data.templates : defaultTemplates()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeState({});
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    return normalizeState({});
  }
}

let state = loadState();
let selectedClientId = state.clients[0] ? state.clients[0].id : null;
let reminderFilter = 'today';

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function normalizePhone(phone) {
  let value = String(phone || '').replace(/[^0-9]/g, '');
  if (value.length === 9) value = '48' + value;
  return value;
}

function replaceVars(text, client, treatmentName = '') {
  const title = clientTitle(client);
  let result = String(text || '')
    .replaceAll('{zwrot}', title)
    .replaceAll('{imie}', client ? client.firstName || '' : '')
    .replaceAll('{zabieg}', treatmentName || '')
    .replaceAll('{data}', todayISO())
    .replaceAll('{gabinet}', state.clinicName || 'Gabinet Beauty');

  if (title === 'Pan') {
    result = result.replace(/^Pani\s+/i, 'Pan ');
    result = result.replace(/\bPani\s+/g, 'Pan ');
    result = result.replaceAll('Pan/Pani', 'Pan');
    result = result.replaceAll('pan/pani', 'pan');
  } else {
    result = result.replaceAll('Pan/Pani', 'Pani');
    result = result.replaceAll('pan/pani', 'pani');
  }

  return result;
}

function getClientTreatments(clientId) {
  return state.treatments
    .filter(function (treatment) { return treatment.clientId === clientId; })
    .sort(function (a, b) { return String(b.treatmentDate).localeCompare(String(a.treatmentDate)); });
}

function getClientReminders(clientId) {
  return state.reminders
    .filter(function (reminder) { return reminder.clientId === clientId; })
    .sort(function (a, b) { return String(a.remindAt).localeCompare(String(b.remindAt)); });
}

function latestTreatment(clientId) {
  return getClientTreatments(clientId)[0];
}

function nextReminder(clientId) {
  return getClientReminders(clientId).filter(function (reminder) { return reminder.status !== 'done'; })[0];
}

function setView(view) {
  document.querySelectorAll('.view').forEach(function (element) {
    element.classList.remove('active');
  });
  q('view-' + view).classList.add('active');
  document.querySelectorAll('.tab').forEach(function (button) {
    button.classList.toggle('active', button.dataset.view === view);
  });
  renderAll();
}

function renderAll() {
  renderStats();
  renderClientList();
  renderClientDetails();
  renderClientsTable();
  renderRemindersTable();
  renderTemplates();
}

function renderStats() {
  const today = todayISO();
  q('statClients').textContent = state.clients.length;
  q('statTreatments').textContent = state.treatments.length;
  q('statToday').textContent = state.reminders.filter(function (r) { return r.status !== 'done' && r.remindAt <= today; }).length;
  q('statPending').textContent = state.reminders.filter(function (r) { return r.status !== 'done'; }).length;
}

function renderClientList() {
  const box = q('clientList');
  if (!box) return;
  const search = (q('clientSearch') ? q('clientSearch').value : '').toLowerCase();
  const clients = state.clients
    .filter(function (client) {
      return `${fullName(client)} ${client.phone || ''} ${client.email || ''}`.toLowerCase().includes(search);
    })
    .sort(function (a, b) { return fullName(a).localeCompare(fullName(b), 'pl'); });

  if (!clients.length) {
    box.innerHTML = `<div class="empty">Brak klientek/klientów. Kliknij „Dodaj klientkę”.</div>`;
    return;
  }

  box.innerHTML = clients.map(function (client) {
    const latest = latestTreatment(client.id);
    const reminder = nextReminder(client.id);
    return `<button class="client-item ${client.id === selectedClientId ? 'active' : ''}" onclick='selectClient(${JSON.stringify(client.id)})'>
      <strong>${esc(fullName(client))}</strong><br>
      <span class="muted">${esc(client.phone || client.email || 'brak kontaktu')}</span><br>
      <span class="pill">${clientTitle(client)}</span>
      ${latest ? `<span class="pill">${esc(latest.treatmentName)}</span>` : `<span class="pill red">brak zabiegów</span>`}
      ${reminder ? `<span class="pill green">${formatDate(reminder.remindAt)}</span>` : ''}
    </button>`;
  }).join('');
}

function renderClientDetails() {
  const box = q('clientDetails');
  if (!box) return;
  const client = state.clients.find(function (item) { return item.id === selectedClientId; });

  if (!client) {
    box.innerHTML = `<div class="empty"><h3>Wybierz klientkę/klienta</h3><p>Po lewej zobaczysz listę kontaktów.</p><button onclick="openClientModal()">+ Dodaj klientkę</button></div>`;
    return;
  }

  const treatments = getClientTreatments(client.id);
  const reminders = getClientReminders(client.id);

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:start">
      <div>
        <h2>${esc(fullName(client))}</h2>
        <div class="muted">${esc(client.phone || 'brak telefonu')}${client.email ? ' · ' + esc(client.email) : ''}</div>
        <span class="pill">zwrot: ${clientTitle(client)}</span>
        <span class="pill ${client.marketingConsent ? 'green' : 'red'}">marketing: ${client.marketingConsent ? 'zgoda' : 'brak zgody'}</span>
        ${client.birthDate ? `<span class="pill">ur. ${formatDate(client.birthDate)}</span>` : ''}
      </div>
      <div class="actions" style="margin-top:0">
        <button class="small" onclick='openTreatmentModal(${JSON.stringify(client.id)})'>+ Zabieg</button>
        <button class="secondary small" onclick='openReminderModal(${JSON.stringify(client.id)})'>+ Przypomnienie</button>
        <button class="ghost small" onclick='openClientModal(${JSON.stringify(client.id)})'>Edytuj</button>
        <button class="danger small" onclick='deleteClient(${JSON.stringify(client.id)})'>Usuń</button>
      </div>
    </div>

    <h3 style="margin-top:18px">Notatki</h3>
    <div class="message-box">${esc(client.notes || 'Brak notatek.')}</div>

    <h3 style="margin-top:18px">Historia zabiegów</h3>
    ${treatments.length ? `<table><thead><tr><th>Data</th><th>Zabieg</th><th>Okolica/preparat</th><th>Cena</th><th></th></tr></thead><tbody>${treatments.map(function (treatment) {
      return `<tr><td class="nowrap">${formatDate(treatment.treatmentDate)}</td><td><strong>${esc(treatment.treatmentName)}</strong><br><span class="muted">${esc(treatment.notes || '')}</span></td><td>${esc([treatment.area, treatment.productUsed].filter(Boolean).join(' · ') || '—')}</td><td>${money(treatment.price)}</td><td><button class="danger small" onclick='deleteTreatment(${JSON.stringify(treatment.id)})'>Usuń</button></td></tr>`;
    }).join('')}</tbody></table>` : `<div class="empty">Brak zabiegów.</div>`}

    <h3 style="margin-top:18px">Przypomnienia</h3>
    ${reminders.length ? `<table><thead><tr><th>Data</th><th>Powód</th><th>Status</th><th>Akcje</th></tr></thead><tbody>${reminders.map(reminderRow).join('')}</tbody></table>` : `<div class="empty">Brak przypomnień.</div>`}
  `;
}

function reminderRow(reminder) {
  return `<tr><td class="nowrap">${formatDate(reminder.remindAt)}</td><td>${esc(reminder.reason || '—')}<br><span class="muted">${esc((reminder.message || '').slice(0, 90))}${(reminder.message || '').length > 90 ? '...' : ''}</span></td><td>${reminder.status === 'done' ? `<span class="pill green">zrobione</span>` : `<span class="pill">aktywne</span>`}</td><td>${reminderActions(reminder)}</td></tr>`;
}

function reminderActions(reminder) {
  return `<div class="actions" style="margin-top:0">
    <button class="small" onclick='openWhatsApp(${JSON.stringify(reminder.id)})'>WhatsApp</button>
    <button class="secondary small" onclick='copyMessage(${JSON.stringify(reminder.id)})'>Kopiuj</button>
    ${reminder.status === 'done' ? `<button class="ghost small" onclick='toggleReminder(${JSON.stringify(reminder.id)}, "pending")'>Cofnij</button>` : `<button class="ghost small" onclick='toggleReminder(${JSON.stringify(reminder.id)}, "done")'>Zrobione</button>`}
    <button class="danger small" onclick='deleteReminder(${JSON.stringify(reminder.id)})'>Usuń</button>
  </div>`;
}

function renderClientsTable() {
  const box = q('clientsTable');
  if (!box) return;
  if (!state.clients.length) {
    box.innerHTML = `<div class="empty">Brak klientek/klientów w bazie.</div>`;
    return;
  }

  box.innerHTML = `<table><thead><tr><th>Kontakt</th><th>Telefon</th><th>Ostatni zabieg</th><th>Następny kontakt</th><th></th></tr></thead><tbody>${state.clients.slice().sort(function (a, b) {
    return fullName(a).localeCompare(fullName(b), 'pl');
  }).map(function (client) {
    const latest = latestTreatment(client.id);
    const reminder = nextReminder(client.id);
    return `<tr><td><strong>${esc(fullName(client))}</strong><br><span class="muted">${clientTitle(client)} ${esc(client.email || '')}</span></td><td>${esc(client.phone || '—')}</td><td>${latest ? `${esc(latest.treatmentName)}<br><span class="muted">${formatDate(latest.treatmentDate)}</span>` : '—'}</td><td>${reminder ? `${formatDate(reminder.remindAt)}<br><span class="muted">${esc(reminder.reason || '')}</span>` : '—'}</td><td><button class="small" onclick='selectAndOpen(${JSON.stringify(client.id)})'>Otwórz</button></td></tr>`;
  }).join('')}</tbody></table>`;
}

function setReminderFilter(filter) {
  reminderFilter = filter;
  renderRemindersTable();
}

function renderRemindersTable() {
  const box = q('remindersTable');
  if (!box) return;
  const today = todayISO();
  let reminders = state.reminders.slice();
  if (reminderFilter === 'today') reminders = reminders.filter(function (r) { return r.status !== 'done' && r.remindAt <= today; });
  if (reminderFilter === 'pending') reminders = reminders.filter(function (r) { return r.status !== 'done'; });
  if (reminderFilter === 'done') reminders = reminders.filter(function (r) { return r.status === 'done'; });
  reminders.sort(function (a, b) { return String(a.remindAt).localeCompare(String(b.remindAt)); });

  if (!reminders.length) {
    box.innerHTML = `<div class="empty">Brak przypomnień w tym filtrze.</div>`;
    return;
  }

  box.innerHTML = `<table><thead><tr><th>Data</th><th>Kontakt</th><th>Powód</th><th>Status</th><th>Akcje</th></tr></thead><tbody>${reminders.map(function (reminder) {
    const client = state.clients.find(function (item) { return item.id === reminder.clientId; });
    return `<tr><td>${formatDate(reminder.remindAt)}</td><td><strong>${esc(client ? fullName(client) : 'Usunięty kontakt')}</strong><br><span class="muted">${client ? clientTitle(client) : ''} ${esc(client && client.phone ? client.phone : '')}</span></td><td>${esc(reminder.reason || '—')}</td><td>${reminder.status === 'done' ? `<span class="pill green">zrobione</span>` : `<span class="pill">aktywne</span>`}</td><td>${reminderActions(reminder)}</td></tr>`;
  }).join('')}</tbody></table>`;
}

function renderTemplates() {
  const box = q('templatesList');
  if (!box) return;
  box.innerHTML = state.templates.map(function (template) {
    return `<div class="panel" style="box-shadow:none;margin-bottom:10px"><strong>${esc(template.name)}</strong><div class="message-box" style="margin-top:8px">${esc(template.content)}</div><div class="actions"><button class="secondary small" onclick='openTemplateModal(${JSON.stringify(template.id)})'>Edytuj</button><button class="danger small" onclick='deleteTemplate(${JSON.stringify(template.id)})'>Usuń</button></div></div>`;
  }).join('') || `<div class="empty">Brak szablonów.</div>`;
}

function selectClient(id) {
  selectedClientId = id;
  renderAll();
}

function selectAndOpen(id) {
  selectedClientId = id;
  setView('dashboard');
}

function openClientModal(id = null) {
  q('clientForm').reset();
  q('clientId').value = '';
  q('clientModalTitle').textContent = id ? 'Edytuj kontakt' : 'Dodaj klientkę/klienta';

  if (id) {
    const client = state.clients.find(function (item) { return item.id === id; });
    if (client) {
      q('clientId').value = client.id;
      q('firstName').value = client.firstName || '';
      q('lastName').value = client.lastName || '';
      q('gender').value = client.gender || 'female';
      q('phone').value = client.phone || '';
      q('email').value = client.email || '';
      q('birthDate').value = client.birthDate || '';
      q('marketingConsent').value = String(Boolean(client.marketingConsent));
      q('notes').value = client.notes || '';
    }
  } else {
    q('gender').value = 'female';
  }

  q('clientModal').classList.add('open');
}

function closeClientModal() {
  q('clientModal').classList.remove('open');
}

function saveClient(event) {
  event.preventDefault();
  const id = q('clientId').value;
  const oldClient = id ? state.clients.find(function (item) { return item.id === id; }) : null;
  const client = {
    id: id || uid(),
    firstName: q('firstName').value.trim(),
    lastName: q('lastName').value.trim(),
    gender: q('gender').value || 'female',
    phone: q('phone').value.trim(),
    email: q('email').value.trim(),
    birthDate: q('birthDate').value,
    marketingConsent: q('marketingConsent').value === 'true',
    notes: q('notes').value.trim(),
    createdAt: oldClient ? oldClient.createdAt : new Date().toISOString()
  };

  if (!client.firstName) {
    alert('Podaj imię.');
    return;
  }

  if (id) state.clients = state.clients.map(function (item) { return item.id === id ? client : item; });
  else {
    state.clients.push(client);
    selectedClientId = client.id;
  }

  closeClientModal();
  saveState();
}

function deleteClient(id) {
  const client = state.clients.find(function (item) { return item.id === id; });
  if (!confirm('Usunąć kontakt ' + fullName(client) + ' oraz jego dane?')) return;
  state.clients = state.clients.filter(function (item) { return item.id !== id; });
  state.treatments = state.treatments.filter(function (item) { return item.clientId !== id; });
  state.reminders = state.reminders.filter(function (item) { return item.clientId !== id; });
  selectedClientId = state.clients[0] ? state.clients[0].id : null;
  saveState();
}

function openTreatmentModal(clientId) {
  q('treatmentForm').reset();
  q('treatmentClientId').value = clientId;
  q('treatmentDate').value = todayISO();
  q('treatmentModal').classList.add('open');
}

function closeTreatmentModal() {
  q('treatmentModal').classList.remove('open');
}

function updateReminderDate() {
  const preset = q('reminderPreset').value;
  const treatmentDate = q('treatmentDate').value || todayISO();
  const clientId = q('treatmentClientId').value;
  const client = state.clients.find(function (item) { return item.id === clientId; });
  const treatmentName = q('treatmentName').value.trim();

  if (!preset) {
    q('reminderDate').value = '';
    return;
  }

  if (preset !== 'custom') q('reminderDate').value = addDays(treatmentDate, Number(preset));
  if (!q('reminderReason').value) q('reminderReason').value = (preset === '7' || preset === '14' ? 'kontrola po zabiegu: ' : 'kolejna wizyta po zabiegu: ') + treatmentName;

  const template = (preset === '7' || preset === '14')
    ? state.templates.find(function (t) { return t.name.toLowerCase().includes('kontrola'); })
    : state.templates.find(function (t) { return t.name.toLowerCase().includes('przypomnienie'); });

  q('reminderMessage').value = replaceVars((template || state.templates[0] || {}).content || '', client, treatmentName);
}

function saveTreatment(event) {
  event.preventDefault();
  const clientId = q('treatmentClientId').value;
  const treatment = {
    id: uid(),
    clientId: clientId,
    treatmentName: q('treatmentName').value.trim(),
    treatmentDate: q('treatmentDate').value,
    area: q('area').value.trim(),
    productUsed: q('productUsed').value.trim(),
    price: q('price').value,
    notes: q('treatmentNotes').value.trim(),
    createdAt: new Date().toISOString()
  };

  state.treatments.push(treatment);

  if (q('reminderDate').value) {
    state.reminders.push({
      id: uid(),
      clientId: clientId,
      treatmentId: treatment.id,
      remindAt: q('reminderDate').value,
      reason: q('reminderReason').value.trim() || 'kolejny kontakt: ' + treatment.treatmentName,
      message: q('reminderMessage').value.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  closeTreatmentModal();
  saveState();
}

function deleteTreatment(id) {
  if (!confirm('Usunąć ten zabieg?')) return;
  state.treatments = state.treatments.filter(function (item) { return item.id !== id; });
  state.reminders = state.reminders.filter(function (item) { return item.treatmentId !== id; });
  saveState();
}

function openReminderModal(clientId) {
  const client = state.clients.find(function (item) { return item.id === clientId; });
  const latest = latestTreatment(clientId);
  const template = state.templates.find(function (t) { return t.name.toLowerCase().includes('przypomnienie'); }) || state.templates[0];

  q('manualReminderForm').reset();
  q('manualReminderClientId').value = clientId;
  q('manualReminderDate').value = todayISO();
  q('manualReminderReason').value = latest ? 'kolejna wizyta po zabiegu: ' + latest.treatmentName : 'kontakt z klientką/klientem';
  q('manualReminderMessage').value = replaceVars(template ? template.content : '', client, latest ? latest.treatmentName : '');
  q('reminderModal').classList.add('open');
}

function closeReminderModal() {
  q('reminderModal').classList.remove('open');
}

function saveManualReminder(event) {
  event.preventDefault();
  state.reminders.push({
    id: uid(),
    clientId: q('manualReminderClientId').value,
    treatmentId: null,
    remindAt: q('manualReminderDate').value,
    reason: q('manualReminderReason').value.trim(),
    message: q('manualReminderMessage').value.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  closeReminderModal();
  saveState();
}

function toggleReminder(id, status) {
  state.reminders = state.reminders.map(function (item) { return item.id === id ? { ...item, status: status } : item; });
  saveState();
}

function deleteReminder(id) {
  if (!confirm('Usunąć przypomnienie?')) return;
  state.reminders = state.reminders.filter(function (item) { return item.id !== id; });
  saveState();
}

function openWhatsApp(reminderId) {
  const reminder = state.reminders.find(function (item) { return item.id === reminderId; });
  const client = state.clients.find(function (item) { return item.id === (reminder && reminder.clientId); });
  if (!reminder || !client) return alert('Nie znaleziono przypomnienia lub kontaktu.');
  const phone = normalizePhone(client.phone);
  if (!phone) return alert('Ten kontakt nie ma numeru telefonu.');
  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(reminder.message || reminder.reason || 'Dzień dobry, przypominamy o kontakcie z gabinetem.'), '_blank');
}

function copyMessage(reminderId) {
  const reminder = state.reminders.find(function (item) { return item.id === reminderId; });
  if (!reminder) return;
  navigator.clipboard.writeText(reminder.message || reminder.reason || '').then(function () {
    alert('Wiadomość skopiowana.');
  });
}

function openTemplateModal(id = null) {
  q('templateForm').reset();
  q('templateId').value = '';
  q('templateModalTitle').textContent = id ? 'Edytuj szablon' : 'Dodaj szablon';
  if (id) {
    const template = state.templates.find(function (item) { return item.id === id; });
    if (template) {
      q('templateId').value = template.id;
      q('templateName').value = template.name;
      q('templateContent').value = template.content;
    }
  }
  q('templateModal').classList.add('open');
}

function closeTemplateModal() {
  q('templateModal').classList.remove('open');
}

function saveTemplate(event) {
  event.preventDefault();
  const id = q('templateId').value;
  const oldTemplate = id ? state.templates.find(function (item) { return item.id === id; }) : null;
  const template = {
    id: id || uid(),
    name: q('templateName').value.trim(),
    content: q('templateContent').value.trim(),
    createdAt: oldTemplate ? oldTemplate.createdAt : new Date().toISOString()
  };

  if (id) state.templates = state.templates.map(function (item) { return item.id === id ? template : item; });
  else state.templates.push(template);

  closeTemplateModal();
  saveState();
}

function deleteTemplate(id) {
  if (!confirm('Usunąć szablon?')) return;
  state.templates = state.templates.filter(function (item) { return item.id !== id; });
  saveState();
}

function resetTemplates() {
  if (!confirm('Przywrócić domyślne szablony?')) return;
  state.templates = defaultTemplates();
  saveState();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'beauty-crm-eksport-' + todayISO() + '.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const imported = JSON.parse(reader.result);
      if (!confirm('Import zastąpi aktualne dane. Kontynuować?')) return;
      state = normalizeState(imported);
      selectedClientId = state.clients[0] ? state.clients[0].id : null;
      saveState();
      alert('Dane zaimportowane.');
    } catch (error) {
      alert('Nie udało się zaimportować pliku JSON.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function closeOnBackdrop(event, modalId) {
  if (event.target.id === modalId) q(modalId).classList.remove('open');
}

function seedIfEmpty() {
  if (state.clients.length) return;
  const anna = {
    id: uid(),
    firstName: 'Anna',
    lastName: 'Kowalska',
    gender: 'female',
    phone: '500000000',
    email: 'anna@example.com',
    birthDate: '1982-05-20',
    marketingConsent: true,
    notes: 'Skóra sucha, preferuje kontakt przez WhatsApp.',
    createdAt: new Date().toISOString()
  };
  const maciej = {
    id: uid(),
    firstName: 'Maciej',
    lastName: 'Kaliszewski',
    gender: 'male',
    phone: '535530806',
    email: '',
    birthDate: '',
    marketingConsent: false,
    notes: 'Przykładowy klient do testu zwrotu Pan/Pani.',
    createdAt: new Date().toISOString()
  };
  state.clients.push(anna, maciej);
  state.treatments.push({
    id: uid(),
    clientId: anna.id,
    treatmentName: 'Botoks',
    treatmentDate: addDays(todayISO(), -120),
    area: 'czoło',
    productUsed: 'preparat A',
    price: '900',
    notes: 'Bez powikłań.',
    createdAt: new Date().toISOString()
  });
  state.reminders.push({
    id: uid(),
    clientId: anna.id,
    treatmentId: null,
    remindAt: todayISO(),
    reason: 'botoks — kolejna wizyta',
    message: replaceVars(defaultTemplates()[0].content, anna, 'Botoks'),
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  selectedClientId = anna.id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function runSmokeTest() {
  const ok = typeof saveClient === 'function' && q('clientForm') && q('gender');
  console.log(ok ? 'BeautyRecall CRM smoke test OK' : 'BeautyRecall CRM smoke test FAILED');
}

document.addEventListener('input', function (event) {
  if (['treatmentName', 'treatmentDate'].includes(event.target.id) && q('reminderPreset') && q('reminderPreset').value) {
    updateReminderDate();
  }
});

seedIfEmpty();
renderAll();
runSmokeTest();
