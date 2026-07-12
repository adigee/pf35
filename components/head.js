/* ─────────────────────────────────────────
   SHARED HEAD COMPONENT
   Injects the boilerplate <head> resources that are
   identical on every page, so they live in one place:
     • Google Fonts (Manrope + Material Symbols)
     • llms.txt discovery link
     • Umami analytics
     • Vercel Web Analytics

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

  head.insertAdjacentHTML('beforeend',
    '<link rel="preconnect" href="https://fonts.googleapis.com" />' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet" />' +
    '<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20,400,1,0" rel="stylesheet" />' +
    '<link rel="llms" href="llms.txt" />'
  );

  /* Umami analytics — appended as a real element so the
     external script executes (insertAdjacentHTML won't run it). */
  var umami = document.createElement('script');
  umami.defer = true;
  umami.src = 'https://cloud.umami.is/script.js';
  umami.setAttribute('data-website-id', '5c4d27a2-1670-4d49-ad0c-b5447a605a69');
  head.appendChild(umami);

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
