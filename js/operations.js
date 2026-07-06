// Operational module: contact status, appointment calendar and consent/RODO demo register.
(function () {
  const key = 'beauty_recall_crm_v1';

  function q(id) { return document.getElementById(id); }
  function uid() { return crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function esc(v) { return String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
  function fullName(c) { return `${c.firstName || ''} ${c.lastName || ''}`.trim(); }
  function fmtDate(s) { return s ? new Intl.DateTimeFormat('pl-PL').format(new Date(s + 'T12:00:00')) : '—'; }
  function money(v) { return Number(v || 0).toLocaleString('pl-PL') + ' zł'; }

  function read() {
    try {
      const d = JSON.parse(localStorage.getItem(key) || '{}');
      d.clients = d.clients || [];
      d.reminders = d.reminders || [];
      d.treatments = d.treatments || [];
      d.appointments = d.appointments || [];
      return d;
    } catch (e) {
      return { clients: [], reminders: [], treatments: [], appointments: [] };
    }
  }

  function write(d) {
    localStorage.setItem(key, JSON.stringify(d));
  }

  function statusLabel(s) {
    return {
      new: 'nowe',
      sent: 'wysłano',
      replied: 'odpisała/odpisał',
      booked: 'umówiona/umówiony',
      no_reply: 'brak odpowiedzi',
      later: 'zadzwonić później',
      declined: 'odmowa'
    }[s || 'new'] || 'nowe';
  }

  function appointmentStatusLabel(s) {
    return {
      planned: 'zaplanowana',
      done: 'odbyta',
      canceled: 'odwołana'
    }[s || 'planned'] || 'zaplanowana';
  }

  function consentLabel(value) {
    return value ? '<span class="pill green">tak</span>' : '<span class="pill red">nie</span>';
  }

  function ensureViews() {
    const tabs = document.querySelector('.tabs');
    const main = document.querySelector('main');
    if (!tabs || !main || q('view-contact-status')) return;

    tabs.insertAdjacentHTML('beforeend', `
      <button class="tab" data-view="contact-status" onclick="setView('contact-status')">Status kontaktu</button>
      <button class="tab" data-view="calendar" onclick="setView('calendar')">Kalendarz</button>
      <button class="tab" data-view="consents" onclick="setView('consents')">Zgody/RODO</button>
    `);

    const footer = main.querySelector('.footer-note');
    footer.insertAdjacentHTML('beforebegin', `
      <section id="view-contact-status" class="view app-section">
        <div class="panel">
          <h2>Status kontaktu po wiadomości</h2>
          <p class="panel-subtitle">Oznacz, co stało się po WhatsApp/SMS: wysłano, odpisała, umówiona, brak odpowiedzi albo odmowa.</p>
          <section id="contactStatusStats" class="cards" style="margin-top:14px"></section>
          <div id="contactStatusTable" style="margin-top:12px"></div>
        </div>
      </section>

      <section id="view-calendar" class="view app-section">
        <div class="panel">
          <h2>Mini-kalendarz kolejnych wizyt</h2>
          <p class="panel-subtitle">Prosty plan wizyt: data, godzina, klientka/klient, zabieg i status.</p>
          <div class="row three">
            <div><label>Kontakt</label><select id="appointmentClient"></select></div>
            <div><label>Data</label><input id="appointmentDate" type="date"></div>
            <div><label>Godzina</label><input id="appointmentTime" type="time"></div>
          </div>
          <div class="row three">
            <div><label>Zabieg</label><input id="appointmentTreatment" placeholder="np. botoks / mezoterapia"></div>
            <div><label>Wartość wizyty</label><input id="appointmentValue" type="number" min="0" step="1" placeholder="900"></div>
            <div><label>Status</label><select id="appointmentStatus"><option value="planned">Zaplanowana</option><option value="done">Odbyta</option><option value="canceled">Odwołana</option></select></div>
          </div>
          <label>Notatka</label><textarea id="appointmentNote" placeholder="np. potwierdzić dzień wcześniej"></textarea>
          <div class="actions"><button onclick="addAppointmentFromForm()">+ Dodaj wizytę</button></div>
          <section id="calendarStats" class="cards" style="margin-top:14px"></section>
          <div id="calendarTable" style="margin-top:12px"></div>
        </div>
      </section>

      <section id="view-consents" class="view app-section">
        <div class="panel">
          <h2>Zgody i RODO — rejestr demo</h2>
          <p class="panel-subtitle">Tu zapisujesz, jakie zgody są odnotowane przy kontakcie. W realnym systemie trzeba do tego dodać prawdziwą klauzulę informacyjną i potwierdzenie podpisu albo checkbox z datą/IP.</p>
          <div class="notice">To nie jest porada prawna. To tylko demo rejestru zgód.</div>
          <section id="consentStats" class="cards" style="margin-top:14px"></section>
          <div id="consentTable" style="margin-top:12px"></div>
        </div>
      </section>
    `);
  }

  function ensureConsentFields() {
    const form = q('clientForm');
    if (!form || q('consentSms')) return;
    const notes = q('notes');
    if (!notes) return;
    notes.insertAdjacentHTML('afterend', `
      <div class="panel" style="box-shadow:none;margin-top:12px">
        <h3>Zgody i RODO</h3>
        <div class="row two">
          <div><label>Zgoda SMS</label><select id="consentSms"><option value="false">Nie</option><option value="true">Tak</option></select></div>
          <div><label>Zgoda WhatsApp</label><select id="consentWhatsapp"><option value="false">Nie</option><option value="true">Tak</option></select></div>
        </div>
        <div class="row two">
          <div><label>Zgoda e-mail</label><select id="consentEmail"><option value="false">Nie</option><option value="true">Tak</option></select></div>
          <div><label>Zgoda zdjęcia przed/po</label><select id="consentPhotos"><option value="false">Nie</option><option value="true">Tak</option></select></div>
        </div>
        <div class="row two">
          <div><label>Klauzula informacyjna RODO przekazana</label><select id="rodoInfo"><option value="false">Nie</option><option value="true">Tak</option></select></div>
          <div><label>Data zgód</label><input id="consentDate" type="date"></div>
        </div>
      </div>
    `);
  }

  function patchClientModal() {
    if (window.__opsClientPatch) return;
    window.__opsClientPatch = true;
    const oldOpen = window.openClientModal;
    const oldSave = window.saveClient;

    window.openClientModal = function (id) {
      if (oldOpen) oldOpen(id);
      ensureConsentFields();
      const d = read();
      const c = (d.clients || []).find(x => x.id === id);
      const cons = c && c.consents ? c.consents : {};
      if (q('consentSms')) q('consentSms').value = String(!!cons.sms);
      if (q('consentWhatsapp')) q('consentWhatsapp').value = String(!!cons.whatsapp);
      if (q('consentEmail')) q('consentEmail').value = String(!!cons.email);
      if (q('consentPhotos')) q('consentPhotos').value = String(!!cons.photos);
      if (q('rodoInfo')) q('rodoInfo').value = String(!!cons.rodoInfo);
      if (q('consentDate')) q('consentDate').value = cons.date || todayISO();
    };

    window.saveClient = function (event) {
      const idBefore = q('clientId') ? q('clientId').value : '';
      const first = q('firstName') ? q('firstName').value.trim() : '';
      const last = q('lastName') ? q('lastName').value.trim() : '';
      const phone = q('phone') ? q('phone').value.trim() : '';
      const email = q('email') ? q('email').value.trim() : '';
      if (oldSave) oldSave(event);
      setTimeout(function () {
        const d = read();
        let c = idBefore ? d.clients.find(x => x.id === idBefore) : null;
        if (!c) c = [...d.clients].reverse().find(x => (x.firstName || '') === first && (x.lastName || '') === last && (x.phone || '') === phone && (x.email || '') === email);
        if (!c) return;
        c.consents = {
          sms: q('consentSms') ? q('consentSms').value === 'true' : false,
          whatsapp: q('consentWhatsapp') ? q('consentWhatsapp').value === 'true' : false,
          email: q('consentEmail') ? q('consentEmail').value === 'true' : false,
          photos: q('consentPhotos') ? q('consentPhotos').value === 'true' : false,
          rodoInfo: q('rodoInfo') ? q('rodoInfo').value === 'true' : false,
          date: q('consentDate') ? q('consentDate').value : todayISO()
        };
        write(d);
        renderConsents();
      }, 100);
    };
  }

  function setContactStatus(reminderId, status) {
    const d = read();
    const r = d.reminders.find(x => x.id === reminderId);
    if (!r) return;
    r.contactStatus = status;
    r.contactStatusAt = new Date().toISOString();
    if (status === 'booked') {
      const c = d.clients.find(x => x.id === r.clientId);
      const value = Number(prompt('Wartość wizyty w zł?', '500') || 0);
      d.appointments = d.appointments || [];
      d.appointments.push({ id: uid(), clientId: r.clientId, date: todayISO(), time: '', treatment: r.reason || 'Wizyta po kontakcie', value, status: 'planned', note: 'Utworzono ze statusu kontaktu: umówiona', createdAt: new Date().toISOString() });
      alert('Dodano do kalendarza: ' + (c ? fullName(c) : 'kontakt'));
    }
    write(d);
    renderContactStatus();
    renderCalendar();
  }

  window.setContactStatus = setContactStatus;

  function renderContactStatus() {
    ensureViews();
    const d = read();
    const box = q('contactStatusTable');
    const stats = q('contactStatusStats');
    if (!box || !stats) return;
    const reminders = d.reminders || [];
    const booked = reminders.filter(r => r.contactStatus === 'booked').length;
    const sent = reminders.filter(r => r.contactStatus === 'sent').length;
    const replied = reminders.filter(r => r.contactStatus === 'replied').length;
    stats.innerHTML = `<div class="stat"><strong>${sent}</strong><span>wysłano</span></div><div class="stat"><strong>${replied}</strong><span>odpowiedzi</span></div><div class="stat"><strong>${booked}</strong><span>umówione wizyty</span></div>`;
    if (!reminders.length) { box.innerHTML = '<div class="empty">Brak przypomnień do oznaczania statusu.</div>'; return; }
    box.innerHTML = `<table><thead><tr><th>Kontakt</th><th>Wiadomość</th><th>Status</th><th>Akcje</th></tr></thead><tbody>${reminders.map(r => {
      const c = d.clients.find(x => x.id === r.clientId) || {};
      return `<tr><td><strong>${esc(fullName(c))}</strong><br><span class="muted">${esc(c.phone || c.email || '')}</span></td><td>${esc(r.reason || '')}<br><span class="muted">${esc((r.message || '').slice(0, 100))}</span></td><td><span class="pill">${statusLabel(r.contactStatus)}</span></td><td><div class="actions" style="margin-top:0"><button class="small" onclick='setContactStatus(${JSON.stringify(r.id)},"sent")'>Wysłano</button><button class="secondary small" onclick='setContactStatus(${JSON.stringify(r.id)},"replied")'>Odpisała</button><button class="secondary small" onclick='setContactStatus(${JSON.stringify(r.id)},"booked")'>Umówiona</button><button class="ghost small" onclick='setContactStatus(${JSON.stringify(r.id)},"no_reply")'>Brak odp.</button><button class="danger small" onclick='setContactStatus(${JSON.stringify(r.id)},"declined")'>Odmowa</button></div></td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function fillAppointmentClients() {
    const select = q('appointmentClient');
    if (!select) return;
    const d = read();
    const current = select.value;
    select.innerHTML = d.clients.map(c => `<option value="${esc(c.id)}">${esc(fullName(c))}</option>`).join('');
    if (current) select.value = current;
    if (q('appointmentDate') && !q('appointmentDate').value) q('appointmentDate').value = todayISO();
  }

  window.addAppointmentFromForm = function () {
    const d = read();
    d.appointments = d.appointments || [];
    const clientId = q('appointmentClient') ? q('appointmentClient').value : '';
    if (!clientId) return alert('Wybierz kontakt.');
    d.appointments.push({ id: uid(), clientId, date: q('appointmentDate').value || todayISO(), time: q('appointmentTime').value || '', treatment: q('appointmentTreatment').value || 'Wizyta', value: Number(q('appointmentValue').value || 0), status: q('appointmentStatus').value || 'planned', note: q('appointmentNote').value || '', createdAt: new Date().toISOString() });
    write(d);
    q('appointmentTreatment').value = '';
    q('appointmentValue').value = '';
    q('appointmentNote').value = '';
    renderCalendar();
  };

  window.setAppointmentStatus = function (id, status) {
    const d = read();
    const a = (d.appointments || []).find(x => x.id === id);
    if (!a) return;
    a.status = status;
    write(d);
    renderCalendar();
  };

  window.deleteAppointment = function (id) {
    if (!confirm('Usunąć wizytę z kalendarza?')) return;
    const d = read();
    d.appointments = (d.appointments || []).filter(x => x.id !== id);
    write(d);
    renderCalendar();
  };

  function renderCalendar() {
    ensureViews();
    fillAppointmentClients();
    const d = read();
    const table = q('calendarTable');
    const stats = q('calendarStats');
    if (!table || !stats) return;
    const apps = (d.appointments || []).slice().sort((a, b) => String(a.date + a.time).localeCompare(String(b.date + b.time)));
    const planned = apps.filter(a => a.status === 'planned').length;
    const doneValue = apps.filter(a => a.status === 'done').reduce((s, a) => s + Number(a.value || 0), 0);
    stats.innerHTML = `<div class="stat"><strong>${planned}</strong><span>zaplanowane</span></div><div class="stat"><strong>${apps.length}</strong><span>wszystkie wizyty</span></div><div class="stat"><strong>${money(doneValue)}</strong><span>odbyte — wartość</span></div>`;
    if (!apps.length) { table.innerHTML = '<div class="empty">Brak wizyt w kalendarzu.</div>'; return; }
    table.innerHTML = `<table><thead><tr><th>Termin</th><th>Kontakt</th><th>Zabieg</th><th>Wartość</th><th>Status</th><th>Akcje</th></tr></thead><tbody>${apps.map(a => {
      const c = d.clients.find(x => x.id === a.clientId) || {};
      return `<tr><td><strong>${fmtDate(a.date)}</strong><br><span class="muted">${esc(a.time || 'bez godziny')}</span></td><td>${esc(fullName(c))}</td><td>${esc(a.treatment || '')}<br><span class="muted">${esc(a.note || '')}</span></td><td>${money(a.value)}</td><td><span class="pill">${appointmentStatusLabel(a.status)}</span></td><td><div class="actions" style="margin-top:0"><button class="small" onclick='setAppointmentStatus(${JSON.stringify(a.id)},"done")'>Odbyta</button><button class="secondary small" onclick='setAppointmentStatus(${JSON.stringify(a.id)},"planned")'>Plan</button><button class="ghost small" onclick='setAppointmentStatus(${JSON.stringify(a.id)},"canceled")'>Odwołana</button><button class="danger small" onclick='deleteAppointment(${JSON.stringify(a.id)})'>Usuń</button></div></td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderConsents() {
    ensureViews();
    const d = read();
    const table = q('consentTable');
    const stats = q('consentStats');
    if (!table || !stats) return;
    const clients = d.clients || [];
    const rodo = clients.filter(c => c.consents && c.consents.rodoInfo).length;
    const marketing = clients.filter(c => c.marketingConsent || (c.consents && (c.consents.sms || c.consents.whatsapp || c.consents.email))).length;
    stats.innerHTML = `<div class="stat"><strong>${rodo}</strong><span>klauzula przekazana</span></div><div class="stat"><strong>${marketing}</strong><span>zgody kontaktowe</span></div><div class="stat"><strong>${clients.length}</strong><span>kontaktów w bazie</span></div>`;
    if (!clients.length) { table.innerHTML = '<div class="empty">Brak kontaktów.</div>'; return; }
    table.innerHTML = `<table><thead><tr><th>Kontakt</th><th>RODO</th><th>SMS</th><th>WhatsApp</th><th>E-mail</th><th>Zdjęcia</th><th>Data</th></tr></thead><tbody>${clients.map(c => {
      const s = c.consents || {};
      return `<tr><td><strong>${esc(fullName(c))}</strong><br><span class="muted">${esc(c.phone || c.email || '')}</span></td><td>${consentLabel(s.rodoInfo)}</td><td>${consentLabel(s.sms)}</td><td>${consentLabel(s.whatsapp)}</td><td>${consentLabel(s.email)}</td><td>${consentLabel(s.photos)}</td><td>${esc(s.date || '—')}</td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function boot() {
    ensureViews();
    ensureConsentFields();
    patchClientModal();
    renderContactStatus();
    renderCalendar();
    renderConsents();
    console.log('BeautyRecall operations module OK');
  }

  setTimeout(boot, 600);
  setInterval(function () { ensureViews(); ensureConsentFields(); renderContactStatus(); renderCalendar(); renderConsents(); }, 2500);
})();
