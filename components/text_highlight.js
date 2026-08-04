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

   Shape: a flat, stretchy middle body (preserveAspectRatio "none",
   so it reads as one long swipe) plus two small end caps pinned to
   fixed-aspect-ratio overlays sized off line-height, not phrase
   width — they can never stretch or distort, at any phrase length.
   (An earlier version baked the end taper into the same stretchy
   path as the body; on long phrases it stretched into a flat,
   polygon-like "pentagon" facet instead of a rounded swipe.) The two
   ends are deliberately not mirror copies of each other — a real
   hand never draws two identical ends. See playground/text-highlight-
   variants.html on the `playground` branch for the full A–H
   exploration this was chosen from.

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
        'pointer-events:none;z-index:0;}' +
      '.highlight__taper{position:absolute;top:-0.18em;' +
        'height:calc(100% + 0.30em);aspect-ratio:18 / 25;' +
        'pointer-events:none;z-index:0;}' +
      '.highlight__taper--l{left:-0.22em;}' +
      '.highlight__taper--r{right:-0.22em;}' +
      '.highlight__base{fill:rgb(var(--highlight-ink,172,160,232));transition:fill .25s ease;}' +
      '.highlight:hover .highlight__base{fill:color-mix(in srgb,rgb(var(--highlight-ink,172,160,232)) 90%,#000 10%);}' +
      '.highlight__text{position:relative;z-index:1;color:var(--color-accent-on-accent);}' +
      '@media (prefers-reduced-motion: reduce){.highlight__base{transition:none;}}';
    (document.head || document.documentElement).appendChild(style);
  }

  /* Flat middle body — irregular, asymmetric top/bottom wobble (hand
     tremor, not a repeating wave), stretched to fit the phrase. */
  var MID_D = 'M0,4 C10,2.2 20,3.8 28,2.6 C40,3.9 55,2.1 68,3.3 C80,2.5 92,3.7 101,3 ' +
              'L101,21.5 C88,23 75,21 63,22.8 C50,21.3 38,23.2 25,21.6 C15,22.7 6,21.2 0,22 Z';
  /* Left end — a blunt, slightly lopsided touchdown. */
  var TAPER_L_D = 'M18,4 C10,3.2 3,4.6 1,9 C-0.4,13 0.6,17.2 4.2,20.4 C8,23.2 14,22.1 18,21.6 L18,4 Z';
  /* Right end — a softer, uneven lift-off. Deliberately not a mirror of the left. */
  var TAPER_R_D = 'M0,3.7 C7,3 13,4.3 15.6,7.4 C18,10.2 17.6,15.4 15.2,18.6 C12.4,22.3 6,23 0,21.4 L0,3.7 Z';

  var SVG =
    '<svg class="highlight__ink" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 101 25">' +
      '<path class="highlight__base" d="' + MID_D + '"/>' +
    '</svg>' +
    '<svg class="highlight__taper highlight__taper--l" aria-hidden="true" viewBox="0 0 18 25" preserveAspectRatio="xMinYMid meet">' +
      '<path class="highlight__base" d="' + TAPER_L_D + '"/>' +
    '</svg>' +
    '<svg class="highlight__taper highlight__taper--r" aria-hidden="true" viewBox="0 0 18 25" preserveAspectRatio="xMaxYMid meet">' +
      '<path class="highlight__base" d="' + TAPER_R_D + '"/>' +
    '</svg>';

  function mark(el) {
    if (el.getAttribute('data-highlight-ready')) return;

    var text = el.textContent;

    el.classList.add('highlight');
    el.innerHTML = SVG + '<span class="highlight__text"></span>';
    /* Set text via textContent so any characters in the source are escaped. */
    el.querySelector('.highlight__text').textContent = text;
    el.setAttribute('data-highlight-ready', '1');
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
