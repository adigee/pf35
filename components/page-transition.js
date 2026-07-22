/* ─────────────────────────────────────────
   PAGE TRANSITION — home ⇄ case study morph
   Shared cross-document View Transition. When a project
   thumbnail on the homepage is clicked, the clicked image
   morphs into the case-study hero as the page navigates;
   everything else cross-fades.

   Mechanism (View Transitions API, level 2):
     • style.css opts every same-origin navigation in via
       `@view-transition { navigation: auto }` (reduced-motion gated).
     • On the OLD page we give the participating element a shared
       `view-transition-name`; on the NEW page we give its counterpart
       the SAME name. The browser pairs them and animates between.

   The same project image appears twice on the homepage (overview grid
   + feature card), so the name can't be static — it would be a duplicate.
   Instead we tag ONLY the clicked thumbnail, in `pageswap`, and tag the
   case-study hero in `pagereveal` only when we arrived from the homepage.
   Every other navigation (case study → case study, → home, direct load)
   simply cross-fades.

   Browsers without cross-document view transitions ignore all of this
   and navigate normally — a clean progressive enhancement. Registered
   from <head> so the pagereveal listener exists before first paint.
───────────────────────────────────────── */
(function () {
  var NAME = 'project-hero';
  var HERO = '.cs-hero-img';

  function url(href) {
    try { return new URL(href, location.href); } catch (e) { return null; }
  }
  function isInternal(u) { return u && u.origin === location.origin; }
  function isCaseStudy(u) {
    return isInternal(u) && /\.html$/.test(u.pathname) && !/(^|\/)index\.html?$/.test(u.pathname);
  }
  function isHome(href) {
    var u = url(href);
    if (!isInternal(u)) return false;
    return u.pathname === '/' || /(^|\/)index\.html?$/.test(u.pathname);
  }

  /* Remember which thumbnail was clicked — it becomes the morph source.
     Only plain primary-button clicks on internal case-study links qualify
     (modifier / middle clicks open a new context and must not be tagged). */
  var clickedImg = null;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || link.target === '_blank') return;
    if (!isCaseStudy(url(link.href))) { clickedImg = null; return; }
    clickedImg = link.querySelector('img') || null;
  }, true);

  /* OLD document, just before its snapshot is taken. */
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;               // no transition happening
    if (clickedImg) clickedImg.style.viewTransitionName = NAME;   // homepage → tag source
    var hero = document.querySelector(HERO);     // leaving a case study → never a source
    if (hero) hero.style.viewTransitionName = 'none';
  });

  /* NEW document, before its first render. Only morph into the hero when
     the reader came from the homepage; otherwise a plain cross-fade.
     Also fires on back/forward-cache restores, where the DOM (and this
     script's state) come back exactly as they were left — including the
     thumbnail tagged in `pageswap`. Untag it, or the next click on a
     different tile would put two elements in the old document with the
     same view-transition-name, which makes the browser skip the
     transition entirely. */
  window.addEventListener('pagereveal', function (e) {
    if (clickedImg) { clickedImg.style.viewTransitionName = ''; clickedImg = null; }
    if (!e.viewTransition) return;
    var hero = document.querySelector(HERO);
    if (!hero) return;
    hero.style.viewTransitionName = isHome(document.referrer) ? NAME : 'none';
  });
})();
