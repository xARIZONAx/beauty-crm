// Temporary demo mode: hide password field and use one demo password in the background.
(function () {
  const DEMO_PASSWORD = 'beautycrm-demo-2026';

  function q(id) {
    return document.getElementById(id);
  }

  function client() {
    if (!window.BEAUTY_SUPABASE || !window.supabase) return null;
    return window.supabase.createClient(window.BEAUTY_SUPABASE.url, window.BEAUTY_SUPABASE.anonKey);
  }

  function message(text) {
    const box = q('liveAuthMsg');
    if (box) box.textContent = text;
  }

  function emailValue() {
    const email = q('liveEmail');
    return email ? email.value.trim().toLowerCase() : '';
  }

  function simplifyLoginForm() {
    const pass = q('livePassword');
    if (!pass) return;
    pass.value = DEMO_PASSWORD;
    const wrapper = pass.closest('div');
    if (wrapper) wrapper.style.display = 'none';
    const subtitle = document.querySelector('#liveAuth .panel-subtitle');
    if (subtitle) subtitle.textContent = 'Wpisz tylko e-mail. Hasło jest tymczasowo ukryte w trybie demo.';
  }

  window.liveSignUp = async function () {
    const sb = client();
    const email = emailValue();
    if (!sb) return message('Nie załadowano Supabase. Odśwież stronę Ctrl + F5.');
    if (!email || !email.includes('@')) return message('Wpisz poprawny e-mail.');

    message('Tworzę konto demo...');
    const result = await sb.auth.signUp({
      email: email,
      password: DEMO_PASSWORD,
      options: { emailRedirectTo: window.location.href }
    });

    if (result.error) {
      message(result.error.message + ' — jeśli to limit maili, odczekaj około godzinę albo wyłącz Email confirmations w Supabase.');
      return;
    }

    if (result.data && result.data.session) {
      window.location.reload();
      return;
    }

    message('Konto utworzone, ale Supabase wymaga potwierdzenia e-maila. Wyłącz Email confirmations albo potwierdź e-mail.');
  };

  window.liveSignIn = async function () {
    const sb = client();
    const email = emailValue();
    if (!sb) return message('Nie załadowano Supabase. Odśwież stronę Ctrl + F5.');
    if (!email || !email.includes('@')) return message('Wpisz poprawny e-mail.');

    message('Loguję w trybie demo...');
    const result = await sb.auth.signInWithPassword({
      email: email,
      password: DEMO_PASSWORD
    });

    if (result.error) {
      message('Nie udało się zalogować: ' + result.error.message + '. Konto musi być utworzone tym samym trybem demo albo hasło w Supabase musi być ustawione na demo.');
      return;
    }

    window.location.reload();
  };

  setInterval(simplifyLoginForm, 400);
})();
