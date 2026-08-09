/* ─────────────────────────────────────────
   TOOLTIP COMPONENT
   A small, reusable tooltip primitive. Ported from the
   interactionkit.org/demo/tooltip pattern (React + Framer
   Motion) to vanilla so it fits this site's chrome.

   Usage — add attributes to any element, then load this script:
     <span data-tooltip="PT national · open to relocation">Lisbon</span>
     <span data-tooltip="…" data-tooltip-side="right">…</span>

   Behaviour:
     • shows on mouseenter / focus, hides on mouseleave / blur
     • an 80ms CLOSE_DELAY prevents flicker on quick exits
     • Escape dismisses while hovered/focused
     • sides: bottom (default), left, right — centered on the trigger
     • spring-eased enter/exit (opacity 180ms; scale + translate +
       blur 220ms, cubic-bezier(0.16, 1, 0.3, 1)), reversed on exit
     • honours prefers-reduced-motion (fade only, no movement/blur)

   Fixed dark pill: a floating tooltip reads best as a consistent
   dark surface in BOTH light and dark modes — theming it to the
   light palette turned it into an orange chip, so the colours are
   deliberately fixed (only the font-size token is inherited).

   Hover affordance: every trigger gets a dotted underline (25% mix
   of --color-text at rest, brightening to --color-primary on
   hover/focus) plus a help cursor, so the text reads as hoverable
   before the tooltip ever opens. Dotted rather than solid so it
   can't be mistaken for a real link (solid underline) or for the
   [data-highlight] marker. Chosen over color/glyph alternatives in
   playground/hover-affordance.html on the `playground` branch.

   Load it like the other chrome components:
     <script src="components/tooltip.js"></script>
───────────────────────────────────────── */
(function () {
  var CLOSE_DELAY = 80; /* ms — matches interactionkit, kills flicker */
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var uid = 0;

  /* Styles, injected once. Token-driven so it adapts to the theme;
     easing/durations are literal so it works on pages that don't
     define motion vars. */
  var style = document.createElement('style');
  style.textContent =
    '.b-tt-anchor{position:relative;display:inline-block;' +
    'text-decoration:underline dotted;' +
    'text-decoration-color:color-mix(in srgb, var(--color-text) 25%, transparent);' +
    'text-underline-offset:3px;text-decoration-thickness:1px;' +
    'cursor:help;transition:text-decoration-color 120ms ease;}' +
    '.b-tt-anchor:hover,.b-tt-anchor:focus-visible{' +
    'text-decoration-color:var(--color-primary);}' +

    '.b-tt{position:absolute;z-index:30;pointer-events:none;' +
    'max-width:260px;width:max-content;' +
    'padding:var(--sp-2, 8px) var(--sp-3, 12px);' +
    'border-radius:8px;border:1px solid rgba(248, 246, 238, 0.12);' +
    'background:#1E1D1A;' +
    'color:#F8F6EE;' +
    'font-family:var(--font-body, sans-serif);' +
    'font-size:var(--text-xs, 12px);font-weight:400;' +
    'font-style:normal;text-transform:none;' +
    'letter-spacing:normal;text-align:left;line-height:1.35;' +
    'box-shadow:0 8px 24px -6px rgba(0,0,0,0.35),' +
    '0 2px 6px -2px rgba(0,0,0,0.25);' +
    'opacity:0;filter:blur(3px);' +
    'transition:opacity 180ms ' + EASE + ',' +
    'transform 220ms ' + EASE + ',filter 220ms ' + EASE + ';}' +

    /* bottom (default) — below trigger, centered, grows down */
    '.b-tt--bottom{top:100%;left:50%;margin-top:10px;' +
    'transform-origin:top center;' +
    'transform:translateX(-50%) translateY(-4px) scale(0.96);}' +
    '.b-tt--bottom.is-open{transform:translateX(-50%) translateY(0) scale(1);}' +

    /* left — left of trigger, vertically centered */
    '.b-tt--left{right:100%;top:50%;margin-right:10px;' +
    'transform-origin:center right;' +
    'transform:translateY(-50%) translateX(4px) scale(0.96);}' +
    '.b-tt--left.is-open{transform:translateY(-50%) translateX(0) scale(1);}' +

    /* right — right of trigger, vertically centered */
    '.b-tt--right{left:100%;top:50%;margin-left:10px;' +
    'transform-origin:center left;' +
    'transform:translateY(-50%) translateX(-4px) scale(0.96);}' +
    '.b-tt--right.is-open{transform:translateY(-50%) translateX(0) scale(1);}' +

    '.b-tt.is-open{opacity:1;filter:blur(0);}' +

    '@media (prefers-reduced-motion: reduce){' +
    '.b-tt{filter:none;transition:opacity 120ms ease;}' +
    '.b-tt--bottom{transform:translateX(-50%);}' +
    '.b-tt--bottom.is-open{transform:translateX(-50%);}' +
    '.b-tt--left,.b-tt--right{transform:translateY(-50%);}' +
    '.b-tt--left.is-open,.b-tt--right.is-open{transform:translateY(-50%);}}';
  (document.head || document.documentElement).appendChild(style);

  function initTrigger(trigger) {
    if (trigger.__ttInit) return;
    trigger.__ttInit = true;

    var text = trigger.getAttribute('data-tooltip');
    if (!text) return;
    var side = trigger.getAttribute('data-tooltip-side') || 'bottom';
    if (side !== 'left' && side !== 'right') side = 'bottom';

    trigger.classList.add('b-tt-anchor');
    if (!trigger.hasAttribute('tabindex')) trigger.setAttribute('tabindex', '0');

    var tip = document.createElement('span');
    tip.className = 'b-tt b-tt--' + side;
    tip.setAttribute('role', 'tooltip');
    tip.id = 'b-tt-' + (++uid);
    tip.textContent = text;
    trigger.appendChild(tip);
    trigger.setAttribute('aria-describedby', tip.id);

    var closeTimer;

    function open() {
      clearTimeout(closeTimer);
      tip.classList.add('is-open');
    }
    function close(immediate) {
      clearTimeout(closeTimer);
      if (immediate) { tip.classList.remove('is-open'); return; }
      closeTimer = setTimeout(function () {
        tip.classList.remove('is-open');
      }, CLOSE_DELAY);
    }

    trigger.addEventListener('mouseenter', open);
    trigger.addEventListener('mouseleave', function () { close(); });
    trigger.addEventListener('focus', open);
    trigger.addEventListener('blur', function () { close(true); });
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') close(true);
    });
  }

  function mount() {
    var nodes = document.querySelectorAll('[data-tooltip]');
    for (var i = 0; i < nodes.length; i++) initTrigger(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
