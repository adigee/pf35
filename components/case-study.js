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
     • wires the reading-progress bar and TOC scroll-spy

   PASSWORD-GATED PAGES
   If the page has an encrypted payload (a <script id="cs-locked-data">,
   produced by tools/lock.mjs), the sections below the hero are withheld:
   view-source shows only ciphertext. We show the hero + a password field
   and keep the footer; the left rail stays hidden until it is unlocked.
   A correct password decrypts the sections in the browser (Web Crypto),
   injects them, and stores the password in a session cookie so the reader
   stays unlocked across gated projects until the browser is closed.
───────────────────────────────────────── */
(function () {
  var ARROW_LEFT =
    '<svg viewBox="0 0 16 16"><line x1="13" y1="8" x2="3" y2="8"/><polyline points="7 4 3 8 7 12"/></svg>';
  var ARROW_RIGHT =
    '<svg viewBox="0 0 16 16"><line x1="3" y1="8" x2="13" y2="8"/><polyline points="9 4 13 8 9 12"/></svg>';

  var UNLOCK_COOKIE = 'cs_unlock';

  function slugify(s) {
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* ── SESSION COOKIE (no expiry → cleared when the browser closes) ── */
  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }
  function writeSessionCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; SameSite=Lax';
  }

  /* ── WEB CRYPTO — mirror of tools/lock.mjs (AES-256-GCM, PBKDF2-SHA256) ── */
  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function deriveKey(password, salt, iters) {
    return crypto.subtle
      .importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iters, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      });
  }
  /* Resolves to the decrypted HTML string, or rejects on a wrong password
     (GCM authentication fails → decrypt throws). */
  function decryptPayload(password, data) {
    var salt = b64ToBytes(data.salt);
    var iv = b64ToBytes(data.iv);
    var ct = b64ToBytes(data.ct);
    return deriveKey(password, salt, data.iters).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    }).then(function (buf) {
      return new TextDecoder().decode(buf);
    });
  }

  /* ── LEFT RAIL: back link + auto table of contents ── */
  function buildRail(shell, content) {
    if (!shell || !content || shell.querySelector('.cs-rail')) return;
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

    initTocSpy();
  }

  /* ── READING PROGRESS BAR ── */
  function updateProgress() {
    var bar = document.getElementById('cs-progress');
    if (!bar) return;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docH > 0 ? (window.scrollY / docH) * 100 : 0) + '%';
  }

  /* ── TABLE-OF-CONTENTS SCROLL-SPY ── */
  function initTocSpy() {
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
  }

  function render() {
    var body = document.body;
    var slug = body.getAttribute('data-project');
    var shell = document.querySelector('.cs-shell');
    var content = document.querySelector('.cs-content');

    /* ── EYEBROW — from the shared registry (single source) ── */
    var eyebrowEl = document.querySelector('[data-cs-eyebrow]');
    if (eyebrowEl && window.Projects) {
      eyebrowEl.textContent = window.Projects.eyebrow(slug);
    }

    /* ── FOOTER: All projects ← → Next project ──
       Always shown, even while locked — "Next project" simply lands on the
       next case study, which runs its own gate if it is protected too. */
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
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    /* ── GATE: encrypted page, or the normal open path ── */
    var payloadEl = document.getElementById('cs-locked-data');
    if (payloadEl) {
      initGate(payloadEl, shell, content);
    } else {
      buildRail(shell, content);   // open page — rail + TOC as usual
      staggerToc();
    }
  }

  /* ── TOC INDEX STAGGER — "papapapapa" ──
     After a home→case-study view transition, the index items in the left rail
     pop in one at a time. Detected via sessionStorage (set by a click handler
     on the home page), which survives bfcache and back/forward navigation.
     Falls back to document.referrer for non-click navigation (keyboard, etc.). */
  function staggerToc() {
    var fromHome = sessionStorage.getItem('fromHome');
    sessionStorage.removeItem('fromHome');
    if (!fromHome) {
      fromHome = document.referrer && (
        document.referrer.indexOf('index.html') !== -1 ||
        document.referrer.replace(/\/$/, '') === location.origin
      );
    }
    var motionOk = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fromHome || !motionOk) return;
    document.body.classList.add('from-transition');
    /* Set per-item animation delays so every TOC link is covered. */
    var links = document.querySelectorAll('.cs-toc-link');
    links.forEach(function (link, i) {
      link.style.animationDelay = (400 + i * 40) + 'ms';
    });
  }

  /* ── PASSWORD GATE ── */
  function initGate(payloadEl, shell, content) {
    var mount = document.getElementById('cs-locked-mount');
    var data;
    try { data = JSON.parse(payloadEl.textContent); } catch (e) { return; }
    if (!mount) return;

    /* While locked there is no rail, so collapse the shell's two-column grid
       to one — otherwise the lone content column falls into the 200px rail
       track and everything is crushed narrow. Removed again on reveal, where
       buildRail restores the second column. */
    if (shell) shell.classList.add('cs-locked');

    /* Reveal: decrypt → inject sections in place → build the rail + TOC. */
    function reveal(html) {
      if (shell) shell.classList.remove('cs-locked');
      var frag = document.createRange().createContextualFragment(html);
      mount.parentNode.insertBefore(frag, mount);
      mount.remove();
      payloadEl.remove();
      buildRail(shell, content);
      updateProgress();
    }

    /* If crypto is unavailable (very old / insecure context), fail open to
       the gate UI rather than a blank page. */
    if (!(window.crypto && crypto.subtle)) { showGate(mount, data, reveal, false); return; }

    /* Already unlocked this session? Try the cookie password silently. */
    var saved = readCookie(UNLOCK_COOKIE);
    if (saved) {
      decryptPayload(saved, data).then(reveal).catch(function () {
        showGate(mount, data, reveal, true);
      });
    } else {
      showGate(mount, data, reveal, true);
    }
  }

  var LOCK_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/>' +
    '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

  function showGate(mount, data, reveal, cryptoOk) {
    mount.innerHTML =
      '<div class="cs-gate" id="cs-gate">' +
        '<div class="cs-gate-card">' +
          '<div class="cs-gate-lock" aria-hidden="true">' + LOCK_ICON + '</div>' +
          '<p class="b-section-header cs-gate-title">Protected case study</p>' +
          '<p class="cs-gate-note">This project is under wraps. Enter the password to read the full story.</p>' +
          '<form class="cs-gate-form" id="cs-gate-form" novalidate>' +
            '<input type="password" class="cs-gate-input" id="cs-gate-input" ' +
              'placeholder="Password" autocomplete="off" autocapitalize="off" ' +
              'spellcheck="false" aria-label="Password" />' +
            '<button type="submit" class="cs-gate-btn">Unlock</button>' +
          '</form>' +
          '<p class="cs-gate-error" id="cs-gate-error" role="alert" hidden>' +
            'That password didn’t work. Try again.' +
          '</p>' +
        '</div>' +
      '</div>';

    var form = document.getElementById('cs-gate-form');
    var input = document.getElementById('cs-gate-input');
    var error = document.getElementById('cs-gate-error');
    var card = mount.querySelector('.cs-gate-card');
    if (!cryptoOk) { error.textContent = 'Secure unlock is unavailable in this browser.'; error.hidden = false; }

    input.focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = input.value;
      if (!pw) return;
      error.hidden = true;
      form.classList.add('is-checking');
      decryptPayload(pw, data).then(function (html) {
        writeSessionCookie(UNLOCK_COOKIE, pw);   // stay unlocked this session
        reveal(html);
      }).catch(function () {
        form.classList.remove('is-checking');
        error.hidden = false;
        card.classList.remove('is-shaking');
        void card.offsetWidth;                   // restart the shake
        card.classList.add('is-shaking');
        input.select();
      });
    });
  }

  /* Build synchronously. This script sits at the end of <body>, so the DOM it
     needs (.cs-shell, .cs-content, footer slot) is already parsed. Running now
     — rather than deferring to DOMContentLoaded — puts the injected .cs-rail in
     the page's first paint, which is what lets the cross-document View
     Transition capture it and fly it in (see the rail hand-off in style.css). */
  render();
})();
