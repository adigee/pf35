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
   is "none"), reading as one long highlighter swipe.

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
      '.highlight__base{fill:rgb(var(--highlight-ink,172,160,232));transition:fill .25s ease;}' +
      '.highlight__cap{fill:color-mix(in srgb,rgb(var(--highlight-ink,172,160,232)) 80%,#000 20%);transition:fill .25s ease;}' +
      '.highlight:hover .highlight__base{fill:color-mix(in srgb,rgb(var(--highlight-ink,172,160,232)) 90%,#000 10%);}' +
      '.highlight:hover .highlight__cap{fill:color-mix(in srgb,rgb(var(--highlight-ink,172,160,232)) 68%,#000 32%);}' +
      '.highlight__text{position:relative;z-index:1;color:var(--color-accent-on-accent);}' +
      '@media (prefers-reduced-motion: reduce){.highlight__base,.highlight__cap{transition:none;}}';
    (document.head || document.documentElement).appendChild(style);
  }

  /* The hand-drawn stroke. {ID} is swapped for a per-instance mask id
     so multiple marks on one page don't share (and clobber) an id. */
  var SVG =
    '<svg class="highlight__ink" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 137 25">' +
      '<path class="highlight__base" d="M0.823 22.9875C2.12222 24.6601 14.0523 22.9134 20.6665 22.8763L128.906 22.7028C130.406 22.7028 131.393 21.5171 131.665 20.5217C132.23 17.1425 132.726 15.8892 133.13 13.4661C133.535 11.043 133.968 8.40162 134.203 5.66436C134.217 5.49971 134.26 5.06964 134.295 4.58343C134.381 3.39728 133.639 2.52232 132.734 2.4758C116.977 1.66595 41.6503 1.76509 35.412 1.80003L15.5684 1.91116C11.8498 1.93197 5.72888 1.36927 3.82068 2.63216C2.72881 3.35479 2.59275 6.24212 2.32068 7.23742C1.75573 9.30088 1.72532 10.0775 1.32068 12.5006C0.916036 14.9237 1.31844 14.4746 0.820683 17.1061C0.438628 19.1258 -0.67937 21.0533 0.823 22.9875Z"/>' +
      '<mask id="{ID}" maskUnits="userSpaceOnUse" x="127" y="0" width="7" height="24">' +
        '<path d="M127.344 9.39259L128.769 4.51684C129.117 3.32662 129.861 2.41258 130.788 2.03755C132.066 1.11494 136.73 3.72151 136.815 6.80107L134.862 20.0174C134.547 22.1468 133.13 23.6842 131.481 23.6842C130.537 23.6842 129.745 22.7462 129.646 21.5107L126.973 13.0932C126.873 11.8384 127 10.5705 127.344 9.39259Z" fill="white"/>' +
      '</mask>' +
      '<path class="highlight__cap" mask="url(#{ID})" d="M0.823 22.9875C2.12222 24.6601 14.0523 22.9134 20.6665 22.8763L128.906 22.7028C130.406 22.7028 131.393 21.5171 131.665 20.5217C132.23 17.1425 132.726 15.8892 133.13 13.4661C133.535 11.043 133.968 8.40162 134.203 5.66436C134.217 5.49971 134.26 5.06964 134.295 4.58343C134.381 3.39728 133.639 2.52232 132.734 2.4758C116.977 1.66595 41.6503 1.76509 35.412 1.80003L15.5684 1.91116C11.8498 1.93197 5.72888 1.36927 3.82068 2.63216C2.72881 3.35479 2.59275 6.24212 2.32068 7.23742C1.75573 9.30088 1.72532 10.0775 1.32068 12.5006C0.916036 14.9237 1.31844 14.4746 0.820683 17.1061C0.438628 19.1258 -0.67937 21.0533 0.823 22.9875Z"/>' +
    '</svg>';

  var seq = 0;

  function mark(el) {
    if (el.getAttribute('data-highlight-ready')) return;

    var text = el.textContent;
    var maskId = 'highlight-cap-' + (++seq);

    el.classList.add('highlight');
    el.innerHTML = SVG.replace(/\{ID\}/g, maskId) + '<span class="highlight__text"></span>';
    /* Set text via textContent so any characters in the source are escaped. */
    el.querySelector('.highlight__text').textContent = text;
    el.setAttribute('data-highlight-ready', '1');
  }

  function mount() {
    var els = document.querySelectorAll('[data-highlight]');
    for (var i = 0; i < els.length; i++) mark(els[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
