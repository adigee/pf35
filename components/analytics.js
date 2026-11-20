/* ─────────────────────────────────────────
   ANALYTICS — what people actually see
   Umami's automatic tracking only records page loads, and the
   homepage is one long scroll, so every visit reads as "/". This
   file adds Umami custom events for what happens *inside* a page:

     Saw: <label>        an element tagged [data-track-view="<label>"]
                         sat in the top 60% of the screen for 1s+
     Read: <section>     same rule, for each section.cs-section of an
                         (unlocked) case study  · {project}
     Password prompt     case-study password modal opened · {project}
     Wrong password      failed attempt · {project}
     Password accepted   typed the right password · {project}
                         (link visitors skip the gate entirely)
     Played video        rail video started (once per page) · {project}
     Finished video      rail video ran to the end · {project}
     Resume PDF / Resume MD / Book a call / LinkedIn / Email
     Outbound link       any other external link · {host}
     Magic link          arrived through /unlocked/ this visit · {to}
     Spear-hunting visit arrived through a company page (/<company>)
                         this visit · {to}

   Two permission buckets show up in the data:
     unlocked = this browser came through a link I sent (magic link
                or a spear-hunting page — both seed pf_via, set by
                head.js / unlocked/index.html)
     cold     = strangers, found the site themselves
   Every pageview and event also carries an Umami tag of the same
   name — set in components/head.js — so the whole dashboard can be
   split by bucket (Filter → Tag).

   Loaded by components/head.js on every page. Events queue until
   the Umami script is ready; if it never loads (ad blocker), the
   queue is simply dropped.
───────────────────────────────────────── */
(function () {
  if (window.__pfAnalytics) return;
  window.__pfAnalytics = true;

  var DWELL_MS = 1000;
  var queue = [];
  var tries = 0;
  var polling = false;
  var gaveUp = false;

  /* Wait for page load too, so Umami's own pageview goes out first. */
  function ready() {
    return window.umami && typeof window.umami.track === 'function' &&
           document.readyState === 'complete';
  }
  function exec(job) { try { job(window.umami); } catch (e) {} }
  function poll() {
    if (ready()) { polling = false; while (queue.length) exec(queue.shift()); return; }
    if (++tries > 60) { polling = false; gaveUp = true; queue = []; return; }  // ~30s: blocked
    setTimeout(poll, 500);
  }
  function run(job) {
    if (gaveUp) return;
    if (ready() && !queue.length) { exec(job); return; }
    queue.push(job);
    if (!polling) { polling = true; setTimeout(poll, 0); }
  }
  function track(name, data) {
    name = String(name).slice(0, 50);             // Umami's event-name limit
    run(function (u) { data ? u.track(name, data) : u.track(name); });
  }
  window.pfTrack = track;                         // handy for one-off events

  function project() {
    return document.body && document.body.getAttribute('data-project') || undefined;
  }
  function withProject(extra) {
    var d = extra || {};
    var p = project();
    if (p) d.project = p;
    return Object.keys(d).length ? d : undefined;
  }

  /* ── LINK ARRIVAL (magic link or spear-hunting page) ──
     Both arrival points remember { to } in localStorage (that's what
     makes head.js tag the visit "unlocked") and flag this arrival in
     sessionStorage. Re-identify on every page so the session stays
     labelled; log the arrival event once per session. */
  try {
    var raw = localStorage.getItem('pf_via');
    if (raw) {
      var via = JSON.parse(raw) || {};
      var props = { access: 'unlocked' };
      if (via.to) props.to = via.to;
      run(function (u) {
        if (typeof u.identify !== 'function') return;
        if (via.to) u.identify('link:' + via.to, props);
        else u.identify(props);
      });
      if (sessionStorage.getItem('pf_arrived') && !sessionStorage.getItem('pf_arrived_logged')) {
        /* Keep pf_arrived (head.js re-seeds it on every spear-hunting page,
           and its `!getItem('pf_arrived')` guard relies on it staying put);
           track "already logged" separately so the arrival fires once per
           session. */
        sessionStorage.setItem('pf_arrived_logged', '1');
        var arriveEvent = via.via === 'spear-hunting' ? 'Spear-hunting visit' : 'Magic link';
        track(arriveEvent, via.to ? { to: via.to } : undefined);
      }
    }
  } catch (e) {}

  /* ── SEEN / READ ──
     "Seen" = in the top 60% of the viewport for DWELL_MS, so a fast
     fly-past to the footer doesn't count. A short last section can
     never climb that high, so at the very bottom of the page anything
     on screen qualifies instead. */
  var seen = new WeakSet();
  var timers = new WeakMap();
  var pending = new Set();
  function startDwell(el) {
    if (timers.has(el) || !pending.has(el)) return;
    timers.set(el, setTimeout(function () {
      timers.delete(el);
      pending.delete(el);
      io.unobserve(el);
      fireSeen(el);
    }, DWELL_MS));
  }
  function stopDwell(el) {
    if (!timers.has(el)) return;
    clearTimeout(timers.get(el));
    timers.delete(el);
  }
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) startDwell(entry.target);
      else if (!atBottom()) stopDwell(entry.target);
    });
  }, { rootMargin: '0px 0px -40% 0px', threshold: 0 }) : null;

  function atBottom() {
    var doc = document.documentElement;
    return window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
  }
  var bottomQueued = false;
  window.addEventListener('scroll', function () {
    if (bottomQueued) return;
    bottomQueued = true;
    requestAnimationFrame(function () {
      bottomQueued = false;
      if (!atBottom()) return;
      pending.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) startDwell(el);
      });
    });
  }, { passive: true });

  function fireSeen(el) {
    var label = el.getAttribute('data-track-view');
    if (label) { track('Saw: ' + label, withProject()); return; }
    var header = el.querySelector('.b-section-header');
    var title = (header ? header.textContent : el.id || 'section').replace(/\s+/g, ' ').trim();
    track('Read: ' + title, withProject());
  }

  function scan() {
    if (!io) return;
    var els = document.querySelectorAll('[data-track-view], section.cs-section');
    [].forEach.call(els, function (el) {
      if (seen.has(el)) return;
      seen.add(el);
      pending.add(el);
      io.observe(el);
    });
  }

  /* ── CLICKS ON LINKS ── */
  function classify(a) {
    var href = a.getAttribute('href') || '';
    if (/^mailto:/i.test(href)) return ['Email'];
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return null; }
    var path = url.pathname.toLowerCase();
    if (/\/resume\.pdf$/.test(path) || /docs\.google\.com$/.test(url.hostname) ||
        /drive\.google\.com$/.test(url.hostname)) return ['Resume PDF'];
    if (/\/resume\.md$/.test(path)) return ['Resume MD'];
    if (/(^|\.)cal\.com$/.test(url.hostname)) return ['Book a call'];
    if (/(^|\.)linkedin\.com$/.test(url.hostname)) return ['LinkedIn'];
    if (url.hostname && url.hostname !== location.hostname) {
      return ['Outbound link', { host: url.hostname.replace(/^www\./, '') }];
    }
    return null;   // internal page → Umami already records the pageview
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('data-umami-event')) return;
    var hit = classify(a);
    if (hit) track(hit[0], withProject(hit[1]));
  }, true);

  /* ── CASE STUDY GATE + VIDEO (events emitted by case-study.js) ── */
  document.addEventListener('cs:gate-open', function () { track('Password prompt', withProject()); });
  document.addEventListener('cs:unlock', function (e) {
    if (!e.detail || e.detail.method !== 'session') track('Password accepted', withProject());
    setTimeout(scan, 0);   // sections only exist once decrypted
  });
  document.addEventListener('cs:unlock-failed', function () { track('Wrong password', withProject()); });

  var played = false;
  document.addEventListener('play', function (e) {
    if (played || !e.target.classList || !e.target.classList.contains('csv-video')) return;
    played = true;
    track('Played video', withProject());
  }, true);
  var ended = false;
  document.addEventListener('ended', function (e) {
    if (ended || !e.target.classList || !e.target.classList.contains('csv-video')) return;
    ended = true;
    track('Finished video', withProject());
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();
