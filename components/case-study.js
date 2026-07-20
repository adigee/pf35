/* ─────────────────────────────────────────
   CASE-STUDY RUNTIME  (shared design language)
   One script drives the structure every case study shares,
   so a change here lands on all of them — and any project
   added later inherits it for free.

   A case-study page only needs to provide its content:

     <body class="cs-page" data-project="<slug>">
       <div class="cs-progress" id="cs-progress"></div>
       <main class="cs-main" id="cs-main">
         <div class="cs-shell">
           <div class="cs-content">
             <p class="b-label" data-cs-eyebrow></p>   ← filled from registry
             <h1 class="b-title--article">Title</h1>
             …hero / meta…
             <section class="cs-section">              ← id + TOC entry auto-built
               <p class="b-section-header">Section name</p> …
             </section>
             …more sections…
             <div data-component="cs-footer"></div>    ← footer injected here
           </div>
         </div>
       </main>
       <script src="components/projects.js"></script>
       <script src="components/case-study.js"></script>

   This script then:
     • fills the eyebrow from the project registry (matches the homepage)
     • builds the sticky left rail: "Back to work" + auto table of contents
     • injects the footer: "All projects" ← → "Next project"
     • wires the reading-progress bar, TOC scroll-spy, and exit fade
───────────────────────────────────────── */
(function () {
  var ARROW_LEFT =
    '<svg viewBox="0 0 16 16"><line x1="13" y1="8" x2="3" y2="8"/><polyline points="7 4 3 8 7 12"/></svg>';
  var ARROW_RIGHT =
    '<svg viewBox="0 0 16 16"><line x1="3" y1="8" x2="13" y2="8"/><polyline points="9 4 13 8 9 12"/></svg>';

  function slugify(s) {
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function render() {
    var body = document.body;
    var slug = body.getAttribute('data-project');
    var project = (window.Projects && slug) ? window.Projects.get(slug) : null;

    /* ── EYEBROW — from the shared registry (single source) ── */
    var eyebrowEl = document.querySelector('[data-cs-eyebrow]');
    if (eyebrowEl && window.Projects) {
      eyebrowEl.textContent = window.Projects.eyebrow(slug);
    }

    /* ── LEFT RAIL: back link + auto table of contents ── */
    var shell = document.querySelector('.cs-shell');
    var content = document.querySelector('.cs-content');
    if (shell && content && !shell.querySelector('.cs-rail')) {
      var sections = [].slice.call(content.querySelectorAll('section.cs-section'));
      var tocLinks = sections.map(function (section) {
        var header = section.querySelector('.b-section-header');
        if (!header) return '';
        var label = header.textContent.trim();
        if (!section.id) section.id = slugify(label);
        return '<a class="cs-toc-link b-label-link" href="#' + section.id + '">' + label + '</a>';
      }).join('');

      var rail = document.createElement('aside');
      rail.className = 'cs-rail';
      rail.innerHTML =
        '<a href="index.html" class="cs-rail-back b-label-link" id="cs-back">' +
          ARROW_LEFT + 'Back to work' +
        '</a>' +
        '<nav class="cs-toc" aria-label="Contents">' + tocLinks + '</nav>';
      shell.insertBefore(rail, content);
    }

    /* ── FOOTER: All projects ← → Next project ── */
    var slot = document.querySelector('[data-component="cs-footer"]');
    if (slot) {
      var next = (window.Projects && slug) ? window.Projects.next(slug) : null;
      var nextHtml = '';
      if (next) {
        var ext = next.external ? ' target="_blank" rel="noopener"' : '';
        nextHtml =
          '<a href="' + next.href + '" class="panel-cta panel-cta--next" id="cs-footer-next"' + ext + '>' +
            'Next project' +
            '<span class="panel-cta-circle" aria-hidden="true">' + ARROW_RIGHT + '</span>' +
          '</a>';
      }

      var footer = document.createElement('footer');
      footer.className = 'cs-footer';
      footer.innerHTML =
        '<div class="cs-footer-nav">' +
          '<a href="index.html" class="panel-cta panel-cta--back" id="cs-footer-back">' +
            '<span class="panel-cta-circle" aria-hidden="true">' + ARROW_LEFT + '</span>' +
            'All projects' +
          '</a>' +
          nextHtml +
        '</div>';
      slot.replaceWith(footer);
    }

    /* ── READING PROGRESS BAR ── */
    (function () {
      var bar = document.getElementById('cs-progress');
      var main = document.getElementById('cs-main');
      if (!bar || !main) return;
      function update() {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (docH > 0 ? (window.scrollY / docH) * 100 : 0) + '%';
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
    })();

    /* ── EXIT TRANSITION on internal navigation ── */
    (function () {
      function bindExit(el) {
        if (!el || el.target === '_blank') return;
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var href = this.href;
          document.body.classList.add('is-exiting');
          setTimeout(function () { window.location.href = href; }, 360);
        });
      }
      bindExit(document.getElementById('cs-back'));
      bindExit(document.getElementById('cs-footer-back'));
      bindExit(document.getElementById('cs-footer-next'));
    })();

    /* ── TABLE-OF-CONTENTS SCROLL-SPY ── */
    (function () {
      var links = [].slice.call(document.querySelectorAll('.cs-toc-link'));
      if (!links.length) return;
      var items = links.map(function (link) {
        var id = (link.getAttribute('href') || '').replace(/^#/, '');
        var section = id && document.getElementById(id);
        return section ? { link: link, section: section } : null;
      }).filter(Boolean);
      if (!items.length) return;

      var activeMark, ticking = false;
      function update() {
        ticking = false;
        var mark = window.innerHeight * 0.3;
        var activeIndex = 0;
        for (var i = 0; i < items.length; i++) {
          if (items[i].section.getBoundingClientRect().top <= mark) activeIndex = i;
        }
        if (activeIndex === activeMark) return;
        activeMark = activeIndex;
        items.forEach(function (item, i) {
          item.link.classList.toggle('is-active', i === activeIndex);
        });
      }
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      }, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
