// Demo login + demo database for GitHub Pages.
// This is not production security. It only separates demo data per email in this browser.
(function () {
  const baseKey = 'beauty_recall_crm_v1';
  const userKey = 'beauty_demo_user_email';
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;

  function cleanEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function currentEmail() {
    return cleanEmail(originalGet.call(localStorage, userKey));
  }

  function scopedKey(key) {
    if (key !== baseKey) return key;
    const email = currentEmail();
    return email ? `${baseKey}__${email}` : `${baseKey}__guest`;
  }

  Storage.prototype.getItem = function (key) {
    return originalGet.call(this, scopedKey(key));
  };

  Storage.prototype.setItem = function (key, value) {
    return originalSet.call(this, scopedKey(key), value);
  };

  Storage.prototype.removeItem = function (key) {
    return originalRemove.call(this, scopedKey(key));
  };

  window.signIn = function () {
    const emailInput = document.getElementById('authEmail');
    const msg = document.getElementById('authMessage');
    const email = cleanEmail(emailInput && emailInput.value);
    if (!email || !email.includes('@')) {
      if (msg) msg.textContent = 'Wpisz poprawny e-mail.';
      return;
    }
    originalSet.call(localStorage, userKey, email);
    location.reload();
  };

  window.signUp = function () {
    window.signIn();
  };

  window.signOut = function () {
    originalRemove.call(localStorage, userKey);
    location.reload();
  };

  window.updateDemoAuthUI = function () {
    const email = currentEmail();
    const missing = document.getElementById('authMissing');
    const out = document.getElementById('authLoggedOut');
    const inn = document.getElementById('authLoggedIn');
    const userEmail = document.getElementById('authUserEmail');
    const sync = document.getElementById('syncStatus');

    if (missing) missing.style.display = 'none';
    if (out) out.style.display = email ? 'none' : 'block';
    if (inn) inn.style.display = email ? 'block' : 'none';
    if (userEmail) userEmail.textContent = email;
    if (sync) sync.textContent = email ? 'Demo baza aktywna. Dane zapisują się osobno dla tego e-maila w tej przeglądarce.' : '';

    document.querySelectorAll('.app-section').forEach(function (el) {
      el.style.display = email ? '' : 'none';
    });

    document.querySelectorAll('.hero-actions').forEach(function (el) {
      el.style.display = email ? 'flex' : 'none';
    });
  };

  setTimeout(window.updateDemoAuthUI, 0);
  setInterval(window.updateDemoAuthUI, 700);
})();
