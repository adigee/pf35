/* ─────────────────────────────────────────
   CONTENT DATA
   Single source of truth for timeline and skills.
   Edit here — both the left column and right panel
   are rendered from these arrays automatically.
───────────────────────────────────────── */
const TIMELINE = [
  { period: '2024–25', role: 'Sr. Product Designer',                    company: 'Bounce'          },
  { period: '2020–23', role: 'Sr. Product Designer — Linguistic Tools', company: 'Unbabel (YC W14)' },
  { period: '2016–19', role: 'Product & Service Designer',              company: 'Cocoon Experience' },
  { period: '2013–15', role: 'Experience Design Consultant',            company: 'Novabase'          },
  { period: '2012',    role: 'UX Research Intern',                      company: 'Google Photos'     },
];

const SKILLS = [
  { name: 'Product Thinking',   desc: 'strategy / 0→1'       },
  { name: 'Interaction Design', desc: 'flows / prototyping'   },
  { name: 'UX Research',        desc: 'qual / quant'          },
  { name: 'Service Design',     desc: 'journeys / blueprints' },
  { name: 'Visual Design',      desc: 'systems / craft'       },
  { name: 'Information Design', desc: 'clarity / hierarchy'   },
];

(function renderContent() {
  /* Timeline — left column */
  const bTimeline = document.querySelector('.b-timeline');
  if (bTimeline) bTimeline.innerHTML = TIMELINE.map(({ period, role, company }) => `
    <div class="b-timeline-item">
      <span class="b-timeline-period">${period}</span>
      <div>
        <p class="b-timeline-role">${role}</p>
        <p class="b-timeline-company">${company}</p>
      </div>
    </div>`).join('');

  /* Timeline — right panel */
  const pTimeline = document.querySelector('.p-timeline');
  if (pTimeline) pTimeline.innerHTML = TIMELINE.map(({ period, role, company }) => `
    <div class="p-tl-item">
      <span class="p-tl-period">${period}</span>
      <div>
        <p class="p-tl-role">${role}</p>
        <p class="p-tl-company">${company}</p>
      </div>
    </div>`).join('');

  /* Skills — left column */
  const bSkills = document.querySelector('.b-skills');
  if (bSkills) bSkills.innerHTML = SKILLS.map(({ name, desc }) => `
    <div>
      <p class="b-skill-name">${name}</p>
      <p class="b-skill-desc">${desc}</p>
    </div>`).join('');

  /* Skills — right panel */
  const pSkills = document.querySelector('.p-skills');
  if (pSkills) pSkills.innerHTML = SKILLS.map(({ name, desc }) => `
    <div>
      <p class="p-skill-name">${name}</p>
      <p class="p-skill-desc">${desc}</p>
    </div>`).join('');
})();

/* ─────────────────────────────────────────
   SCROLL-DRIVEN PANEL ACTIVATION
   Mechanism:
     1. Each .block-text has a sibling .panel (position: fixed)
     2. .in-view  → panel switches to display:flex (opacity 0, ready)
     3. .active   → panel fades to opacity 1
     4. Reading line = 33vh from top of viewport
───────────────────────────────────────── */
let readingTarget = window.innerHeight / 3;
let blocks = [];
let rafPending = false;

window.addEventListener('DOMContentLoaded', () => {
  blocks = [...document.querySelectorAll('.block-text')];
  readingTarget = window.innerHeight / 3;
  handlePanels();
  startFrameCountdowns();
});

// How long each iteration frame is held before a hard cut to the next.
const FRAME_HOLD_MS = 1200;
// The final frame lingers longer before cycling back to the first.
const LAST_FRAME_HOLD_MS = 4000;

// Kick off each cancellation-rate slideshow once its frames have loaded.
function startFrameCountdowns() {
  document.querySelectorAll('.frame-cycle').forEach((cycle) => {
    const imgs = [...cycle.querySelectorAll('img')];
    if (!imgs.length) return;
    let remaining = imgs.length;
    const done = () => { if (--remaining <= 0) startFrameSequence(cycle); };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  });
}

