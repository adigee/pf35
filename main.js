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
});

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
  });
}

/* ─────────────────────────────────────────
   THEME TOGGLE
   Priority: localStorage > prefers-color-scheme
───────────────────────────────────────── */
(function () {
  const html  = document.documentElement;
  const btn   = document.getElementById('theme-toggle');
  const wrap  = document.getElementById('theme-toggle-wrap');
  const label = document.getElementById('toggle-label');

  let labelTimer = null;
  const canHover = window.matchMedia('(hover: hover)').matches;

  function showLabel() {
    label.classList.remove('hidden');
    clearTimeout(labelTimer);
    labelTimer = setTimeout(function () {
      label.classList.add('hidden');
    }, 5000);
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    localStorage.setItem('theme', theme);
    showLabel();
  }

  const saved     = localStorage.getItem('theme');
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(saved || preferred);

  btn.addEventListener('click', function () {
    applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  if (canHover) {
    wrap.addEventListener('mouseenter', showLabel);
  }
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
