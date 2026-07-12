/* ─────────────────────────────────────────
   CASE-STUDY FOOTER COMPONENT
   Injects the shared case-study footer into any page with
   <div data-component="cs-footer"></div>, and wires up the
   two behaviours every case study shares:
     • Reading progress bar (#cs-progress fills as you scroll)
     • Exit transition on "back" links (fade before navigating)

   Load with:  <script src="components/footer.js"></script>
   placed after </main> (defer not required).
───────────────────────────────────────── */
(function () {
  function render() {
    var slot = document.querySelector('[data-component="cs-footer"]');
    if (slot) {
      var footer = document.createElement('footer');
      footer.className = 'cs-footer';
      footer.innerHTML =
        '<a href="index.html" class="panel-cta panel-cta--back" id="cs-footer-back">' +
          '<span class="panel-cta-circle" aria-hidden="true">' +
            '<svg viewBox="0 0 16 16"><line x1="13" y1="8" x2="3" y2="8"/><polyline points="7 4 3 8 7 12"/></svg>' +
          '</span>' +
          'All work' +
        '</a>' +
        '<p class="cs-footer-copy">© 2026 Aditya Gujaran</p>';
      slot.replaceWith(footer);
    }

    /* ── READING PROGRESS BAR ── */
    (function () {
      var bar = document.getElementById('cs-progress');
      var main = document.getElementById('cs-main');
      if (!bar || !main) return;

      function updateProgress() {
        var scrollTop = window.scrollY;
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
        bar.style.width = pct + '%';
      }

      window.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    })();

    /* ── EXIT TRANSITION (back links) ── */
    (function () {
      function bindExit(el) {
        if (!el) return;
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var href = this.href;
          document.body.classList.add('is-exiting');
          setTimeout(function () { window.location.href = href; }, 360);
        });
      }
      bindExit(document.getElementById('cs-back'));
      bindExit(document.getElementById('cs-footer-back'));
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
