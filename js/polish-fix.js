// Polish vocative names and phone-only SMS fix.
(function () {
  const key = 'beauty_recall_crm_v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { return {}; }
  }

  function normPhone(phone) {
    let p = String(phone || '').replace(/[^0-9]/g, '');
    return p.length === 9 ? '48' + p : p;
  }

  function escReg(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function cap(original, value) {
    return original && original[0] === original[0].toUpperCase()
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : value;
  }

  function vocative(firstName, gender) {
    const original = String(firstName || '').trim();
    const n = original.toLowerCase();
    if (!n) return '';
    const f = { anna:'anno', maria:'mario', joanna:'joanno', asia:'asiu', kasia:'kasiu', basia:'basiu', zosia:'zosiu', gosia:'gosiu', ola:'olu', maja:'maju', ewa:'ewo', iwona:'iwono', julia:'julio', alicja:'alicjo', natalia:'natalio', agnieszka:'agnieszko', katarzyna:'katarzyno', monika:'moniko', marta:'marto', dorota:'doroto', beata:'beato', justyna:'justyno', aleksandra:'aleksandro', małgorzata:'małgorzato', karolina:'karolino', magdalena:'magdaleno', paulina:'paulino' };
    const m = { maciej:'macieju', michał:'michale', paweł:'pawle', piotr:'piotrze', marek:'marku', jacek:'jacku', wojciech:'wojciechu', wojtek:'wojtku', tomek:'tomku', tomasz:'tomaszu', łukasz:'łukaszu', mateusz:'mateuszu', grzegorz:'grzegorzu', krzysztof:'krzysztofie', robert:'robercie', adam:'adamie', jan:'janie', jakub:'jakubie', marcin:'marcinie', karol:'karolu', kamil:'kamilu', artur:'arturze', rafał:'rafale', andrzej:'andrzeju' };
    if (gender === 'male') {
      if (m[n]) return cap(original, m[n]);
      if (n.endsWith('ek')) return cap(original, n.slice(0, -2) + 'ku');
      if (n.endsWith('ł')) return cap(original, n.slice(0, -1) + 'le');
      if (n.endsWith('sz') || n.endsWith('cz')) return cap(original, n + 'u');
      if (n.endsWith('r')) return cap(original, n + 'ze');
      if (n.endsWith('n')) return cap(original, n + 'ie');
      if (n.endsWith('k') || n.endsWith('l')) return cap(original, n + 'u');
      return cap(original, n + 'ie');
    }
    if (f[n]) return cap(original, f[n]);
    if (n.endsWith('sia') || n.endsWith('cia') || n.endsWith('zia')) return cap(original, n.slice(0, -1) + 'u');
    if (n.endsWith('a')) return cap(original, n.slice(0, -1) + 'o');
    return original;
  }

  function fixForClient(text, client) {
    if (!client || !client.firstName) return String(text || '');
    const title = client.gender === 'male' ? 'Pan' : 'Pani';
    const first = client.firstName;
    const voc = vocative(first, client.gender);
    const pattern = new RegExp('\\b(Pani|Pan)\\s+' + escReg(first) + '\\b', 'g');
    let out = String(text || '');
    const matched = pattern.test(out);
    pattern.lastIndex = 0;
    out = out.replace(pattern, title + ' ' + voc);
    if (matched) {
      out = out.replaceAll('Pan/Pani', title).replaceAll('pan/pani', title.toLowerCase());
      if (title === 'Pan') out = out.replace(/\bPani\b/g, 'Pan').replace(/\bpani\b/g, 'pan');
    }
    return out;
  }

  function fixAll(text) {
    const data = read();
    let out = String(text || '');
    (data.clients || []).forEach(function (c) { out = fixForClient(out, c); });
    return out;
  }

  function mobile() {
    return /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent);
  }

  function install() {
    if (window.__beautyPolishFixReady) return;
    window.__beautyPolishFixReady = true;

    const oldReplaceVars = window.replaceVars;
    if (typeof oldReplaceVars === 'function') {
      window.replaceVars = function (text, client, treatmentName) {
        return fixForClient(oldReplaceVars(text, client, treatmentName), client);
      };
    }

    const oldOpenWhatsApp = window.openWhatsApp;
    if (typeof oldOpenWhatsApp === 'function') {
      window.openWhatsApp = function (reminderId) {
        const data = read();
        const r = (data.reminders || []).find(function (x) { return x.id === reminderId; });
        const c = r ? (data.clients || []).find(function (x) { return x.id === r.clientId; }) : null;
        if (!r || !c) return oldOpenWhatsApp(reminderId);
        const phone = normPhone(c.phone);
        if (!phone) return alert('Ten kontakt nie ma numeru telefonu.');
        const msg = fixForClient(r.message || r.reason || 'Dzień dobry, przypominamy o kontakcie z gabinetem.', c);
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
      };
    }

    const oldCopy = window.copyMessage;
    if (typeof oldCopy === 'function') {
      window.copyMessage = function (reminderId) {
        const data = read();
        const r = (data.reminders || []).find(function (x) { return x.id === reminderId; });
        const c = r ? (data.clients || []).find(function (x) { return x.id === r.clientId; }) : null;
        if (!r || !navigator.clipboard) return oldCopy(reminderId);
        navigator.clipboard.writeText(fixForClient(r.message || r.reason || '', c)).then(function () { alert('Wiadomość skopiowana.'); });
      };
    }

    window.openSmsApp = function (smsId) {
      if (!mobile()) return alert('SMS z aplikacji działa tylko na telefonie. Na komputerze użyj WhatsApp albo kopiowania wiadomości.');
      const data = read();
      const sms = (data.smsQueue || []).find(function (x) { return x.id === smsId; });
      const c = sms ? (data.clients || []).find(function (x) { return x.id === sms.clientId; }) : null;
      if (!sms || !c) return alert('Nie znaleziono SMS-a.');
      const phone = normPhone(c.phone);
      if (!phone) return alert('Brak telefonu.');
      const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
      window.location.href = ('s' + 'ms:+') + phone + sep + 'body=' + encodeURIComponent(fixForClient(sms.message || '', c));
    };

    const data = read();
    let changed = false;
    (data.reminders || []).forEach(function (r) {
      const c = (data.clients || []).find(function (x) { return x.id === r.clientId; });
      const fixed = fixForClient(r.message || '', c);
      if (fixed && fixed !== r.message) { r.message = fixed; changed = true; }
    });
    if (changed) localStorage.setItem(key, JSON.stringify(data));
  }

  function markSmsButtons() {
    if (mobile()) return;
    document.querySelectorAll('button[onclick^="openSmsApp"]').forEach(function (b) {
      b.textContent = 'SMS tylko telefon';
      b.title = 'SMS działa tylko na telefonie';
    });
  }

  setTimeout(install, 1000);
  setTimeout(install, 2500);
  setInterval(markSmsButtons, 1000);
})();
