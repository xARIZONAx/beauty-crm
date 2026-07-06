// Client-ready polish for operations tabs: pipeline, appointment actions and consent document generator.
(function () {
  const key = 'beauty_recall_crm_v1';

  function q(id) { return document.getElementById(id); }
  function uid() { return crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(dateString, days) { const d = new Date((dateString || todayISO()) + 'T12:00:00'); d.setDate(d.getDate() + Number(days)); return d.toISOString().slice(0, 10); }
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

  function write(d) { localStorage.setItem(key, JSON.stringify(d)); }

  function clientById(d, id) { return (d.clients || []).find(c => c.id === id) || {}; }

  function contactStatusName(s) {
    return { new: 'Nowe', sent: 'Wysłano', replied: 'Odpowiedź', booked: 'Umówiona wizyta', no_reply: 'Brak odpowiedzi', later: 'Zadzwonić później', declined: 'Odmowa' }[s || 'new'] || 'Nowe';
  }

  function appointmentMsg(client, appointment) {
    const title = client.gender === 'male' ? 'Panie' : 'Pani';
    const first = client.firstName || '';
    return `${title} ${first}, przypominam o wizycie ${fmtDate(appointment.date)}${appointment.time ? ' o ' + appointment.time : ''}: ${appointment.treatment || 'zabieg'}. Proszę dać znać, jeśli termin jest aktualny.`;
  }

  function ensureClientPanels() {
    const statusView = q('view-contact-status');
    const calendarView = q('view-calendar');
    const consentsView = q('view-consents');

    if (statusView && !q('clientReadyPipeline')) {
      statusView.querySelector('.panel').insertAdjacentHTML('afterbegin', `
        <div class="panel" style="box-shadow:none;margin-bottom:14px">
          <h3>Panel właścicielki salonu</h3>
          <p class="panel-subtitle">Tu od razu widać, ile kontaktów jest w toku i które rozmowy trzeba domknąć.</p>
          <section id="clientReadyPipelineStats" class="cards" style="margin-top:12px"></section>
          <div id="clientReadyPipeline" style="margin-top:12px"></div>
        </div>
      `);
    }

    if (calendarView && !q('clientReadyCalendarActions')) {
      calendarView.querySelector('.panel').insertAdjacentHTML('afterbegin', `
        <div id="clientReadyCalendarActions" class="panel" style="box-shadow:none;margin-bottom:14px">
          <h3>Akcje kalendarza</h3>
          <p class="panel-subtitle">Szybkie potwierdzanie wizyt i tworzenie przypomnień dzień przed.</p>
          <div class="actions">
            <button onclick="confirmTomorrowAppointments()">Przypomnienia na jutro</button>
            <button class="secondary" onclick="createRecoveryFromCanceled()">Odzyskaj odwołane</button>
            <button class="secondary" onclick="exportAppointmentsText()">Kopiuj plan wizyt</button>
          </div>
          <section id="clientReadyCalendarStats" class="cards" style="margin-top:12px"></section>
        </div>
      `);
    }

    if (consentsView && !q('clientReadyConsentGenerator')) {
      consentsView.querySelector('.panel').insertAdjacentHTML('afterbegin', `
        <div id="clientReadyConsentGenerator" class="panel" style="box-shadow:none;margin-bottom:14px">
          <h3>Generator dokumentu zgody</h3>
          <p class="panel-subtitle">Wybierz kontakt i wygeneruj treść do podpisu lub skopiowania do formularza online.</p>
          <div class="row two">
            <div><label>Kontakt</label><select id="consentDocClient"></select></div>
            <div><label>Nazwa gabinetu</label><input id="consentClinicName" placeholder="np. Beauty Clinic"></div>
          </div>
          <div class="actions">
            <button onclick="generateConsentDocument()">Generuj dokument</button>
            <button class="secondary" onclick="copyConsentDocument()">Kopiuj treść</button>
            <button class="secondary" onclick="printConsentDocument()">Drukuj</button>
          </div>
          <textarea id="consentDocumentPreview" style="margin-top:12px;min-height:220px" placeholder="Tu pojawi się dokument zgód..."></textarea>
        </div>
      `);
    }
  }

  function renderPipeline() {
    ensureClientPanels();
    const d = read();
    const box = q('clientReadyPipeline');
    const stats = q('clientReadyPipelineStats');
    if (!box || !stats) return;

    const statuses = ['sent', 'replied', 'booked', 'no_reply', 'later', 'declined'];
    const reminders = d.reminders || [];
    const booked = reminders.filter(r => r.contactStatus === 'booked').length;
    const active = reminders.filter(r => ['sent', 'replied', 'no_reply', 'later'].includes(r.contactStatus)).length;
    const hot = reminders.filter(r => r.contactStatus === 'replied').length;

    stats.innerHTML = `
      <div class="stat"><strong>${active}</strong><span>rozmów w toku</span></div>
      <div class="stat"><strong>${hot}</strong><span>ciepłe odpowiedzi</span></div>
      <div class="stat"><strong>${booked}</strong><span>umówione z kampanii</span></div>
    `;

    box.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px">${statuses.map(status => {
      const rows = reminders.filter(r => (r.contactStatus || 'new') === status);
      return `<div class="panel" style="box-shadow:none"><strong>${contactStatusName(status)}</strong><div class="muted">${rows.length} kontaktów</div>${rows.slice(0, 4).map(r => {
        const c = clientById(d, r.clientId);
        return `<div class="message-box" style="margin-top:8px"><strong>${esc(fullName(c))}</strong><br><span class="muted">${esc(r.reason || '')}</span><div class="actions"><button class="small" onclick='quickFollowUp(${JSON.stringify(r.id)})'>Follow-up</button><button class="secondary small" onclick='addContactNote(${JSON.stringify(r.id)})'>Notatka</button></div></div>`;
      }).join('') || '<div class="empty" style="margin-top:8px">Pusto</div>'}</div>`;
    }).join('')}</div>`;
  }

  window.quickFollowUp = function (reminderId) {
    const d = read();
    const r = d.reminders.find(x => x.id === reminderId);
    if (!r) return;
    const date = prompt('Na kiedy ustawić follow-up?', addDays(todayISO(), 2));
    if (!date) return;
    r.followUpDate = date;
    r.contactStatus = 'later';
    r.contactStatusAt = new Date().toISOString();
    write(d);
    renderPipeline();
    alert('Follow-up ustawiony na ' + date);
  };

  window.addContactNote = function (reminderId) {
    const d = read();
    const r = d.reminders.find(x => x.id === reminderId);
    if (!r) return;
    const note = prompt('Notatka z rozmowy:', r.contactNote || '');
    if (note === null) return;
    r.contactNote = note;
    write(d);
    renderPipeline();
  };

  function renderCalendarActions() {
    ensureClientPanels();
    const d = read();
    const stats = q('clientReadyCalendarStats');
    if (!stats) return;
    const today = todayISO();
    const tomorrow = addDays(today, 1);
    const apps = d.appointments || [];
    const todayApps = apps.filter(a => a.date === today && a.status !== 'canceled').length;
    const tomorrowApps = apps.filter(a => a.date === tomorrow && a.status !== 'canceled').length;
    const plannedValue = apps.filter(a => a.status === 'planned').reduce((s, a) => s + Number(a.value || 0), 0);
    stats.innerHTML = `
      <div class="stat"><strong>${todayApps}</strong><span>wizyt dziś</span></div>
      <div class="stat"><strong>${tomorrowApps}</strong><span>do potwierdzenia jutro</span></div>
      <div class="stat"><strong>${money(plannedValue)}</strong><span>wartość zaplanowana</span></div>
    `;
  }

  window.confirmTomorrowAppointments = function () {
    const d = read();
    const tomorrow = addDays(todayISO(), 1);
    let count = 0;
    d.reminders = d.reminders || [];
    (d.appointments || []).filter(a => a.date === tomorrow && a.status !== 'canceled').forEach(a => {
      const c = clientById(d, a.clientId);
      d.reminders.push({ id: uid(), clientId: a.clientId, treatmentId: null, remindAt: todayISO(), reason: 'potwierdzenie wizyty: ' + (a.treatment || 'wizyta'), message: appointmentMsg(c, a), status: 'pending', contactStatus: 'new', createdAt: new Date().toISOString() });
      count++;
    });
    write(d);
    alert('Dodano przypomnienia do potwierdzenia wizyt: ' + count);
  };

  window.createRecoveryFromCanceled = function () {
    const d = read();
    let count = 0;
    d.reminders = d.reminders || [];
    (d.appointments || []).filter(a => a.status === 'canceled').forEach(a => {
      const c = clientById(d, a.clientId);
      const title = c.gender === 'male' ? 'Panie' : 'Pani';
      d.reminders.push({ id: uid(), clientId: a.clientId, treatmentId: null, remindAt: todayISO(), reason: 'odzyskanie odwołanej wizyty', message: `${title} ${c.firstName || ''}, zwolniły się nowe terminy. Czy chce ${c.gender === 'male' ? 'Pan' : 'Pani'} umówić wizytę w innym dniu?`, status: 'pending', contactStatus: 'new', createdAt: new Date().toISOString() });
      count++;
    });
    write(d);
    alert('Utworzono przypomnienia dla odwołanych wizyt: ' + count);
  };

  window.exportAppointmentsText = function () {
    const d = read();
    const text = (d.appointments || []).slice().sort((a, b) => String(a.date + a.time).localeCompare(String(b.date + b.time))).map(a => {
      const c = clientById(d, a.clientId);
      return `${a.date} ${a.time || ''} — ${fullName(c)} — ${a.treatment || 'wizyta'} — ${a.status || 'planned'} — ${money(a.value)}`;
    }).join('\n');
    navigator.clipboard.writeText(text || 'Brak wizyt').then(() => alert('Plan wizyt skopiowany.'));
  };

  function fillConsentClients() {
    const select = q('consentDocClient');
    if (!select) return;
    const d = read();
    const current = select.value;
    select.innerHTML = d.clients.map(c => `<option value="${esc(c.id)}">${esc(fullName(c))}</option>`).join('');
    if (current) select.value = current;
  }

  function consentText(client, clinic) {
    const cons = client.consents || {};
    return `ZGODY I INFORMACJA O PRZETWARZANIU DANYCH\n\nGabinet: ${clinic || '................................'}\nKlient/klientka: ${fullName(client)}\nTelefon/e-mail: ${client.phone || ''} ${client.email || ''}\nData: ${cons.date || todayISO()}\n\nPotwierdzam, że przekazano mi informację o przetwarzaniu danych osobowych w związku z obsługą wizyty, prowadzeniem karty klienta i kontaktem organizacyjnym.\n\nZgody marketingowe i kontaktowe:\n[${cons.sms ? 'x' : ' '}] SMS\n[${cons.whatsapp ? 'x' : ' '}] WhatsApp\n[${cons.email ? 'x' : ' '}] E-mail\n[${cons.photos ? 'x' : ' '}] Zdjęcia przed/po do dokumentacji/efektów\n\nWiem, że zgodę marketingową mogę wycofać w dowolnym momencie.\n\nPodpis klientki/klienta: ........................................`; 
  }

  window.generateConsentDocument = function () {
    const d = read();
    const id = q('consentDocClient') ? q('consentDocClient').value : '';
    const client = clientById(d, id);
    if (!client.id) return alert('Wybierz kontakt.');
    q('consentDocumentPreview').value = consentText(client, q('consentClinicName').value || '');
  };

  window.copyConsentDocument = function () {
    const text = q('consentDocumentPreview') ? q('consentDocumentPreview').value : '';
    if (!text) return alert('Najpierw wygeneruj dokument.');
    navigator.clipboard.writeText(text).then(() => alert('Treść zgody skopiowana.'));
  };

  window.printConsentDocument = function () {
    const text = q('consentDocumentPreview') ? q('consentDocumentPreview').value : '';
    if (!text) return alert('Najpierw wygeneruj dokument.');
    const win = window.open('', '_blank');
    win.document.write('<pre style="font-family:Arial;white-space:pre-wrap;font-size:14px;line-height:1.5">' + esc(text) + '</pre>');
    win.document.close();
    win.print();
  };

  function renderClientReady() {
    ensureClientPanels();
    fillConsentClients();
    renderPipeline();
    renderCalendarActions();
  }

  setTimeout(renderClientReady, 1000);
  setInterval(renderClientReady, 3000);
})();