// Hard-cut through the four iteration frames (1 → 2 → 3 → 4), then loop.
// No crossfade — each cut represents a distinct iteration that brought the
// cancellation rate down.
function startFrameSequence(cycle) {
  const imgs = [...cycle.querySelectorAll('img')];
  if (!imgs.length) return;

  const show = (idx) => imgs.forEach((img, i) => {
    img.style.opacity = i === idx ? 1 : 0;
  });

  // Reduced-motion: settle on the first frame, no animation.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    show(0);
    return;
  }

  // Each frame's hold duration; the last frame lingers longer.
  const holds = imgs.map((_, i) =>
    i === imgs.length - 1 ? LAST_FRAME_HOLD_MS : FRAME_HOLD_MS
  );
  const loop = holds.reduce((a, b) => a + b, 0);
  const start = performance.now();
  let lastIdx = -1;

  function tick(now) {
    let t = (now - start) % loop;
    let idx = 0;
    while (t >= holds[idx]) { t -= holds[idx]; idx++; }
    if (idx !== lastIdx) { show(idx); lastIdx = idx; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

window.addEventListener('resize', () => {
  readingTarget = window.innerHeight / 3;
});

window.addEventListener('scroll', () => {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    handlePanels();
    rafPending = false;
  });
}, { passive: true });

function handlePanels() {
  if (window.innerWidth <= 768) return;

  /* Read all rects in one pass before touching the DOM */
  const rects = blocks.map(b => b.getBoundingClientRect());

  /* Step 1 — find which block (if any) straddles the reading line */
  let activeIndex = -1;
  for (let i = 0; i < rects.length; i++) {
    if (rects[i].top < readingTarget && rects[i].bottom > readingTarget) {
      activeIndex = i;
      break;
    }
  }

  /* Step 2 — if nothing straddles, use the last block scrolled past */
  if (activeIndex < 0) {
    for (let i = rects.length - 1; i >= 0; i--) {
      if (rects[i].bottom < readingTarget) {
        activeIndex = i;
        break;
      }
    }
  }

  /* Step 3 — before any block reaches the line, default to first */
  if (activeIndex < 0) activeIndex = 0;

  /* Step 4 — write all class changes after all reads are done */
  blocks.forEach((block, i) => {
    const inViewport = rects[i].top < window.innerHeight && rects[i].bottom > 0;
    block.classList.toggle('in-view', inViewport || i === activeIndex);
    block.classList.toggle('active', i === activeIndex);

    /* Play/pause any video in the sibling panel */
    const panel = block.nextElementSibling;
    if (panel) {
      const vid = panel.querySelector('video');
      if (vid) i === activeIndex ? vid.play() : vid.pause();
    }
  });
}

/* ─────────────────────────────────────────
   VIDEO — PLAY ON SCROLL
   Handles non-panel videos (mobile visuals,
   case study heroes) via IntersectionObserver.
───────────────────────────────────────── */
(function () {
  if (!('IntersectionObserver' in window)) return;
  const vids = [...document.querySelectorAll('video')].filter(
    v => !v.closest('.panel')
  );
  if (!vids.length) return;
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      e.isIntersecting ? e.target.play() : e.target.pause();
    });
  }, { threshold: 0.3 });
  vids.forEach(v => io.observe(v));
})();

/* ─────────────────────────────────────────
   THEME TOGGLE
   The floating light/dark toggle is a shared chrome
   component — see components/theme.js. Kept out of
   main.js so it also runs on pages that don't load it.
───────────────────────────────────────── */

/* ─────────────────────────────────────────
   CASE STUDY PAGE TRANSITION
   Intercepts .cs-link clicks on the homepage,
   plays the column-exit animation, then navigates.
───────────────────────────────────────── */
(function () {
  document.querySelectorAll('.cs-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var href = this.href;
      document.body.classList.add('is-exiting');
      setTimeout(function () { window.location.href = href; }, 380);
    });
  });
})();

/* ─────────────────────────────────────────
   LIVE TIMEZONE CLOCK — Lisbon / WET
───────────────────────────────────────── */
(function () {
  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  function tick() {
    var t = fmt.format(new Date());
    document.querySelectorAll('.b-tz-time').forEach(function (el) {
      el.textContent = t;
    });
  }
  tick();
  setInterval(tick, 60000);
})();

/* ─────────────────────────────────────────
   COPY EMAIL TO CLIPBOARD
───────────────────────────────────────── */
document.addEventListener('click', function (e) {
  var pill = e.target.closest('[data-copy]');
  if (!pill) return;
  navigator.clipboard.writeText(pill.dataset.copy).then(function () {
    var original = pill.textContent;
    pill.textContent = 'Copied!';
    setTimeout(function () { pill.textContent = original; }, 2000);
  });
});

