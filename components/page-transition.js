/* ─────────────────────────────────────────
   PAGE TRANSITION — home ⇄ case-study rail hand-off
   Shared cross-document View Transition. The EYEBROW is the thread that
   connects the two pages: the clicked project's eyebrow and the case-study
   header eyebrow share one view-transition-name, so it glides between the
   pages while everything else cross-fades and the left rails slide.

   The rails and the case-study header eyebrow are named statically in
   style.css. This script only names the one HOMEPAGE eyebrow that takes
   part — there are four feature-card eyebrows, so a static name would be a
   duplicate. We name exactly one, dynamically:
     • forward (home → case study): the clicked feature card's eyebrow,
       tagged in `pageswap`. (Grid tiles have no eyebrow → they just
       cross-fade, which is the graceful path.)
     • back (case study → home): the returning project's feature-card
       eyebrow, tagged in `pagereveal` so it morphs from the header eyebrow
       we just left. The project slug is stashed in sessionStorage on the
       way out (survives the Back button, where document.referrer doesn't).

   Registered from <head> so the pagereveal listener exists before first
   paint. Browsers without cross-document view transitions ignore all of
   this and navigate normally — a clean progressive enhancement.
───────────────────────────────────────── */
(function () {
  /* The shared view-transition-name lives on the .pt-eyebrow class
     (style.css); here we just add/remove that class. */
  var KEY = 'pt:fromProject';

  function url(href) { try { return new URL(href, location.href); } catch (e) { return null; } }
  function isInternal(u) { return u && u.origin === location.origin; }
  function isCaseStudyPath(u) {
    return isInternal(u) && /\.html$/.test(u.pathname) && !/(^|\/)index\.html?$/.test(u.pathname);
  }
  function slugOf(u) { return u ? u.pathname.replace(/^.*\//, '').replace(/\.html?$/, '') : ''; }
  function onCaseStudy() { return document.body.classList.contains('cs-page'); }

  function untagFeatureEyebrows() {
    var nodes = document.querySelectorAll('.fc-eyebrow.pt-eyebrow');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('pt-eyebrow');
  }

  /* Remember the clicked link so `pageswap` knows which eyebrow to tag.
     Only plain primary-button clicks qualify — modifier / middle clicks
     open a new context and must not participate. */
  var clickedLink = null;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[href]');
    clickedLink = (link && link.target !== '_blank') ? link : null;
  }, true);

  /* OLD document, just before its snapshot is taken. */
  window.addEventListener('pageswap', function (e) {
    if (!e.viewTransition) return;
    if (onCaseStudy()) {
      // Leaving a case study → remember the project so the homepage can
      // morph the matching eyebrow back in on arrival.
      try { sessionStorage.setItem(KEY, document.body.getAttribute('data-project') || ''); } catch (err) {}
    } else if (clickedLink && isCaseStudyPath(url(clickedLink.href))) {
      // Forward: tag the clicked feature card's eyebrow (grid tiles have none).
      var eb = clickedLink.querySelector('.fc-eyebrow');
      if (eb) eb.classList.add('pt-eyebrow');
    }
  });

  /* NEW document, before its first render. Also fires on back/forward-cache
     restores, so we always clear stale tags first. */
  window.addEventListener('pagereveal', function (e) {
    untagFeatureEyebrows();
    if (!e.viewTransition) return;
    if (!onCaseStudy()) {
      // Back to the homepage: tag the returning project's eyebrow so it
      // morphs from the case-study header eyebrow. Prefer the stashed slug
      // (survives the Back button); fall back to the referrer.
      var slug = '';
      try { slug = sessionStorage.getItem(KEY) || ''; } catch (err) {}
      if (!slug) slug = slugOf(url(document.referrer));
      if (slug) {
        var sel = (window.CSS && window.CSS.escape) ? window.CSS.escape(slug) : slug;
        var eb = document.querySelector('.fc-eyebrow[data-eyebrow-for="' + sel + '"]');
        if (eb) eb.classList.add('pt-eyebrow');
      }
      try { sessionStorage.removeItem(KEY); } catch (err2) {}
      // Clean the class off once the animation is done (it's inline-block
      // only for the capture); leaves the resting homepage untouched.
      e.viewTransition.finished.then(untagFeatureEyebrows, function () {});
    }
    // The case-study header eyebrow is named statically in style.css.
  });
})();
