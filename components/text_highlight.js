/* ─────────────────────────────────────────
   TEXT HIGHLIGHT COMPONENT
   A reusable hand-drawn highlighter marker that sits behind
   a run of text — like a swipe of a highlighter pen.

   Usage: add the attribute to any inline element whose text
   you want marked. The script wraps the text with the marker
   SVG on load.

     <em data-highlight>why behind the what</em>

   The marker colour comes from the --highlight-ink token
   (defined per theme in style.css); a lilac fallback is baked
   in so the component still renders on pages that don't set it.
   The stroke stretches to fit the phrase (preserveAspectRatio
   is "none"), reading as one long highlighter swipe. Both ends
   use the same hand-drawn taper — the right end is a mirror of
   the left, via the {ID} mask (see playground/text-highlight-
   variants.html on the `playground` branch for the A–E options
   this was chosen from: no end-cap, symmetric ends).

   Load it like the other chrome components, before </body>:
     <script src="components/text_highlight.js"></script>
───────────────────────────────────────── */
(function () {
  /* Styles, injected once. The --highlight-ink fallback keeps the
     marker visible even where the token isn't defined. */
  if (!document.getElementById('highlight-styles')) {
    var style = document.createElement('style');
    style.id = 'highlight-styles';
    style.textContent =
      '.highlight{position:relative;display:inline-block;white-space:nowrap;}' +
      '.highlight__ink{position:absolute;left:-0.22em;top:-0.18em;' +
        'width:calc(100% + 0.44em);height:calc(100% + 0.30em);' +
        'pointer-events:none;z-index:0;' +
        'clip-path:inset(0 0 0 0);' +
        'transition:clip-path 0.15s ease;}' +
      '.highlight__base{fill:rgb(var(--highlight-ink,172,160,232));transition:fill .25s ease;}' +
      '.highlight:hover .highlight__base{fill:color-mix(in srgb,rgb(var(--highlight-ink,172,160,232)) 90%,#000 10%);}' +
      '.highlight__text{position:relative;z-index:1;color:var(--color-accent-on-accent);}' +
      '.highlight.removing .highlight__ink{clip-path:inset(0 100% 0 0);transition:clip-path 0.25s cubic-bezier(0.65,0,0.35,1);}' +
      '.highlight.redrawing .highlight__ink{animation:highlight-sweep 1.4s cubic-bezier(0.65,0,0.35,1) forwards;}' +
      /* On-load sweep (data-highlight-auto): the phrase loads in its normal
         colour, then as the marker sweeps in the text animates into its
         on-marker colour — so it ends pixel-identical to every other
         highlight on the site (solid marker, accent-on-accent text). */
      '.highlight.auto-sweep .highlight__ink{clip-path:inset(0 100% 0 0);transition:none;}' +
      '.highlight.auto-sweep .highlight__text{color:var(--color-text);}' +
      '.highlight.auto-sweep.redrawing .highlight__text{animation:hl-text-in 1.4s cubic-bezier(0.65,0,0.35,1) forwards;}' +
      '@keyframes hl-text-in{from{color:var(--color-text);}to{color:var(--color-accent-on-accent);}}' +
      '@keyframes highlight-sweep{0%{clip-path:inset(0 100% 0 0);}100%{clip-path:inset(0 0 0 0);}}' +
      '@media (prefers-reduced-motion: reduce){.highlight__base{transition:none;}.highlight.redrawing .highlight__ink{animation:none;}}';
    (document.head || document.documentElement).appendChild(style);
  }

  /* The hand-drawn stroke. {ID} is swapped for a per-instance mask id so
     multiple marks on one page don't share (and clobber) an id. The mask
     crops to the shape's own left-edge taper; a mirrored copy of the same
     path re-uses that taper for the right edge, so both ends match instead
     of the right edge using the shape's original (cap-shaped) boundary. */
  var BASE_D = 'M0.823 22.9875C2.12222 24.6601 14.0523 22.9134 20.6665 22.8763L128.906 22.7028C130.406 22.7028 131.393 21.5171 131.665 20.5217C132.23 17.1425 132.726 15.8892 133.13 13.4661C133.535 11.043 133.968 8.40162 134.203 5.66436C134.217 5.49971 134.26 5.06964 134.295 4.58343C134.381 3.39728 133.639 2.52232 132.734 2.4758C116.977 1.66595 41.6503 1.76509 35.412 1.80003L15.5684 1.91116C11.8498 1.93197 5.72888 1.36927 3.82068 2.63216C2.72881 3.35479 2.59275 6.24212 2.32068 7.23742C1.75573 9.30088 1.72532 10.0775 1.32068 12.5006C0.916036 14.9237 1.31844 14.4746 0.820683 17.1061C0.438628 19.1258 -0.67937 21.0533 0.823 22.9875Z';
  var SVG =
    '<svg class="highlight__ink" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 137 25">' +
      '<mask id="{ID}" maskUnits="userSpaceOnUse" x="0" y="0" width="74" height="25">' +
        '<rect x="0" y="0" width="74" height="25" fill="white"/>' +
      '</mask>' +
      '<path class="highlight__base" mask="url(#{ID})" d="' + BASE_D + '"/>' +
      '<g transform="translate(137,0) scale(-1,1)">' +
        '<path class="highlight__base" mask="url(#{ID})" d="' + BASE_D + '"/>' +
      '</g>' +
    '</svg>';

  var seq = 0;

  function mark(el) {
    if (el.getAttribute('data-highlight-ready')) return;

    var text = el.textContent;
    var maskId = 'highlight-taper-' + (++seq);

    el.classList.add('highlight');
    el.innerHTML = SVG.replace(/\{ID\}/g, maskId) + '<span class="highlight__text"></span>';
    /* Set text via textContent so any characters in the source are escaped. */
    el.querySelector('.highlight__text').textContent = text;
    el.setAttribute('data-highlight-ready', '1');

    el.addEventListener('click', function () {
      if (el.classList.contains('redrawing')) return;

      el.classList.add('removing');

      var ink = el.querySelector('.highlight__ink');
      if (!ink) return;

      ink.addEventListener('transitionend', function onRemoveDone() {
        el.classList.remove('removing');
        el.classList.add('redrawing');

        ink.addEventListener('animationend', function () {
          el.classList.remove('redrawing');
        }, { once: true });
      }, { once: true });
    });

    /* ── On-load sweep ──
       Opt in with data-highlight-auto="<delay ms>" (default 200). The marker
       is held hidden while the phrase loads in its normal colour; after the
       delay the marker sweeps in (same motion as a click replay) and the
       text animates into its on-marker colour in sync — ending identical to
       every other highlight. Skipped under prefers-reduced-motion. */
    var auto = el.getAttribute('data-highlight-auto');
    if (auto !== null &&
        window.matchMedia &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var delay = parseInt(auto, 10);
      if (isNaN(delay) || delay < 0) delay = 200;
      el.classList.add('auto-sweep');
      setTimeout(function () {
        if (!el.classList.contains('auto-sweep')) return;
        el.classList.add('redrawing');
        var ink = el.querySelector('.highlight__ink');
        if (ink) ink.addEventListener('animationend', function () {
          el.classList.remove('redrawing');
          el.classList.remove('auto-sweep');
        }, { once: true });
      }, delay);
    }
  }

  function mount() {
    var els = document.querySelectorAll('[data-highlight]');
    for (var i = 0; i < els.length; i++) mark(els[i]);
  }

  function observe() {
    if (typeof MutationObserver === 'undefined') return;
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.hasAttribute && node.hasAttribute('data-highlight')) { mark(node); continue; }
          var els = node.querySelectorAll ? node.querySelectorAll('[data-highlight]') : [];
          for (var k = 0; k < els.length; k++) mark(els[k]);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(); observe(); });
  } else {
    mount();
    observe();
  }
})();
