// Advanced sales features demo: auto reminders, recovery campaigns, WhatsApp actions and SMS demo queue.
(function () {
  const STORAGE_KEY = 'beauty_recall_crm_v1';
  let campaignType = 'lost90';

  function q(id) { return document.getElementById(id); }
  function uid() { return crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function esc(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
  function fullName(c) { return `${c.firstName || ''} ${c.lastName || ''}`.trim(); }
  function titleFor(c) { return c && c.gender === 'male' ? 'Pan' : 'Pani'; }
  function normalizePhone(phone) { let p = String(phone || '').replace(/[^0-9]/g, ''); return p.length === 9 ? '48' + p : p; }
  function addDays(dateString, days) { const d = new Date((dateString || todayISO()) + 'T12:00:00'); d.setDate(d.getDate() + Number(days)); return d.toISOString().slice(0, 10); }
  function daysBetween(dateString) { if (!dateString) return null; return Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(dateString + 'T12:00:00')) / 86400000); }
  function formatDate(dateString) { return dateString ? new Intl.DateTimeFormat('pl-PL').format(new Date(dateString + 'T12:00:00')) : '—'; }
  function money(value) { return Number(value || 0).toLocaleString('pl-PL') + ' zł'; }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.clients = data.clients || [];
      data.treatments = data.treatments || [];
      data.reminders = data.reminders || [];
      data.templates = data.templates || [];
      data.smsQueue = data.smsQueue || [];
      return data;
    } catch (e) {
      return { clients: [], treatments: [], reminders: [], templates: [], smsQueue: [] };
    }
  }

  function writeState(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function latestTreatment(data, clientId) {
    return data.treatments
      .filter(t => t.clientId === clientId)
      .sort((a, b) => String(b.treatmentDate).localeCompare(String(a.treatmentDate)))[0];
  }

  function treatmentRule(name) {
    const value = String(name || '').toLowerCase();
    if (value.includes('botoks') || value.includes('toksyna')) return { days: 120, reason: 'botoks — propozycja kolejnej wizyty', estimate: 900, label: 'Botoks: 4 miesiące' };
    if (value.includes('mezoterapia')) return { days: 14, reason: 'mezoterapia — kolejny zabieg z serii', estimate: 500, label: 'Mezoterapia: 14 dni' };
    if (value.includes('peeling')) return { days: 7, reason: 'kontrola po peelingu', estimate: 350, label: 'Peeling: 7 dni' };
    if (value.includes('laser')) return { days: 30, reason: 'laser — kolejna wizyta', estimate: 700, label: 'Laser: 30 dni' };
    if (value.includes('manicure') || value.includes('paznok')) return { days: 21, reason: 'manicure — kolejna wizyta', estimate: 160, label: 'Manicure: 3 tygodnie' };
    if (value.includes('brwi') || value.includes('rzęs')) return { days: 30, reason: 'brwi/rzęsy — kolejna wizyta', estimate: 180, label: 'Brwi/rzęsy: 30 dni' };
    return { days: 30, reason: 'kolejny kontakt po zabiegu', estimate: 300, label: 'Standard: 30 dni' };
  }

  function messageFor(client, treatmentName, type) {
    const title = titleFor(client);
    const name = client.firstName || '';
    const treatment = treatmentName || 'ostatniej wizycie';
    if (type === 'birthday') return `${title} ${name}, z okazji urodzin życzymy wszystkiego pięknego. Mamy mały prezent na kolejną wizytę — proszę odpisać, jeśli chce ${title === 'Pan' ? 'Pan' : 'Pani'} poznać szczegóły.`;
    if (type === 'botox') return `${title} ${name}, minęło już trochę czasu od zabiegu: ${treatment}. To dobry moment, żeby zaplanować kolejną wizytę. Czy mam zaproponować termin?`;
    if (type === 'due') return `${title} ${name}, przypominam o kontakcie z gabinetem. Czy chce ${title === 'Pan' ? 'Pan' : 'Pani'} umówić wizytę?`;
    return `${title} ${name}, dawno nie widzieliśmy się w gabinecie po zabiegu: ${treatment}. Mam kilka wolnych terminów w tym tygodniu — czy chce ${title === 'Pan' ? 'Pan' : 'Pani'}, żebym zaproponowała termin?`;
  }

  function enhanceTreatmentAuto() {
    const select = q('reminderPreset');
    if (!select || select.dataset.autoReady === '1') return;
    select.dataset.autoReady = '1';
    const option = document.createElement('option');
    option.value = 'auto';
    option.textContent = 'Auto wg zabiegu';
    select.insertBefore(option, select.children[1] || null);

    const oldUpdate = window.updateReminderDate;
    window.updateReminderDate = function () {
      if (q('reminderPreset') && q('reminderPreset').value === 'auto') {
        const treatmentName = q('treatmentName') ? q('treatmentName').value.trim() : '';
        const treatmentDate = q('treatmentDate') ? q('treatmentDate').value : todayISO();
        const rule = treatmentRule(treatmentName);
        if (q('reminderDate')) q('reminderDate').value = addDays(treatmentDate, rule.days);
        if (q('reminderReason')) q('reminderReason').value = rule.reason;
        const data = readState();
        const clientId = q('treatmentClientId') ? q('treatmentClientId').value : '';
        const client = data.clients.find(c => c.id === clientId) || {};
        if (q('reminderMessage')) q('reminderMessage').value = messageFor(client, treatmentName || 'zabieg', treatmentName.toLowerCase().includes('botoks') ? 'botox' : 'lost');
        return;
      }
      if (oldUpdate) oldUpdate();
    };

    ['treatmentName', 'treatmentDate'].forEach(id => {
      const el = q(id);
      if (el) el.addEventListener('input', function () { if (q('reminderPreset') && q('reminderPreset').value === 'auto') window.updateReminderDate(); });
    });
  }

  function ensureViews() {
    const tabs = document.querySelector('.tabs');
    const main = document.querySelector('main');
    if (!tabs || !main || q('view-campaigns')) return;

    tabs.insertAdjacentHTML('beforeend', `
      <button class="tab" data-view="campaigns" onclick="setView('campaigns')">Kampanie</button>
      <button class="tab" data-view="sms" onclick="setView('sms')">SMS demo</button>
    `);

    const footer = main.querySelector('.footer-note');
    const html = `
      <section id="view-campaigns" class="view app-section">
        <div class="panel">
          <h2>Kampanie odzyskiwania klientek</h2>
          <p class="panel-subtitle">CRM pokazuje osoby, do których warto napisać, i generuje gotowe wiadomości WhatsApp/SMS.</p>
          <div class="actions">
            <button class="secondary small" onclick="setCampaignType('lost90')">Nie wrócili 90+ dni</button>
            <button class="secondary small" onclick="setCampaignType('botox')">Botoks 4 miesiące</button>
            <button class="secondary small" onclick="setCampaignType('birthdays')">Urodziny</button>
            <button class="secondary small" onclick="setCampaignType('due')">Na dziś</button>
          </div>
          <section id="campaignSummary" class="cards" style="margin-top:14px"></section>
          <div id="campaignTable" style="margin-top:12px"></div>
        </div>
      </section>

      <section id="view-sms" class="view app-section">
        <div class="panel">
          <h2>Automatyczne SMS — demo</h2>
          <p class="panel-subtitle">W demo CRM tworzy kolejkę SMS. W wersji produkcyjnej podpina się operatora SMS i backend do prawdziwej wysyłki.</p>
          <div class="actions">
            <button onclick="buildSmsQueueFromDue()">Dodaj SMS-y z przypomnień na dziś</button>
            <button class="secondary" onclick="simulateSmsSend()">Symuluj wysyłkę</button>
          </div>
          <section id="smsStats" class="cards" style="margin-top:14px"></section>
          <div id="smsQueueTable" style="margin-top:12px"></div>
        </div>
      </section>
    `;
    footer.insertAdjacentHTML('beforebegin', html);
  }

  function campaignRows(type) {
    const data = readState();
    const today = todayISO();
    const rows = [];
    data.clients.forEach(client => {
      const latest = latestTreatment(data, client.id);
      const age = latest ? daysBetween(latest.treatmentDate) : null;
      let include = false;
      let kind = 'lost';
      if (type === 'lost90') include = !latest || age >= 90;
      if (type === 'botox') { include = latest && /botoks|toksyna/i.test(latest.treatmentName) && age >= 100; kind = 'botox'; }
      if (type === 'birthdays') { include = client.birthDate && client.birthDate.slice(5, 7) === today.slice(5, 7); kind = 'birthday'; }
      if (type === 'due') { include = data.reminders.some(r => r.clientId === client.id && r.status !== 'done' && r.remindAt <= today); kind = 'due'; }
      if (include) rows.push({ client, latest, age, message: messageFor(client, latest ? latest.treatmentName : '', kind), estimate: latest && latest.price ? Number(latest.price) : treatmentRule(latest ? latest.treatmentName : '').estimate });
    });
    return rows;
  }

  function renderCampaigns() {
    ensureViews();
    const summary = q('campaignSummary');
    const table = q('campaignTable');
    if (!summary || !table) return;
    const rows = campaignRows(campaignType);
    const potential = rows.reduce((sum, row) => sum + Number(row.estimate || 0), 0);
    const titles = { lost90: 'Nie wrócili 90+ dni', botox: 'Botoks 4 miesiące', birthdays: 'Urodziny', due: 'Na dziś' };

    summary.innerHTML = `
      <div class="stat"><strong>${rows.length}</strong><span>kontaktów w kampanii</span></div>
      <div class="stat"><strong>${money(potential)}</strong><span>szacowany potencjał</span></div>
      <div class="stat"><strong>${esc(titles[campaignType])}</strong><span>aktywny filtr</span></div>
    `;

    if (!rows.length) {
      table.innerHTML = `<div class="empty">Brak kontaktów w tej kampanii.</div>`;
      return;
    }

    table.innerHTML = `<table><thead><tr><th>Kontakt</th><th>Ostatnia aktywność</th><th>Gotowa wiadomość</th><th>Akcje</th></tr></thead><tbody>${rows.map(row => `
      <tr>
        <td><strong>${esc(fullName(row.client))}</strong><br><span class="muted">${titleFor(row.client)} · ${esc(row.client.phone || 'brak telefonu')}</span></td>
        <td>${row.latest ? `${esc(row.latest.treatmentName)}<br><span class="muted">${formatDate(row.latest.treatmentDate)} · ${row.age} dni temu</span>` : 'Brak zabiegów'}</td>
        <td><div class="message-box">${esc(row.message)}</div></td>
        <td><div class="actions" style="margin-top:0">
          <button class="small" onclick='campaignWhatsApp(${JSON.stringify(row.client.id)})'>WhatsApp</button>
          <button class="secondary small" onclick='campaignCopy(${JSON.stringify(row.client.id)})'>Kopiuj</button>
          <button class="secondary small" onclick='campaignSms(${JSON.stringify(row.client.id)})'>SMS demo</button>
        </div></td>
      </tr>`).join('')}</tbody></table>`;
  }

  function getCampaignRow(clientId) {
    return campaignRows(campaignType).find(row => row.client.id === clientId);
  }

  window.setCampaignType = function (type) {
    campaignType = type;
    renderCampaigns();
  };

  window.campaignWhatsApp = function (clientId) {
    const row = getCampaignRow(clientId);
    if (!row) return alert('Nie znaleziono kontaktu w kampanii.');
    const phone = normalizePhone(row.client.phone);
    if (!phone) return alert('Brak telefonu.');
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(row.message), '_blank');
  };

  window.campaignCopy = function (clientId) {
    const row = getCampaignRow(clientId);
    if (!row) return;
    navigator.clipboard.writeText(row.message).then(() => alert('Wiadomość skopiowana.'));
  };

  function addSms(clientId, message, source) {
    const data = readState();
    const client = data.clients.find(c => c.id === clientId);
    if (!client) return alert('Nie znaleziono kontaktu.');
    if (!normalizePhone(client.phone)) return alert('Ten kontakt nie ma telefonu.');
    data.smsQueue = data.smsQueue || [];
    data.smsQueue.push({ id: uid(), clientId, message, source, status: 'queued', createdAt: new Date().toISOString(), sentAt: '' });
    writeState(data);
    renderSmsQueue();
    alert('Dodano do kolejki SMS demo.');
  }

  window.campaignSms = function (clientId) {
    const row = getCampaignRow(clientId);
    if (!row) return;
    addSms(clientId, row.message, 'kampania: ' + campaignType);
  };

  window.buildSmsQueueFromDue = function () {
    const data = readState();
    const today = todayISO();
    data.smsQueue = data.smsQueue || [];
    let added = 0;
    data.reminders.filter(r => r.status !== 'done' && r.remindAt <= today).forEach(reminder => {
      const client = data.clients.find(c => c.id === reminder.clientId);
      if (client && normalizePhone(client.phone)) {
        data.smsQueue.push({ id: uid(), clientId: client.id, message: reminder.message || reminder.reason || '', source: 'przypomnienie na dziś', status: 'queued', createdAt: new Date().toISOString(), sentAt: '' });
        added++;
      }
    });
    writeState(data);
    renderSmsQueue();
    alert('Dodano do kolejki SMS demo: ' + added);
  };

  window.simulateSmsSend = function () {
    const data = readState();
    let count = 0;
    data.smsQueue = (data.smsQueue || []).map(sms => {
      if (sms.status === 'queued') { count++; return { ...sms, status: 'sent', sentAt: new Date().toISOString() }; }
      return sms;
    });
    writeState(data);
    renderSmsQueue();
    alert('Symulowana wysyłka SMS: ' + count);
  };

  window.openSmsApp = function (smsId) {
    const data = readState();
    const sms = (data.smsQueue || []).find(item => item.id === smsId);
    const client = sms ? data.clients.find(c => c.id === sms.clientId) : null;
    if (!sms || !client) return alert('Nie znaleziono SMS-a.');
    const phone = normalizePhone(client.phone);
    window.open('sms:+' + phone + '?body=' + encodeURIComponent(sms.message), '_blank');
  };

  window.deleteSmsDemo = function (smsId) {
    const data = readState();
    data.smsQueue = (data.smsQueue || []).filter(item => item.id !== smsId);
    writeState(data);
    renderSmsQueue();
  };

  function renderSmsQueue() {
    ensureViews();
    const stats = q('smsStats');
    const table = q('smsQueueTable');
    if (!stats || !table) return;
    const data = readState();
    const queue = data.smsQueue || [];
    const queued = queue.filter(sms => sms.status === 'queued').length;
    const sent = queue.filter(sms => sms.status === 'sent').length;
    stats.innerHTML = `
      <div class="stat"><strong>${queued}</strong><span>SMS w kolejce</span></div>
      <div class="stat"><strong>${sent}</strong><span>wysłane demo</span></div>
      <div class="stat"><strong>operator SMS</strong><span>w produkcji: API + backend</span></div>
    `;

    if (!queue.length) {
      table.innerHTML = `<div class="empty">Kolejka SMS jest pusta. Dodaj SMS z kampanii albo przypomnień.</div>`;
      return;
    }

    table.innerHTML = `<table><thead><tr><th>Status</th><th>Kontakt</th><th>Źródło</th><th>Treść</th><th>Akcje</th></tr></thead><tbody>${queue.slice().reverse().map(sms => {
      const client = data.clients.find(c => c.id === sms.clientId) || {};
      return `<tr>
        <td>${sms.status === 'sent' ? '<span class="pill green">wysłany demo</span>' : '<span class="pill">w kolejce</span>'}</td>
        <td><strong>${esc(fullName(client))}</strong><br><span class="muted">${esc(client.phone || '')}</span></td>
        <td>${esc(sms.source || 'manual')}</td>
        <td><div class="message-box">${esc(sms.message)}</div></td>
        <td><div class="actions" style="margin-top:0"><button class="small" onclick='openSmsApp(${JSON.stringify(sms.id)})'>SMS app</button><button class="danger small" onclick='deleteSmsDemo(${JSON.stringify(sms.id)})'>Usuń</button></div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  }

  function bootAdvanced() {
    ensureViews();
    enhanceTreatmentAuto();
    renderCampaigns();
    renderSmsQueue();
    console.log('BeautyRecall advanced features OK');
  }

  setTimeout(bootAdvanced, 300);
  setInterval(function () { ensureViews(); enhanceTreatmentAuto(); renderCampaigns(); renderSmsQueue(); }, 2500);
})();
