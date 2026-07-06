// Gender field + correct greeting for demo CRM.
(function () {
  function q(id) { return document.getElementById(id); }

  function ensureGenderField() {
    if (q('gender')) return;
    const row = document.querySelector('#clientForm .row.two');
    if (!row) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = '<label>Płeć</label><select id="gender"><option value="female">Kobieta — Pani</option><option value="male">Mężczyzna — Pan</option></select>';
    row.appendChild(wrap);
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
    ensureGenderField();
    if (oldOpenClientModal) oldOpenClientModal(id);
    ensureGenderField();
    const client = window.state && window.state.clients ? window.state.clients.find(function (c) { return c.id === id; }) : null;
    const gender = q('gender');
    if (gender) gender.value = client && client.gender ? client.gender : 'female';
  };

  window.saveClient = function (event) {
    event.preventDefault();
    ensureGenderField();
    const id = q('clientId').value;
    const client = {
      id: id || (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
      firstName: q('firstName').value.trim(),
      lastName: q('lastName').value.trim(),
      gender: q('gender') ? q('gender').value : 'female',
      phone: q('phone').value.trim(),
      email: q('email').value.trim(),
      birthDate: q('birthDate').value,
      marketingConsent: q('marketingConsent').value === 'true',
      notes: q('notes').value.trim(),
      createdAt: id ? ((window.state.clients.find(function (c) { return c.id === id; }) || {}).createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (id) window.state.clients = window.state.clients.map(function (c) { return c.id === id ? client : c; });
    else {
      window.state.clients.push(client);
      window.selectedClientId = client.id;
    }

    if (window.closeClientModal) window.closeClientModal();
    if (window.saveState) window.saveState();
  };

  const oldRenderClientDetails = window.renderClientDetails;
  window.renderClientDetails = function () {
    if (oldRenderClientDetails) oldRenderClientDetails();
    const client = window.state && window.state.clients ? window.state.clients.find(function (c) { return c.id === window.selectedClientId; }) : null;
    const details = q('clientDetails');
    if (!client || !details || details.querySelector('[data-gender-pill]')) return;
    const title = titleFor(client);
    const target = details.querySelector('.pill');
    if (!target) return;
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.setAttribute('data-gender-pill', '1');
    pill.textContent = 'zwrot: ' + title;
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
