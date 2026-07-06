// Fill demo data for RODO, SMS demo, contact status and calendar tabs.
(function () {
  const key = 'beauty_recall_crm_v1';

  function uid() { return crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(dateString, days) { const d = new Date((dateString || todayISO()) + 'T12:00:00'); d.setDate(d.getDate() + Number(days)); return d.toISOString().slice(0, 10); }
  function fullName(c) { return `${c.firstName || ''} ${c.lastName || ''}`.trim(); }
  function read() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } }
  function write(d) { localStorage.setItem(key, JSON.stringify(d)); }

  function ensureArrays(d) {
    d.clients = d.clients || [];
    d.treatments = d.treatments || [];
    d.reminders = d.reminders || [];
    d.templates = d.templates || [];
    d.appointments = d.appointments || [];
    d.smsQueue = d.smsQueue || [];
    return d;
  }

  function findOrCreateClient(d, firstName, lastName, gender, phone, email, birthDate, notes) {
    let c = d.clients.find(x => (x.firstName || '').toLowerCase() === firstName.toLowerCase() && (x.lastName || '').toLowerCase() === lastName.toLowerCase());
    if (!c) {
      c = { id: uid(), firstName, lastName, gender, phone, email, birthDate, marketingConsent: true, notes, createdAt: new Date().toISOString() };
      d.clients.push(c);
    }
    c.gender = gender;
    c.phone = c.phone || phone;
    c.email = c.email || email;
    c.birthDate = c.birthDate || birthDate;
    c.marketingConsent = true;
    c.notes = c.notes || notes;
    return c;
  }

  function addTreatmentIfMissing(d, client, treatmentName, date, area, product, price) {
    let t = d.treatments.find(x => x.clientId === client.id && x.treatmentName === treatmentName && x.treatmentDate === date);
    if (!t) {
      t = { id: uid(), clientId: client.id, treatmentName, treatmentDate: date, area, productUsed: product, price: String(price), notes: 'Dane demo do prezentacji CRM.', createdAt: new Date().toISOString() };
      d.treatments.push(t);
    }
    return t;
  }

  function message(client, treatment) {
    const title = client.gender === 'male' ? 'Panie' : 'Pani';
    return `${title} ${client.firstName}, przypominamy o możliwości umówienia kolejnej wizyty po zabiegu: ${treatment}. Czy mamy zaproponować dogodny termin?`;
  }

  function addReminderIfMissing(d, client, treatment, date, status, contactStatus, reason) {
    let r = d.reminders.find(x => x.clientId === client.id && x.reason === reason);
    if (!r) {
      r = { id: uid(), clientId: client.id, treatmentId: treatment ? treatment.id : null, remindAt: date, reason, message: message(client, treatment ? treatment.treatmentName : 'wizyta'), status, contactStatus, contactStatusAt: new Date().toISOString(), createdAt: new Date().toISOString() };
      d.reminders.push(r);
    } else {
      r.contactStatus = r.contactStatus || contactStatus;
      r.status = r.status || status;
      r.message = r.message || message(client, treatment ? treatment.treatmentName : 'wizyta');
    }
    return r;
  }

  function addAppointmentIfMissing(d, client, date, time, treatment, value, status, note) {
    let a = d.appointments.find(x => x.clientId === client.id && x.date === date && x.treatment === treatment);
    if (!a) {
      a = { id: uid(), clientId: client.id, date, time, treatment, value, status, note, createdAt: new Date().toISOString() };
      d.appointments.push(a);
    }
    return a;
  }

  function addSmsIfMissing(d, client, text, source, status) {
    let s = d.smsQueue.find(x => x.clientId === client.id && x.source === source);
    if (!s) {
      s = { id: uid(), clientId: client.id, message: text, source, status, createdAt: new Date().toISOString(), sentAt: status === 'sent' ? new Date().toISOString() : '' };
      d.smsQueue.push(s);
    }
    return s;
  }

  function fillDemoData(force) {
    let d = ensureArrays(read());
    if (!force && d.demoOpsFilled === true) return false;

    const anna = findOrCreateClient(d, 'Anna', 'Kowalska', 'female', '500000000', 'anna@example.com', '1982-05-20', 'Stała klientka. Preferuje WhatsApp.');
    const ewa = findOrCreateClient(d, 'Ewa', 'Nowak', 'female', '600000000', 'ewa@example.com', '1979-03-12', 'Zainteresowana serią mezoterapii.');
    const maciej = findOrCreateClient(d, 'Maciej', 'Kaliszewski', 'male', '535530806', 'maciej@example.com', '1988-11-04', 'Klient testowy do zwrotu Pan/Panie.');
    const ola = findOrCreateClient(d, 'Ola', 'Wiśniewska', 'female', '511222333', 'ola@example.com', '1990-07-18', 'Klientka VIP, lubi krótkie wiadomości.');
    const clients = [anna, ewa, maciej, ola];

    clients.forEach((c, i) => {
      c.consents = {
        sms: i !== 1,
        whatsapp: true,
        email: i === 0 || i === 3,
        photos: i === 3,
        rodoInfo: true,
        date: addDays(todayISO(), -20 + i)
      };
      c.marketingConsent = c.consents.sms || c.consents.whatsapp || c.consents.email;
    });

    const tAnna = addTreatmentIfMissing(d, anna, 'Botoks', addDays(todayISO(), -121), 'czoło', 'preparat A', 900);
    const tEwa = addTreatmentIfMissing(d, ewa, 'Mezoterapia', addDays(todayISO(), -18), 'twarz', 'koktajl mezoterapeutyczny', 500);
    const tMaciej = addTreatmentIfMissing(d, maciej, 'Peeling', addDays(todayISO(), -9), 'twarz', 'kwas migdałowy', 350);
    const tOla = addTreatmentIfMissing(d, ola, 'Laser', addDays(todayISO(), -35), 'policzki', 'laser frakcyjny', 700);

    addReminderIfMissing(d, anna, tAnna, todayISO(), 'pending', 'sent', 'botoks — kolejna wizyta');
    addReminderIfMissing(d, ewa, tEwa, todayISO(), 'pending', 'replied', 'mezoterapia — kolejny zabieg z serii');
    addReminderIfMissing(d, maciej, tMaciej, addDays(todayISO(), 1), 'pending', 'no_reply', 'kontrola po peelingu');
    addReminderIfMissing(d, ola, tOla, addDays(todayISO(), 2), 'pending', 'booked', 'laser — kolejna wizyta');

    addAppointmentIfMissing(d, anna, todayISO(), '12:00', 'Botoks', 900, 'planned', 'Potwierdzić rano.');
    addAppointmentIfMissing(d, ewa, addDays(todayISO(), 1), '15:30', 'Mezoterapia', 500, 'planned', 'Drugi zabieg z serii.');
    addAppointmentIfMissing(d, maciej, addDays(todayISO(), 2), '10:00', 'Kontrola po peelingu', 0, 'planned', 'Krótka kontrola skóry.');
    addAppointmentIfMissing(d, ola, addDays(todayISO(), -1), '17:00', 'Laser', 700, 'done', 'Wizyta odbyta.');
    addAppointmentIfMissing(d, ewa, addDays(todayISO(), -3), '11:30', 'Peeling', 350, 'canceled', 'Odwołana — do odzyskania.');

    addSmsIfMissing(d, anna, 'Pani Anno, minęły 4 miesiące od ostatniego zabiegu. Czy zaproponować dogodny termin?', 'kampania: botoks 4 miesiące', 'queued');
    addSmsIfMissing(d, ewa, 'Pani Ewo, przypominamy o kolejnym zabiegu z serii mezoterapii. Czy pasuje Pani termin w tym tygodniu?', 'przypomnienie na dziś', 'sent');
    addSmsIfMissing(d, maciej, 'Panie Macieju, przypominamy o kontroli po peelingu. Czy termin jest aktualny?', 'kontrola po zabiegu', 'queued');

    d.demoOpsFilled = true;
    d.demoOpsFilledAt = new Date().toISOString();
    write(d);
    return true;
  }

  function addDemoButton() {
    if (document.getElementById('fillDemoOpsBtn')) return;
    const notice = document.querySelector('.notice');
    if (!notice) return;
    notice.insertAdjacentHTML('afterend', `<div class="panel app-section" style="box-shadow:none;margin-bottom:12px"><strong>Dane demo do prezentacji</strong><p class="panel-subtitle">Uzupełnia RODO, SMS demo, status kontaktu i kalendarz przykładowymi rekordami.</p><div class="actions"><button id="fillDemoOpsBtn" onclick="fillOperationsDemoData(true)">Uzupełnij tabele demo</button></div></div>`);
  }

  window.fillOperationsDemoData = function (force) {
    const ok = fillDemoData(!!force);
    if (force) alert('Tabele demo zostały uzupełnione.');
    if (typeof renderAll === 'function') renderAll();
  };

  setTimeout(function () {
    addDemoButton();
    fillDemoData(false);
    if (typeof renderAll === 'function') renderAll();
  }, 1200);
})();
