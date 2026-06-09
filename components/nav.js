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
      '<div class="nav-resume-group">' +
        '<span class="nav-name nav-resume-label">Resume</span>' +
        '<a href="https://drive.google.com/file/d/1FJDZI8xlQgeWfl7zgbS3LjaTYYZJbWh3/view" target="_blank" rel="noopener" class="nav-resume-action"><span class="material-symbols-rounded nav-resume-icon">download</span>resume.pdf</a>' +
        '<a href="resume.md" target="_blank" rel="noopener" class="nav-resume-action"><span class="material-symbols-rounded nav-resume-icon">visibility</span>@resume.md</a>' +
      '</div>';

    el.replaceWith(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
