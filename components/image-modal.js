/* ─────────────────────────────────────────
   IMAGE MODAL  (site-wide image zoom)
   Click a zoomable image → it morphs (shared-element FLIP) from its spot
   into a large centered view over a blurred backdrop. The enlarged image
   can be dragged: fling it or drag past a threshold to dismiss; a small
   drag springs back. Dragging tilts it slightly in 3D.

   Vanilla port of the framer-motion reference — no framework, no build.

   SELF-CONTAINED COMPONENT
   This file carries its own <style> (injected once, like theme.js), so it
   works on ANY page — just add:  <script src="components/image-modal.js">
   No stylesheet wiring needed.

   WHICH IMAGES ZOOM (opt-in, delegated so images added later are covered):
     • .cs-img / .cs-hero-img  — every case-study image, automatically
     • .zoomable               — add this class to ANY <img> anywhere else
                                 (portfolio pages, embeds, etc.) to opt in
   Delegated clicks mean no per-image wiring beyond the class.

   Esc / backdrop-click also close. Background scroll is locked while open.
   Honors prefers-reduced-motion: plain fade, no morph, no drag.
───────────────────────────────────────── */
(function () {
  'use strict';

  var SELECTOR = '.cs-img, .cs-hero-img, .zoomable';

  /* ── STYLES (injected once) ──
     Kept here so the component is drop-in on any page. Easing/radius are
     literals rather than tokens so it works on pages that don't define them. */
  var CSS =
    '.im-zoomable{cursor:zoom-in;}' +
    '.im-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.45);' +
      '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;' +
      'transition:opacity 0.24s ease-out;cursor:zoom-out;}' +
    '.im-backdrop.is-in{opacity:1;}' +
    '.im-stage{position:fixed;inset:0;z-index:1001;display:flex;align-items:center;' +
      'justify-content:center;padding:4vmin;perspective:1200px;pointer-events:none;}' +
    '.im-img{max-width:min(1100px,92vw);max-height:90vh;width:auto;height:auto;' +
      'display:block;border-radius:6px;box-shadow:0 24px 70px rgba(0,0,0,0.45);' +
      'user-select:none;-webkit-user-drag:none;pointer-events:auto;cursor:grab;' +
      'transform-origin:center center;will-change:transform;}' +
    '.im-img.is-in{transition:transform 0.34s cubic-bezier(0.22,1,0.36,1);}' +
    '.im-img.is-dragging{cursor:grabbing;}' +
    '.im-img.is-closing{transition:transform 0.34s cubic-bezier(0.22,1,0.36,1),' +
      'opacity 0.34s ease-out;}' +
    '@media (prefers-reduced-motion: reduce){' +
      '.im-img{opacity:0;transition:opacity 0.24s ease-out;cursor:default;}' +
      '.im-stage.is-in .im-img{opacity:1;}}';
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  /* Drag-to-dismiss tuning (mirrors the reference) */
  var DIST_THRESHOLD = 140;   // px dragged before release closes
  var VEL_THRESHOLD  = 0.9;   // px/ms flick speed that closes
  var TILT_MAX       = 2.5;   // deg of 3D tilt at full drag range
  var TILT_RANGE     = 300;   // px of drag mapped to full tilt

  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  var state = null;   // active modal, or null when closed

  /* ── OPEN ─────────────────────────────────────────── */
  function open(source) {
    if (state) return;

    var first = source.getBoundingClientRect();
    if (!first.width || !first.height) return;   // not laid out / hidden

    var radius = getComputedStyle(source).borderRadius || '6px';

    /* Backdrop — blurred, dark, click to close */
    var backdrop = document.createElement('div');
    backdrop.className = 'im-backdrop';

    /* Stage — fixed, centers the image; holds the 3D perspective */
    var stage = document.createElement('div');
    stage.className = 'im-stage';

    var img = document.createElement('img');
    img.className = 'im-img';
    img.src = source.currentSrc || source.src;
    img.alt = source.alt || '';
    img.draggable = false;
    img.style.borderRadius = radius;

    stage.appendChild(img);
    document.body.appendChild(backdrop);
    document.body.appendChild(stage);

    lockScroll(true);

    state = {
      source: source, backdrop: backdrop, stage: stage, img: img,
      drag: null, closing: false
    };

    backdrop.addEventListener('click', requestClose);
    if (!reduceMotion.matches) img.addEventListener('pointerdown', onPointerDown);

    if (reduceMotion.matches) {
      /* Plain fade — no morph, no drag tilt */
      requestAnimationFrame(function () {
        backdrop.classList.add('is-in');
        stage.classList.add('is-in');
      });
      return;
    }

    /* FLIP: measure the image at its final centered size, then invert the
       transform back onto the source thumbnail and play it forward. */
    source.style.visibility = 'hidden';           // the image "lifts off"

    function playFlip() {
      if (!state || state.closing) return;
      var last = img.getBoundingClientRect();
      if (!last.width) {                           // not sized yet — retry on load
        img.addEventListener('load', playFlip, { once: true });
        return;
      }
      var scale = first.width / last.width;
      var dx = (first.left + first.width / 2) - (last.left + last.width / 2);
      var dy = (first.top + first.height / 2) - (last.top + last.height / 2);

      img.style.transition = 'none';
      img.style.transform =
        'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
      void img.offsetWidth;                        // commit the start frame

      requestAnimationFrame(function () {
        backdrop.classList.add('is-in');
        img.style.transition = '';                 // CSS drives the morph
        img.classList.add('is-in');
        img.style.transform = '';
      });
    }
    playFlip();
  }

  /* ── CLOSE ────────────────────────────────────────── */
  /* Reverse morph back to the thumbnail (Esc / backdrop / tap). */
  function requestClose() {
    if (!state || state.closing) return;
    state.closing = true;
    var s = state;

    s.backdrop.classList.remove('is-in');

    if (reduceMotion.matches) {
      s.stage.classList.remove('is-in');
      s.stage.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 260);
      return;
    }

    var first = s.source.getBoundingClientRect();
    var cur = s.img.getBoundingClientRect();
    var scale = first.width / cur.width;
    var dx = (first.left + first.width / 2) - (cur.left + cur.width / 2);
    var dy = (first.top + first.height / 2) - (cur.top + cur.height / 2);

    s.img.style.transition = '';
    s.img.classList.add('is-closing');
    s.img.style.transform =
      'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
    s.img.style.opacity = '0';
    s.img.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 420);   // safety net if transitionend is missed
  }

  /* Fling out along the drag vector, then fade (used after a dismiss drag). */
  function flingClose(vx, vy, x, y) {
    if (!state || state.closing) return;
    state.closing = true;
    var s = state;
    s.backdrop.classList.remove('is-in');

    var outX = x + vx * 120;
    var outY = y + vy * 120;
    s.img.style.transition =
      'transform 0.22s cubic-bezier(0.4,0,1,1), opacity 0.22s ease-out';
    s.img.style.transform = 'translate(' + outX + 'px,' + outY + 'px)';
    s.img.style.opacity = '0';
    s.img.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 300);
  }

  var finished = false;
  function finish() {
    if (!state || finished) return;
    finished = true;
    var s = state;
    if (s.source) s.source.style.visibility = '';
    if (s.backdrop && s.backdrop.parentNode) s.backdrop.parentNode.removeChild(s.backdrop);
    if (s.stage && s.stage.parentNode) s.stage.parentNode.removeChild(s.stage);
    lockScroll(false);
    state = null;
    finished = false;
  }

  /* ── DRAG ─────────────────────────────────────────── */
  function onPointerDown(e) {
    if (!state || state.closing || e.button != null && e.button !== 0) return;
    var s = state;
    s.img.setPointerCapture(e.pointerId);
    s.img.style.transition = 'none';
    s.img.classList.add('is-dragging');
    s.drag = {
      id: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      x: 0, y: 0,
      lastX: e.clientX, lastY: e.clientY, lastT: performance.now(),
      vx: 0, vy: 0
    };
    s.img.addEventListener('pointermove', onPointerMove);
    s.img.addEventListener('pointerup', onPointerUp);
    s.img.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    var s = state;
    if (!s || !s.drag || e.pointerId !== s.drag.id) return;
    var d = s.drag;
    d.x = e.clientX - d.startX;
    d.y = e.clientY - d.startY;

    var now = performance.now();
    var dt = now - d.lastT;
    if (dt > 0) {
      d.vx = (e.clientX - d.lastX) / dt;
      d.vy = (e.clientY - d.lastY) / dt;
      d.lastX = e.clientX; d.lastY = e.clientY; d.lastT = now;
    }
    applyDrag(d.x, d.y);
  }

  function onPointerUp(e) {
    var s = state;
    if (!s || !s.drag || e.pointerId !== s.drag.id) return;
    var d = s.drag;
    s.drag = null;
    s.img.removeEventListener('pointermove', onPointerMove);
    s.img.removeEventListener('pointerup', onPointerUp);
    s.img.removeEventListener('pointercancel', onPointerUp);
    s.img.classList.remove('is-dragging');

    var far = Math.abs(d.x) > DIST_THRESHOLD || Math.abs(d.y) > DIST_THRESHOLD;
    var fast = Math.abs(d.vx) > VEL_THRESHOLD || Math.abs(d.vy) > VEL_THRESHOLD;

    if (far || fast) {
      flingClose(d.vx, d.vy, d.x, d.y);
    } else {
      /* Spring back to center */
      s.img.style.transition = 'transform 0.34s cubic-bezier(0.22,1,0.36,1)';
      s.img.style.transform = '';
    }
  }

  function applyDrag(x, y) {
    var s = state;
    if (!s) return;
    var rz = clamp(x / TILT_RANGE, -1, 1) * TILT_MAX;
    var rx = clamp(y / TILT_RANGE, -1, 1) * -TILT_MAX;
    s.img.style.transform =
      'translate(' + x + 'px,' + y + 'px) rotateZ(' + rz + 'deg) rotateX(' + rx + 'deg)';
  }

  /* ── HELPERS ──────────────────────────────────────── */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function lockScroll(on) {
    var b = document.body;
    if (on) {
      var sw = window.innerWidth - document.documentElement.clientWidth;
      b.dataset.imPrevOverflow = b.style.overflow;
      b.dataset.imPrevPad = b.style.paddingRight;
      b.style.overflow = 'hidden';
      if (sw > 0) b.style.paddingRight = sw + 'px';
    } else {
      b.style.overflow = b.dataset.imPrevOverflow || '';
      b.style.paddingRight = b.dataset.imPrevPad || '';
      delete b.dataset.imPrevOverflow;
      delete b.dataset.imPrevPad;
    }
  }

  /* ── WIRING ───────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    if (state) return;
    var img = e.target.closest && e.target.closest(SELECTOR);
    if (img) { e.preventDefault(); open(img); }
  });

  document.addEventListener('keydown', function (e) {
    if (state && !state.closing && e.key === 'Escape') requestClose();
  });

  /* Mark zoomable images so the cursor invites the click. */
  function tag() {
    var imgs = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < imgs.length; i++) imgs[i].classList.add('im-zoomable');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tag);
  } else {
    tag();
  }
})();
