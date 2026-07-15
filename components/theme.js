/* ─────────────────────────────────────────
   THEME TOGGLE COMPONENT
   Injects the floating light/dark toggle button (and its
   styles) into every page that loads this script, then
   wires up click / icon / persistence behaviour.

   The saved theme is applied *before first paint* by
   components/head.js (loaded parser-blocking in <head>),
   so this component only renders the control and reacts
   to clicks.

   Load it like the other chrome components:
     <script src="components/theme.js"></script>
───────────────────────────────────────── */
(function () {
  /* Button styles, injected once. Easing is hard-coded (rather
     than var(--ease)) so it works on pages that don't define it. */
  var style = document.createElement('style');
  style.textContent =
    '.theme-btn{position:fixed;right:24px;bottom:24px;z-index:20;' +
    'width:44px;height:44px;border-radius:50%;' +
    'border:1px solid var(--color-border);background:var(--color-surface);' +
    'color:var(--color-text);display:grid;place-items:center;cursor:pointer;' +
    'transition:transform 240ms cubic-bezier(0.22,1,0.36,1);}' +
    '.theme-btn:hover{transform:scale(1.08);}' +
    '.theme-btn .material-symbols-rounded{font-size:22px;}';
  (document.head || document.documentElement).appendChild(style);

  function mount() {
    if (document.getElementById('themeBtn')) return;

    var root = document.documentElement;
    var btn  = document.createElement('button');
    btn.className = 'theme-btn';
    btn.id = 'themeBtn';
    btn.setAttribute('aria-label', 'Toggle colour mode');
    btn.innerHTML =
      '<span class="material-symbols-rounded" id="themeIcon">dark_mode</span>';
    document.body.appendChild(btn);

    var icon = btn.querySelector('#themeIcon');

    function sync() {
      icon.textContent =
        root.getAttribute('data-theme') === 'dark' ? 'light_mode' : 'dark_mode';
    }

    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
