/* ─────────────────────────────────────────
   PROJECT REGISTRY
   Single source of truth for the project list.
   The homepage grid/feature eyebrows AND every case-study
   header read their eyebrow from here, so the two can never
   drift apart — edit a project once and it updates everywhere.

   Order matters: it defines the homepage sequence and the
   "Next project" cycle in the case-study footer.

   Each project:
     slug     — matches <body data-project="…"> on its case study
     href     — link to the case study (or external write-up)
     name     — short human name (used by "Next project")
     eyebrow  — array of segments; joined with " • " everywhere
     external — true if href leaves the site (no case-study page)

   Loaded before components/case-study.js on case-study pages,
   and on index.html to fill the homepage eyebrows.
───────────────────────────────────────── */
(function () {
  /* EN SPACE + bullet + EN SPACE — the one separator used for
     every eyebrow, on the homepage and in case studies alike. */
  var SEP = ' • ';

  var PROJECTS = [
    {
      slug: 'lockers-reducing-cancellation',
      href: 'lockers-reducing-cancellation.html',
      name: 'Lockers PUDO',
      eyebrow: ['Bounce', 'B2C', 'Locker PUDO', 'Prove PMF'],
    },
    {
      slug: 'decision-module',
      href: 'decision-module.html',
      name: 'The Decision Module',
      eyebrow: ['Unbabel', 'B2B', 'Decision Module', 'Internal tool'],
    },
    {
      slug: 'trq-dad',
      href: 'trq-dad.html',
      name: 'TRQ DAD',
      eyebrow: ['Freelance', 'B2B', 'TRQ DAD', 'Increase ops efficiency'],
    },
  ];

  var bySlug = {};
  PROJECTS.forEach(function (p, i) { p.index = i; bySlug[p.slug] = p; });

  function get(slug) { return bySlug[slug] || null; }

  /* The rendered eyebrow string for a project (or slug). */
  function eyebrow(project) {
    var p = typeof project === 'string' ? get(project) : project;
    return p ? p.eyebrow.join(SEP) : '';
  }

  /* The next project in the sequence, wrapping around. */
  function next(slug) {
    var p = get(slug);
    if (!p) return null;
    return PROJECTS[(p.index + 1) % PROJECTS.length];
  }

  /* The previous project in the sequence, wrapping around. */
  function prev(slug) {
    var p = get(slug);
    if (!p) return null;
    return PROJECTS[(p.index - 1 + PROJECTS.length) % PROJECTS.length];
  }

  window.PROJECTS = PROJECTS;
  window.Projects = { get: get, eyebrow: eyebrow, next: next, prev: prev, SEP: SEP };

  /* Fill any element tagged with data-eyebrow-for="<slug>" from the
     registry. Used by the homepage feature cards so their eyebrows
     are the same source the case studies read. */
  function fillEyebrows() {
    var nodes = document.querySelectorAll('[data-eyebrow-for]');
    for (var i = 0; i < nodes.length; i++) {
      var text = eyebrow(nodes[i].getAttribute('data-eyebrow-for'));
      if (text) nodes[i].textContent = text;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillEyebrows);
  } else {
    fillEyebrows();
  }
})();
