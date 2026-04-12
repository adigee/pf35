/* ─────────────────────────────────────────
   SITE NAV COMPONENT
   Injects the shared nav into any page that has
   <div data-component="nav"></div>.

   On the homepage, section links use #anchor (enables
   smooth scroll). On all other pages they use index.html#anchor.
───────────────────────────────────────── */
(function () {
  function render() {
    var el = document.querySelector('[data-component="nav"]');
    if (!el) return;

    var p    = window.location.pathname;
    var home = p === '/' || p.endsWith('/') || p.endsWith('index.html');
    var base = home ? '' : 'index.html';

    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Primary');
    nav.innerHTML =
      '<a href="' + (home ? '#intro' : 'index.html') + '" class="nav-name">Aditya Gujaran</a>' +
      '<ul class="nav-links" role="list">' +
        '<li><a href="' + base + '#ondemand">Work</a></li>'   +
        '<li><a href="' + base + '#experience">Experience</a></li>' +
        '<li><a href="' + base + '#about">About</a></li>'     +
        '<li><a href="' + base + '#contact">Contact</a></li>' +
      '</ul>';

    el.replaceWith(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
