/* ─────────────────────────────────────────
   SHARED HEAD COMPONENT
   Injects the boilerplate <head> resources that are
   identical on every page, so they live in one place:
     • Google Fonts (Manrope + Material Symbols)
     • /llms.txt discovery link (root-absolute for nested routes)
     • Umami analytics (+ components/analytics.js for in-page events)
     • Vercel Web Analytics
     • Spear-hunting permission seeding (case studies unlocked)

   Render-critical / per-page tags stay static in each
   page's <head>: charset, viewport, <title>,
   <meta name="description">, and stylesheet links.

   Load this with a plain (parser-blocking) script tag in
   <head> so injection happens before <body> renders:
     <script src="components/head.js"></script>
───────────────────────────────────────── */
(function () {
  var head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  /* Apply the saved theme before first paint (avoids a flash of the
     wrong colour mode). Runs here because this script is parser-
     blocking in <head>. Mirrors the localStorage key used by the
     toggle in components/theme.js. */
  try {
    var t = localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  /* ── SPEAR-HUNTING PERMISSION SEEDING ──
     A spear-hunting page (served at /<company>, the folder is
     spear-hunting/<company>/) was sent to a specific company, so
     arriving there *is* the permission — same level as the /unlocked/ magic link. Seed it:
       • cs_unlock session cookie → every case study opens silently,
         no password gate
       • pf_via in localStorage → components/analytics.js tags the
         visit "unlocked" and identifies it as link:<company>
       • pf_arrived once per session → one arrival event
     Read from <html data-slug="<company>"> (set on every company page
     and both templates), since the clean URL no longer carries the
     folder name. */
  var shCompany = document.documentElement.getAttribute('data-slug');
  if (shCompany) {
    try {
      document.cookie = 'cs_unlock=' + encodeURIComponent('designforgrowth') + '; path=/; SameSite=Lax';
      localStorage.setItem('pf_via', JSON.stringify({ to: shCompany, via: 'spear-hunting' }));
      if (!sessionStorage.getItem('pf_arrived')) sessionStorage.setItem('pf_arrived', '1');
    } catch (e) {}
  }

  head.insertAdjacentHTML('beforeend',
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=optional" rel="stylesheet" />' +
    '<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,1,0" rel="stylesheet" />' +
    '<link rel="llms" href="/llms.txt" />'
  );

  /* Umami analytics — appended as a real element so the
     external script executes (insertAdjacentHTML won't run it). */
  var umami = document.createElement('script');
  umami.defer = true;
  umami.src = 'https://cloud.umami.is/script.js';
  umami.setAttribute('data-website-id', '5c4d27a2-1670-4d49-ad0c-b5447a605a69');

  /* Top-level audience bucket, sent with every pageview and event as
     an Umami tag (Filter → Tag in the dashboard). Two buckets only:
       unlocked = this browser has come through a link I sent — the
                  /unlocked/ magic link or a spear-hunting page
                  (both seed pf_via; remembered, so a return visit by
                  typing the URL counts too)
       cold     = strangers who found the site themselves */
  var tag = 'cold';
  try { if (localStorage.getItem('pf_via')) tag = 'unlocked'; } catch (e) {}
  umami.setAttribute('data-tag', tag);
  head.appendChild(umami);

  /* Section-view, click, unlock and video events on top of Umami's
     pageviews — see components/analytics.js. Root-absolute so nested
     routes (/<company>) resolve it too. */
  var analytics = document.createElement('script');
  analytics.defer = true;
  analytics.src = '/components/analytics.js';
  head.appendChild(analytics);

  /* Vercel Web Analytics — queue shim so events fire before the
     script loads, then the real script (served by Vercel at
     /_vercel/insights/script.js once Analytics is enabled in the
     dashboard). Appended as a real element so it executes. */
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  var vercel = document.createElement('script');
  vercel.defer = true;
  vercel.src = '/_vercel/insights/script.js';
  head.appendChild(vercel);
})();
