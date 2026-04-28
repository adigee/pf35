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

    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Primary');
    nav.innerHTML =
      '<a href="index.html" class="nav-name">Aditya Gujaran</a>' +
      '<a href="https://drive.google.com/file/d/1FJDZI8xlQgeWfl7zgbS3LjaTYYZJbWh3/view" target="_blank" rel="noopener" class="nav-name nav-resume">Resume&thinsp;<span class="material-symbols-rounded nav-resume-icon">download</span></a>';

    el.replaceWith(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
