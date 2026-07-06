// Live Supabase mode: shared data between phone and computer.
(function () {
  const cfg = window.BEAUTY_SUPABASE;
  if (!cfg || !window.supabase) return;

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  let user = null;
  let clients = [];

  function q(id) { return document.getElementById(id); }
  function esc(v) { return String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
  function title(c) { return c.gender === 'male' ? 'Pan' : 'Pani'; }
  function fullName(c) { return `${c.first_name || ''} ${c.last_name || ''}`.trim(); }

  function renderShell() {
    document.body.innerHTML = `
      <header>
        <section class="hero">
          <div class="brand">
            <h1>BeautyRecall CRM</h1>
            <p>Wersja live: dane zapisują się w Supabase i są widoczne na telefonie oraz komputerze.</p>
          </div>
          <div class="hero-actions" id="liveTopActions"></div>
        </section>
      </header>
      <main>
        <div class="notice">Po zalogowaniu tym samym e-mailem na innym urządzeniu zobaczysz te same dane.</div>
        <section id="liveAuth" class="panel"></section>
        <section id="liveApp" style="display:none"></section>
      </main>
    `;
  }

  function renderAuth() {
    const box = q('liveAuth');
    if (!box) return;
    if (user) {
      box.innerHTML = `
        <h2>Jesteś zalogowany</h2>
        <p class="panel-subtitle">Konto: <strong>${esc(user.email)}</strong></p>
        <div class="actions"><button class="secondary" onclick="liveSignOut()">Wyloguj</button></div>
      `;
      q('liveTopActions').innerHTML = `<button onclick="openLiveClientForm()">+ Dodaj klientkę/klienta</button>`;
    } else {
      box.innerHTML = `
        <h2>Logowanie live</h2>
        <p class="panel-subtitle">Utwórz konto albo zaloguj się. Te dane będą wspólne na komputerze i telefonie.</p>
        <div class="row two">
          <div><label>E-mail</label><input id="liveEmail" type="email" placeholder="email@example.com"></div>
          <div><label>Hasło</label><input id="livePassword" type="password" placeholder="min. 6 znaków"></div>
        </div>
        <div class="actions">
          <button onclick="liveSignIn()">Zaloguj</button>
          <button class="secondary" onclick="liveSignUp()">Utwórz konto</button>
        </div>
        <p id="liveAuthMsg" class="footer-note"></p>
      `;
      q('liveTopActions').innerHTML = '';
    }
  }

  function renderApp() {
    const app = q('liveApp');
    if (!app) return;
    app.style.display = user ? 'block' : 'none';
    if (!user) return;

    app.innerHTML = `
      <section class="cards app-section">
        <div class="stat"><strong>${clients.length}</strong><span>kontaktów w bazie online</span></div>
        <div class="stat"><strong>Supabase</strong><span>wspólna baza</span></div>
        <div class="stat"><strong>RLS</strong><span>dane tylko Twojego konta</span></div>
      </section>

      <section class="panel app-section">
        <h2>Dodaj kontakt</h2>
        <form onsubmit="saveLiveClient(event)">
          <div class="row three">
            <div><label>Imię *</label><input id="liveFirstName" required placeholder="Anna"></div>
            <div><label>Nazwisko</label><input id="liveLastName" placeholder="Kowalska"></div>
            <div><label>Płeć</label><select id="liveGender"><option value="female">Kobieta — Pani</option><option value="male">Mężczyzna — Pan</option></select></div>
          </div>
          <div class="row two">
            <div><label>Telefon</label><input id="livePhone" placeholder="500000000"></div>
            <div><label>E-mail</label><input id="liveClientEmail" type="email" placeholder="anna@email.pl"></div>
          </div>
          <label>Notatka</label><textarea id="liveNotes" placeholder="np. preferuje WhatsApp"></textarea>
          <div class="actions"><button type="submit">Zapisz online</button></div>
        </form>
      </section>

      <section class="panel app-section">
        <h2>Kontakty z Supabase</h2>
        ${clients.length ? clientTable() : '<div class="empty">Brak kontaktów. Dodaj pierwszy kontakt i sprawdź potem na telefonie.</div>'}
      </section>
    `;
  }

  function clientTable() {
    return `<table><thead><tr><th>Kontakt</th><th>Telefon</th><th>E-mail</th><th>Zwrot</th><th>Akcje</th></tr></thead><tbody>${clients.map(c => `
      <tr>
        <td><strong>${esc(fullName(c))}</strong><br><span class="muted">${esc(c.notes || '')}</span></td>
        <td>${esc(c.phone || '—')}</td>
        <td>${esc(c.email || '—')}</td>
        <td><span class="pill">${title(c)}</span></td>
        <td><button class="danger small" onclick='deleteLiveClient(${JSON.stringify(c.id)})'>Usuń</button></td>
      </tr>
    `).join('')}</tbody></table>`;
  }

  async function loadClients() {
    if (!user) return;
    const { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false });
    if (error) {
      alert('Błąd Supabase: ' + error.message + '. Upewnij się, że wkleiłeś SQL z database/supabase-schema.sql w Supabase SQL Editor.');
      return;
    }
    clients = data || [];
    renderApp();
  }

  window.liveSignUp = async function () {
    const email = q('liveEmail').value.trim();
    const password = q('livePassword').value;
    const { error } = await sb.auth.signUp({ email, password });
    if (error) { q('liveAuthMsg').textContent = error.message; return; }
    q('liveAuthMsg').textContent = 'Konto utworzone. Jeśli Supabase wymaga potwierdzenia, sprawdź e-mail. Możesz też spróbować się zalogować.';
  };

  window.liveSignIn = async function () {
    const email = q('liveEmail').value.trim();
    const password = q('livePassword').value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { q('liveAuthMsg').textContent = error.message; return; }
    user = data.user;
    renderAuth();
    await loadClients();
  };

  window.liveSignOut = async function () {
    await sb.auth.signOut();
    user = null;
    clients = [];
    renderAuth();
    renderApp();
  };

  window.saveLiveClient = async function (event) {
    event.preventDefault();
    if (!user) return alert('Najpierw się zaloguj.');
    const payload = {
      user_id: user.id,
      first_name: q('liveFirstName').value.trim(),
      last_name: q('liveLastName').value.trim(),
      gender: q('liveGender').value,
      phone: q('livePhone').value.trim(),
      email: q('liveClientEmail').value.trim(),
      marketing_consent: true,
      notes: q('liveNotes').value.trim()
    };
    const { error } = await sb.from('clients').insert(payload);
    if (error) return alert('Błąd zapisu: ' + error.message);
    await loadClients();
  };

  window.deleteLiveClient = async function (id) {
    if (!confirm('Usunąć kontakt z bazy online?')) return;
    const { error } = await sb.from('clients').delete().eq('id', id);
    if (error) return alert('Błąd usuwania: ' + error.message);
    await loadClients();
  };

  window.openLiveClientForm = function () {
    const input = q('liveFirstName');
    if (input) input.focus();
  };

  async function boot() {
    renderShell();
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    renderAuth();
    if (user) await loadClients();
    else renderApp();
  }

  boot();
})();
