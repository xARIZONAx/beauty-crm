// Gender field + correct greeting for demo CRM.
(function () {
  const baseKey = 'beauty_recall_crm_v1';

  function q(id) { return document.getElementById(id); }

  function readState() {
    try { return JSON.parse(localStorage.getItem(baseKey) || '{}'); }
    catch (e) { return {}; }
  }

  function writeState(data) {
    localStorage.setItem(baseKey, JSON.stringify(data));
  }

  function ensureGenderField() {
    if (q('gender')) return;
    const firstRow = document.querySelector('#clientForm .row.two');
    if (!firstRow) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = '<label>Płeć</label><select id="gender"><option value="female">Kobieta — Pani</option><option value="male">Mężczyzna — Pan</option></select>';
    firstRow.appendChild(wrap);
  }

  function findClientByForm(data, oldId) {
    if (!data || !Array.isArray(data.clients)) return null;
    if (oldId) return data.clients.find(function (c) { return c.id === oldId; });
    const firstName = (q('firstName') && q('firstName').value.trim()) || '';
    const lastName = (q('lastName') && q('lastName').value.trim()) || '';
    const phone = (q('phone') && q('phone').value.trim()) || '';
    const email = (q('email') && q('email').value.trim()) || '';
    for (let i = data.clients.length - 1; i >= 0; i--) {
      const c = data.clients[i];
      if ((c.firstName || '') === firstName && (c.lastName || '') === lastName && (c.phone || '') === phone && (c.email || '') === email) return c;
    }
    return data.clients[data.clients.length - 1] || null;
  }

  function titleFor(client) {
    return client && client.gender === 'male' ? 'Pan' : 'Pani';
  }

  const oldReplaceVars = window.replaceVars;
  window.replaceVars = function (text, client, treatmentName) {
    let result = oldReplaceVars ? oldReplaceVars(text, client, treatmentName) : String(text || '');
    const title = titleFor(client);
    result = result.replaceAll('{zwrot}', title);
    if (title === 'Pan') {
      result = result.replace(/^Pani\s+/i, 'Pan ');
      result = result.replace(/\bPani\s+/g, 'Pan ');
    }
    return result;
  };

  const oldOpenClientModal = window.openClientModal;
  window.openClientModal = function (id) {
    if (oldOpenClientModal) oldOpenClientModal(id);
    ensureGenderField();
    const data = readState();
    const client = data.clients && data.clients.find(function (c) { return c.id === id; });
    if (q('gender')) q('gender').value = client && client.gender ? client.gender : 'female';
  };

  const oldSaveClient = window.saveClient;
  window.saveClient = function (event) {
    ensureGenderField();
    const oldId = q('clientId') ? q('clientId').value : '';
    const chosenGender = q('gender') ? q('gender').value : 'female';

    if (oldSaveClient) oldSaveClient(event);

    setTimeout(function () {
      const data = readState();
      const client = findClientByForm(data, oldId);
      if (client) {
        client.gender = chosenGender;
        writeState(data);
      }
      if (window.renderAll) window.renderAll();
    }, 50);
  };

  const oldRenderClientDetails = window.renderClientDetails;
  window.renderClientDetails = function () {
    if (oldRenderClientDetails) oldRenderClientDetails();
    const details = q('clientDetails');
    if (!details || details.querySelector('[data-gender-pill]')) return;
    const nameEl = details.querySelector('h2');
    if (!nameEl) return;
    const shownName = nameEl.textContent.trim();
    const data = readState();
    const client = data.clients && data.clients.find(function (c) {
      return ((c.firstName || '') + ' ' + (c.lastName || '')).trim() === shownName;
    });
    if (!client) return;
    const target = details.querySelector('.pill');
    if (!target) return;
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.setAttribute('data-gender-pill', '1');
    pill.textContent = 'zwrot: ' + titleFor(client);
    target.parentNode.insertBefore(pill, target.nextSibling);
  };

  const oldRenderAll = window.renderAll;
  window.renderAll = function () {
    if (oldRenderAll) oldRenderAll();
    ensureGenderField();
  };

  setTimeout(function () {
    ensureGenderField();
    if (window.renderAll) window.renderAll();
  }, 300);
})();
