/* ─────────────────────────────────────────
   HEADLINE TYPEWRITER -- HousingAnywhere page
   Types the .sh-title headline letter by letter, but the per-character
   cadence follows the motion curves from design.md, phrase by phrase:

     Phrase                              Curve                      Pause after
     ─────────────────────────────────   ─────────────────────────  ───────────
     "The booking is confirmed,"         ease (0.25,0.1,0.25,1)     340ms
     "the day has arrived,"              ease (0.25,0.1,0.25,1)     340ms
     "it's time to move in."             ease (0.25,0.1,0.25,1)     560ms
     "The next 48 hours is where"        sweep (0.65,0,0.35,1)      flows straight on
     "HousingAnywhere builds trust"      sweep (0.65,0,0.35,1)      560ms, then marker
                                         (marker sweep, 1.4s)       --

     - ease is the site's default curve (design.md §Motion: "Ease
       everywhere") -- fast start, decelerating early into each
       punctuation pause.
     - The bridge phrase types on cubic-bezier(0.65,0,0.35,1), the
       annotation-strike curve text_highlight.js already sweeps the
       marker with -- its S-shape holds the brisk middle pace longer
       before the same soft landing, so the typing hands off to the
       sweep without changing curve.
     - The spring (0.34,1.45,0.64,1) is deliberately NOT used here:
       it overshoots (y > 1), which reads as negative per-character
       delay; it stays reserved for pop-in reveals.

   Within a phrase, character i of n sits at t = i/(n-1) on the curve;
   the curve's output (0→1) interpolates the per-character delay
   between MIN_DELAY and MAX_DELAY, plus a ±3ms human jitter.

   Skipped entirely under prefers-reduced-motion -- the headline,
   its static highlight and the page all render as normal.

   Page reveal: everything below the headline is held blurred-out
   (opacity 0 + 12px blur) until the marker sweep finishes, then
   blurs into focus over 420ms on the same sweep curve. If the
   choreography ever aborts, the reveal fires anyway so the page
   can never stay hidden.

   Load it AFTER text_highlight.js, so the highlight span is
   already wrapped when typing starts:
     <script src="/components/text_highlight.js"></script>
     <script src="/spear-hunting/housinganywhere/typewriter.js"></script>
   ───────────────────────────────────────── */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── Page reveal ──
     Everything below the headline is held blurred-out until the highlight
     sweep finishes, then blurs into focus. The class goes on immediately
     so the first paint is already masked; revealPage() is idempotent and
     also fires from the abort paths below, so a failure in the choreography
     can never leave the page hidden. */
  if (document.body) document.body.classList.add('pre-reveal');
  function revealPage() {
    if (!document.body || !document.body.classList.contains('pre-reveal')) return;
    document.body.classList.remove('pre-reveal');
    document.body.classList.add('revealed');
  }

  /* Reveal + caret styles, injected once -- self-contained like the other components. */
  if (!document.getElementById('typewriter-styles')) {
    var style = document.createElement('style');
    style.id = 'typewriter-styles';
    style.textContent =
      'body.pre-reveal .sh-role-line,body.pre-reveal .sh-shell>:not(.sh-pitch)' +
        '{opacity:0;filter:blur(12px);pointer-events:none;}' +
      /* The header's bottom divider is part of the reveal too: held
         transparent while the headline types, drawn in with the blur. */
      'body.pre-reveal .sh-pitch{border-bottom-color:transparent;}' +
      'body.revealed .sh-pitch{border-bottom-color:var(--color-border);' +
        'transition:border-color .42s cubic-bezier(0.65,0,0.35,1);}' +
      'body.revealed .sh-role-line,body.revealed .sh-shell>:not(.sh-pitch)' +
        '{animation:page-reveal-in .42s cubic-bezier(0.65,0,0.35,1) both;}' +
      '@keyframes page-reveal-in{from{opacity:0;filter:blur(12px);}to{opacity:1;filter:blur(0);}}' +
      '.type-caret{display:inline-block;width:0.08em;height:0.95em;vertical-align:-0.08em;' +
        'margin-left:0.05em;background:currentColor;border-radius:1px;' +
        'animation:type-caret-blink 0.9s steps(1,end) infinite;}' +
      '@keyframes type-caret-blink{50%{opacity:0;}}';
    (document.head || document.documentElement).appendChild(style);
  }

  /* ── Timing constants ── */
  var START_DELAY = 350;      /* ms before the first character */
  var MIN_DELAY = 12;         /* ms per character at curve output 0 (fastest) */
  var MAX_DELAY = 58;         /* ms per character at curve output 1 (slowest) */
  var PAUSE_COMMA = 340;      /* rest after a phrase ending in ',' */
  var PAUSE_STOP = 560;       /* longer rest after a phrase ending in '.' */
  var PAUSE_TYPED_TO_SWEEP = 560; /* pause after the phrase is read plainly, before the marker sweeps */

  /* CSS cubic-bezier evaluator: returns a function mapping x∈[0,1]
     to the curve's y (progress). Newton-Raphson with a bisection
     fallback -- standard, small, and no dependencies. */
  function cubicBezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sampleX(t) { return ((ax * t + bx) * t + cx) * t; }
    function sampleY(t) { return ((ay * t + by) * t + cy) * t; }
    function slopeX(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    function solveX(x) {
      var t = x, i, d, dt;
      for (i = 0; i < 6; i++) {
        d = sampleX(t) - x;
        if (Math.abs(d) < 1e-5) return t;
        dt = slopeX(t);
        if (Math.abs(dt) < 1e-6) break;
        t -= d / dt;
      }
      var lo = 0, hi = 1;
      t = x;
      for (i = 0; i < 12; i++) {
        d = sampleX(t) - x;
        if (Math.abs(d) < 1e-5) break;
        if (d < 0) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    }
    return function (x) { return sampleY(solveX(x)); };
  }

  /* The two curves the headline types on (see header table). */
  var CURVE_EASE = cubicBezier(0.25, 0.1, 0.25, 1);   /* design.md default */
  var CURVE_SWEEP = cubicBezier(0.65, 0, 0.35, 1);    /* strike-draw / sweep curve */

  /* Split the lead text at sentence punctuation so each phrase is one beat. */
  function splitPhrases(text) {
    var parts = [];
    var start = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if ((ch === ',' || ch === '.') && text.charAt(i + 1) === ' ') {
        parts.push(text.slice(start, i + 2));
        start = i + 2;
        i += 1;
      }
    }
    if (start < text.length) parts.push(text.slice(start));
    return parts;
  }

  function begin(attempt) {
    var title = document.querySelector('.sh-title');
    if (!title) { revealPage(); return; }
    var span = title.querySelector('[data-highlight]');
    /* On narrow screens the highlighter may have restructured the phrase
       into one highlight per word (splitOnOverflow) -- type across every
       word's text span in order; on desktop there is just one. */
    var targets = span ? span.querySelectorAll('.highlight__text') : [];
    /* The highlighter wraps the span on DOMContentLoaded -- this script is
       loaded after it, so the wrap is normally already there. A few short
       retries just in case ordering ever shifts; give up quietly so the
       headline stays static rather than half-typed. */
    if (!span || !targets.length) {
      if (attempt < 20) setTimeout(function () { begin(attempt + 1); }, 50);
      else revealPage(); /* never leave the page hidden */
      return;
    }

    /* Screen readers get the whole sentence up front; typing is visual only. */
    title.setAttribute('aria-label', title.textContent);

    /* The lead run: every text node before the highlight span. */
    var leadNode = null;
    var leadText = '';
    var kids = Array.prototype.slice.call(title.childNodes);
    for (var i = 0; i < kids.length; i++) {
      var child = kids[i];
      if (child.nodeType === 1 && child.hasAttribute && child.hasAttribute('data-highlight')) break;
      if (child.nodeType === 3) {
        leadText += child.data;
        if (!leadNode) leadNode = child;
        else title.removeChild(child);
      }
    }
    if (leadNode) leadNode.data = '';

    /* The phrase (or the per-word fragments of it), cleared for typing. */
    var texts = [];
    for (i = 0; i < targets.length; i++) {
      texts.push(targets[i].textContent);
      targets[i].textContent = '';
    }
    /* One caret, travelling ahead of the typed text. */
    var caret = document.createElement('span');
    caret.className = 'type-caret';
    caret.setAttribute('aria-hidden', 'true');
    title.insertBefore(caret, span);

    var chunks = splitPhrases(leadText);

    /* Type one phrase on its curve: character i of n sits at
       t = i/(n-1); the curve's output interpolates the per-character
       delay between MIN_DELAY and MAX_DELAY, with ±3ms jitter. */
    function typePhrase(node, text, curve, done) {
      var n = text.length;
      (function step(i) {
        if (i >= n) { done(); return; }
        var ch = text.charAt(i);
        node.data += ch;
        var t = n > 1 ? i / (n - 1) : 0;
        var wait = MIN_DELAY + (MAX_DELAY - MIN_DELAY) * curve(t) + (Math.random() * 6 - 3);
        setTimeout(function () { step(i + 1); }, wait);
      })(0);
    }

    function pauseAfter(text) {
      var trimmed = text.replace(/\s+$/, '');
      return trimmed.charAt(trimmed.length - 1) === '.' ? PAUSE_STOP : PAUSE_COMMA;
    }

    /* Phrase order → curve: the three opening beats run on ease;
       the bridge into the highlight runs on the sweep curve, so the
       rhythm hands off to the marker sweep without changing curve. */
    var curves = [CURVE_EASE, CURVE_EASE, CURVE_EASE, CURVE_SWEEP];

    setTimeout(function () {
      (function nextPhrase(i) {
        if (i >= chunks.length) {
          /* Final beat: the highlight phrase -- typed out plainly first
             (normal text colour, marker still held), so the words are
             read before the marker sweeps over them. Words are typed in
             sequence (one per highlight on narrow screens); the wrapper's
             fan-out staggers the sweeps. */
          (function typeWords(k) {
            if (k >= targets.length) {
              setTimeout(function () {
                if (caret.parentNode) caret.parentNode.removeChild(caret);
                span.dispatchEvent(new CustomEvent('highlight-sweep'));
                /* Page reveal once the sweep lands: the LAST word's marker
                   animationend is the exact finish (sweep + fan stagger),
                   with a safety timeout as backup. */
                var markers = span.querySelectorAll('.highlight__marker');
                var lastMarker = markers[markers.length - 1];
                if (lastMarker) lastMarker.addEventListener('animationend', revealPage, { once: true });
                setTimeout(revealPage, 2600);
              }, PAUSE_TYPED_TO_SWEEP);
              return;
            }
            var target = targets[k];
            target.appendChild(caret);
            var node = document.createTextNode('');
            target.insertBefore(node, caret);
            typePhrase(node, texts[k], CURVE_SWEEP, function () { typeWords(k + 1); });
          })(0);
          return;
        }
        typePhrase(leadNode, chunks[i], curves[i] || CURVE_EASE, function () {
          /* The final lead phrase skips its comma-pause -- the second
             sentence types on as one fluid arc, no rest before the
             highlight phrase. */
          if (i === chunks.length - 1) nextPhrase(i + 1);
          else setTimeout(function () { nextPhrase(i + 1); }, pauseAfter(chunks[i]));
        });
      })(0);
    }, START_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { begin(0); });
  } else {
    begin(0);
  }
})();
