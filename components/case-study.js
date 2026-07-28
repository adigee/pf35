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
    view-source shows only ciphertext. The eyebrow / H1 / hero stay crisp,
    a "Locked" pill sits inline with the eyebrow, and the meta + a frosted
    skeleton + the rail's skeleton index stay blurred until unlocked. The
    pill opens a full-page password modal. A correct password decrypts the
    sections in the browser (Web Crypto), injects them, and stores the
    password in a session cookie so the reader stays unlocked across gated
    projects until the browser is closed. The cookie can also be seeded
    directly by the magic-link page (unlocked.html).
───────────────────────────────────────── */
(function () {
  var ARROW_LEFT =
    '<svg viewBox="0 0 16 16"><line x1="13" y1="8" x2="3" y2="8"/><polyline points="7 4 3 8 7 12"/></svg>';
  var ARROW_RIGHT =
    '<svg viewBox="0 0 16 16"><line x1="3" y1="8" x2="13" y2="8"/><polyline points="9 4 13 8 9 12"/></svg>';

  var UNLOCK_COOKIE = 'cs_unlock';

  /* ── RAIL VIDEO OVERVIEW ──
     A single placeholder clip on every case study for now; the poster is the
     same face as the homepage avatar. Per-project clips can override this
     later (e.g. window.Projects.video(slug)). Paths are URL-encoded because
     "project content" contains a space. */
  var OVERVIEW_POSTER = 'project%20content/profile-photo.png';
  var OVERVIEW_VIDEO  = 'project%20content/Sydney%20Makes%20an%20Omelet.mp4';
  var RING_R = 56.75;   /* ring radius in the 116-unit viewBox (100px circle) */

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
      videoAvatarHtml() +
      '<nav class="cs-toc" aria-label="Contents">' + tocLinks + '</nav>';
    shell.insertBefore(rail, content);

    wireVideoAvatar(rail);
    initTocSpy();
  }

  /* ── RAIL VIDEO AVATAR: markup + playback ──
     Circular, playable identity avatar. Click plays it in place (stays a
     circle, no fullscreen); the sticky rail keeps it on screen while reading. */
  function videoAvatarHtml() {
    return '' +
      '<div class="csv" data-state="idle">' +
        '<button class="csv-btn" type="button" aria-label="Play the project overview video">' +
          '<video class="csv-video" playsinline preload="metadata" ' +
            'poster="' + OVERVIEW_POSTER + '" src="' + OVERVIEW_VIDEO + '"></video>' +
          '<svg class="csv-ring" viewBox="0 0 116 116" aria-hidden="true">' +
            '<circle cx="58" cy="58" r="' + RING_R + '"></circle></svg>' +
          '<span class="csv-play" aria-hidden="true"></span>' +
        '</button>' +
      '</div>';
  }

  function wireVideoAvatar(rail) {
    var wrap = rail.querySelector('.csv');
    if (!wrap) return;
    var btn = wrap.querySelector('.csv-btn');
    var video = wrap.querySelector('.csv-video');
    var ring = wrap.querySelector('.csv-ring circle');
    if (!btn || !video || !ring) return;

    var C = 2 * Math.PI * RING_R;
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C;

    /* Smooth composited ring animation — one shot for the video's full
       duration, driven by the Web Animations API (compositor thread,
       no jitter). The animation is independent of video timing events. */
    var anim = null;
    var dur = 60;
    function startRing() {
      if (anim) anim.cancel();
      anim = ring.animate(
        [{ strokeDashoffset: C }, { strokeDashoffset: 0 }],
        { duration: dur * 1000, easing: 'linear', fill: 'forwards' }
      );
    }
    function pauseRing()  { if (anim) anim.pause(); }
    function resumeRing() { if (anim) anim.play(); }
    function resetRing() {
      if (anim) { anim.cancel(); anim = null; }
      ring.style.strokeDashoffset = C;
    }

    video.addEventListener('loadedmetadata', function () {
      if (video.duration && isFinite(video.duration)) dur = video.duration;
    });

    btn.addEventListener('click', function () {
      if (video.paused) {
        video.muted = false;
        wrap.dataset.state = 'playing';
        if (anim && anim.playState === 'paused') {
          resumeRing();
        } else {
          startRing();
        }
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        video.pause();
        wrap.dataset.state = 'paused';
        pauseRing();
      }
    });
    video.addEventListener('ended', function () {
      wrap.dataset.state = 'idle';
      resetRing();
      video.currentTime = 0;
    });
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

      /* Replay the full entrance choreography (page-in → TOC stagger →
         video-avatar drop) when arriving via "Next project": set the same
         session flag the homepage sets, so staggerToc() fires on the
         destination case study. Skipped for external write-ups — those open
         in a new tab, and the flag would linger here and fire on an
         unrelated visit later. */
      var nextLink = footer.querySelector('#cs-footer-next');
      if (nextLink && next && !next.external) {
        nextLink.addEventListener('click', function () {
          sessionStorage.setItem('triggerEntrance', '1');
        });
      }
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
     After a home→case-study (or next-project→case-study) view transition,
     the index items in the left rail pop in one at a time. Detected via
     sessionStorage (set by click handlers on the home page and on each case
     study's "Next project" button), which survives bfcache and back/forward
     navigation.
     Falls back to document.referrer for non-click navigation (keyboard, etc.). */
  function staggerToc() {
    var triggerEntrance = sessionStorage.getItem('triggerEntrance');
    sessionStorage.removeItem('triggerEntrance');
    if (!triggerEntrance) {
      triggerEntrance = document.referrer && (
        document.referrer.indexOf('index.html') !== -1 ||
        document.referrer.replace(/\/$/, '') === location.origin
      );
    }
    var motionOk = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!triggerEntrance || !motionOk) return;
    document.body.classList.add('from-transition');
    /* Set per-item animation delays so every TOC link is covered. */
    var links = document.querySelectorAll('.cs-toc-link');
    links.forEach(function (link, i) {
      link.style.animationDelay = (400 + i * 40) + 'ms';
    });

    /* The video avatar lands LAST — its slot opens (pushing the TOC down) and
       the circle drops in, just after the final TOC item's pop completes
       (toc-pop runs 300ms). Slot-open and circle-drop share one delay. */
    var csv = document.querySelector('.csv');
    if (csv) {
      var last = 400 + (links.length - 1) * 40 + 300;
      var delay = (last + 120) + 'ms';
      var vbtn = csv.querySelector('.csv-btn');
      csv.style.animationDelay = delay;
      if (vbtn) vbtn.style.animationDelay = delay;
      /* Once it lands, drop the entrance animation so its filled end-state
          stops pinning transform/overflow (which would break hover + focus).
          Also remove the body class so sticky positioning can activate in
          the responsive layout without conflicting with .from-transition. */
      csv.addEventListener('animationend', function (e) {
        if (e.animationName === 'csv-open') { csv.style.overflow = 'visible'; csv.style.animation = 'none'; document.body.classList.remove('from-transition'); }
        if (e.animationName === 'csv-drop' && vbtn) { vbtn.style.animation = 'none'; }
      });
    }
  }

  /* ── PASSWORD GATE ──
     Locked page = crisp eyebrow/H1/hero, a loud "Locked" pill inline with
     the eyebrow, and everything below the hero (meta + a frosted skeleton
     + the rail's skeleton index) under a blur. The pill opens a full-page
     password modal. Unlocking lifts the blur and fills the skeletons in —
     the layout never shifts because the rail is mounted from first paint. */
  function initGate(payloadEl, shell, content) {
    var mount = document.getElementById('cs-locked-mount');
    var data;
    try { data = JSON.parse(payloadEl.textContent); } catch (e) { return; }
    if (!mount) return;

    document.body.classList.add('cs-is-locked');

    /* Persistent rail with a skeleton index (real titles are inside the
       encrypted payload, so blurred bars hold the shape). */
    buildLockedRail(shell, content);

    /* Eyebrow → flex row + pill badge. */
    var badge = addLockBadge();

    /* Frosted skeleton where the sections will land. */
    mount.innerHTML =
      '<div class="cs-locked-skeleton" aria-hidden="true">' +
        '<div class="cs-skel-head"></div>' +
        '<div class="cs-skel-line" style="width:96%"></div>' +
        '<div class="cs-skel-line" style="width:88%"></div>' +
        '<div class="cs-skel-line" style="width:92%"></div>' +
        '<div class="cs-skel-block"></div>' +
        '<div class="cs-skel-line" style="width:90%"></div>' +
        '<div class="cs-skel-line" style="width:70%"></div>' +
      '</div>';

    var modal = buildModal(data, reveal);
    document.body.appendChild(modal.root);
    if (badge) badge.addEventListener('click', modal.open);

    /* Reveal: decrypt → close modal → swap skeletons for the real thing. */
    function reveal(html) {
      modal.close();
      document.body.classList.remove('cs-is-locked');
      removeLockBadge();
      var rail = shell && shell.querySelector('.cs-rail');
      if (rail) rail.remove();
      var frag = document.createRange().createContextualFragment(html);
      mount.parentNode.insertBefore(frag, mount);
      mount.remove();
      payloadEl.remove();
      buildRail(shell, content);
      staggerUnlockedToc();
      updateProgress();
    }

    /* If crypto is unavailable (very old / insecure context), say so in the
       modal rather than failing silently. */
    if (!(window.crypto && crypto.subtle)) { modal.unavailable(); return; }

    /* Already unlocked this session? Try the cookie password silently. */
    var saved = readCookie(UNLOCK_COOKIE);
    if (saved) decryptPayload(saved, data).then(reveal).catch(function () {});
  }

  /* Locked rail: back link + blurred skeleton bars in place of the TOC. */
  function buildLockedRail(shell, content) {
    if (!shell || !content || shell.querySelector('.cs-rail')) return;
    var bars = '';
    [72, 56, 68, 48, 60].forEach(function (w) {
      bars += '<span class="cs-toc-skel" style="width:' + w + 'px"></span>';
    });
    var rail = document.createElement('aside');
    rail.className = 'cs-rail';
    rail.innerHTML =
      '<a href="index.html" class="cs-rail-back b-label-link" id="cs-back">' +
        ARROW_LEFT + 'Back to work' +
      '</a>' +
      '<nav class="cs-toc cs-toc--skeleton" aria-hidden="true">' + bars + '</nav>';
    shell.insertBefore(rail, content);
  }

  var LOCK_BADGE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/>' +
    '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

  /* Restructure the eyebrow into a flex row and append the pill.
     The eyebrow text is already filled from the registry by render(). */
  function addLockBadge() {
    var eyebrow = document.querySelector('[data-cs-eyebrow]');
    if (!eyebrow) return null;
    eyebrow.classList.add('cs-eyebrow-row');
    var span = document.createElement('span');
    span.textContent = eyebrow.textContent;
    eyebrow.textContent = '';
    eyebrow.appendChild(span);
    var badge = document.createElement('button');
    badge.className = 'cs-lock-badge';
    badge.type = 'button';
    badge.innerHTML = LOCK_BADGE_ICON + '<span>Locked</span>';
    eyebrow.appendChild(badge);
    return badge;
  }

  function removeLockBadge() {
    var eyebrow = document.querySelector('[data-cs-eyebrow]');
    if (!eyebrow) return;
    var span = eyebrow.querySelector('span');
    if (span) eyebrow.textContent = span.textContent;
    eyebrow.classList.remove('cs-eyebrow-row');
  }

  /* The TOC the reveal just built pops in item by item. */
  function staggerUnlockedToc() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.body.classList.add('cs-just-unlocked');
    var links = document.querySelectorAll('.cs-toc-link');
    links.forEach(function (link, i) {
      link.style.animationDelay = (i * 55) + 'ms';
    });
  }

  var LOCK_ICON =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/>' +
    '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';

  /* Full-page password modal. Returns { root, open, close, unavailable }. */
  function buildModal(data, reveal) {
    var root = document.createElement('div');
    root.className = 'cs-lock-modal';
    root.id = 'cs-lock-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'cs-lock-modal-title');
    root.innerHTML =
      '<div class="cs-lock-modal-backdrop" data-modal-close></div>' +
      '<div class="cs-lock-modal-card">' +
        '<button class="cs-lock-modal-close" type="button" aria-label="Close" data-modal-close>×</button>' +
        '<div class="cs-gate-lock" aria-hidden="true">' + LOCK_ICON + '</div>' +
        '<p class="b-section-header cs-gate-title" id="cs-lock-modal-title">Locked case study</p>' +
        '<p class="cs-gate-note">Due to recency of this project, this case study is under wraps. ' +
          'Please use the password to unlock it.</p>' +
        '<form class="cs-gate-form" novalidate>' +
          '<input type="password" class="cs-gate-input" ' +
            'placeholder="design for what?" autocomplete="off" autocapitalize="off" ' +
            'spellcheck="false" aria-label="Password" />' +
          '<button type="submit" class="cs-gate-btn">Unlock</button>' +
        '</form>' +
        '<p class="cs-gate-error" role="alert" hidden>That password didn’t work. Try again.</p>' +
      '</div>';

    var card = root.querySelector('.cs-lock-modal-card');
    var form = root.querySelector('.cs-gate-form');
    var input = root.querySelector('.cs-gate-input');
    var error = root.querySelector('.cs-gate-error');

    function open() {
      root.classList.add('is-open');
      document.documentElement.classList.add('cs-modal-open');
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() {
      root.classList.remove('is-open');
      document.documentElement.classList.remove('cs-modal-open');
    }

    [].forEach.call(root.querySelectorAll('[data-modal-close]'), function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) close();
    });

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

    return {
      root: root,
      open: open,
      close: close,
      unavailable: function () {
        error.textContent = 'Secure unlock is unavailable in this browser.';
        error.hidden = false;
        open();
      }
    };
  }

  /* Build synchronously. This script sits at the end of <body>, so the DOM it
     needs (.cs-shell, .cs-content, footer slot) is already parsed. Running now
     — rather than deferring to DOMContentLoaded — puts the injected .cs-rail in
     the page's first paint, which is what lets the cross-document View
     Transition capture it and fly it in (see the rail hand-off in style.css). */
  render();
})();
