/* Canvas engine for spear hunting canvas pages.
   Pairs with /spear-hunting/canvas.css.

   The page stays a plain HTML file: cards carry --x/--y/--r
   and data-step, and this script supplies the Miro style
   behaviour:
     - drag or scroll to pan, pinch or ctrl/cmd + scroll to zoom
     - zoom buttons, fit button, keyboard (+ - = 0, arrows)
     - dashed wires between cards via data-connect="a > b, c > d"
     - minimap with a live viewport rectangle
     - a guided tour that flies the camera through data-step order */

(function () {
  'use strict';

  var canvas = document.getElementById('cv-canvas');
  var world = document.getElementById('cv-world');
  if (!canvas || !world) return;

  var MIN_SCALE = 0.2;
  var MAX_SCALE = 2.5;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Camera state: screen = world * scale + tx,ty */
  var tx = 0;
  var ty = 0;
  var scale = 1;

  /* ── Helpers ─────────────────────────────────────────────── */

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyTransform(animate) {
    world.style.transition = animate && !reduceMotion
      ? 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)'
      : 'none';
    world.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
    canvas.style.setProperty('--cv-dot-size', (34 * scale) + 'px');
    canvas.style.setProperty('--cv-dot-x', tx + 'px');
    canvas.style.setProperty('--cv-dot-y', ty + 'px');
    updateZoomLabel();
    updateMinimapViewport();
  }

  function updateZoomLabel() {
    var label = document.getElementById('cv-zoom-label');
    if (label) label.textContent = Math.round(scale * 100) + '%';
  }

  /* Bounds of every card in world coordinates. */
  function getWorldBounds() {
    var items = world.querySelectorAll('.cv-card, .cv-sticky, .cv-chip');
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    items.forEach(function (item) {
      var pad = Math.max(item.offsetWidth, item.offsetHeight) * 0.12 + 24;
      var x = item.offsetLeft - pad;
      var y = item.offsetTop - pad;
      var w = item.offsetWidth + pad * 2;
      var h = item.offsetHeight + pad * 2;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    if (!isFinite(minX)) return { x: 0, y: 0, w: 1000, h: 800 };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function fitView(animate) {
    var bounds = getWorldBounds();
    var vw = canvas.clientWidth;
    var vh = canvas.clientHeight;
    var target = clamp(Math.min(vw / bounds.w, vh / bounds.h), MIN_SCALE, 1.1);
    scale = target;
    /* Nudge the view down so the floating header pill does not
       sit on top of the first card. */
    tx = vw / 2 - (bounds.x + bounds.w / 2) * scale;
    ty = vh / 2 + 48 - (bounds.y + bounds.h / 2) * scale;
    applyTransform(animate);
  }

  function zoomAt(screenX, screenY, factor, animate) {
    var next = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
    var ratio = next / scale;
    tx = screenX - (screenX - tx) * ratio;
    ty = screenY - (screenY - ty) * ratio;
    scale = next;
    applyTransform(animate);
  }

  function flyToWorldPoint(worldX, worldY, targetScale, animate) {
    var vw = canvas.clientWidth;
    var vh = canvas.clientHeight;
    scale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
    tx = vw / 2 - worldX * scale;
    ty = vh / 2 - worldY * scale;
    applyTransform(animate);
  }

  /* ── Wires ───────────────────────────────────────────────── */

  function drawWires() {
    var svg = document.getElementById('cv-wires');
    if (!svg) return;
    var spec = svg.getAttribute('data-connect') || '';
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    spec.split(',').forEach(function (pair) {
      var parts = pair.split('>');
      if (parts.length !== 2) return;
      var from = document.getElementById(parts[0].trim());
      var to = document.getElementById(parts[1].trim());
      if (!from || !to) return;

      var a = rectToWorld(from);
      var b = rectToWorld(to);
      /* Pick the facing edges: right side of the leftmost card to
         the left side of the rightmost card. */
      var aEdge = a.cx <= b.cx ? a.right : a.left;
      var bEdge = b.cx >= a.cx ? b.left : b.right;
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', aEdge.x);
      line.setAttribute('y1', aEdge.y);
      line.setAttribute('x2', bEdge.x);
      line.setAttribute('y2', bEdge.y);
      svg.appendChild(line);
    });
  }

  /* Center and side-edge points of an element, in world space. */
  function rectToWorld(el) {
    var r = el.getBoundingClientRect();
    var c = canvas.getBoundingClientRect();
    var left = (r.left - c.left - tx) / scale;
    var top = (r.top - c.top - ty) / scale;
    var width = r.width / scale;
    var height = r.height / scale;
    return {
      left: { x: left, y: top + height / 2 },
      right: { x: left + width, y: top + height / 2 },
      cx: left + width / 2,
      cy: top + height / 2,
      w: width,
      h: height
    };
  }

  /* ── Minimap ─────────────────────────────────────────────── */

  var minimap = document.getElementById('cv-minimap');
  var minimapCards = document.getElementById('cv-minimap-cards');
  var minimapViewport = document.getElementById('cv-minimap-viewport');
  var minimapBox = null;

  function buildMinimap() {
    if (!minimap || !minimapCards) return;
    while (minimapCards.firstChild) minimapCards.removeChild(minimapCards.firstChild);
    var bounds = getWorldBounds();
    var box = minimap.getBoundingClientRect();
    var pad = 8;
    var usableW = box.width - pad * 2;
    var usableH = box.height - pad * 2;
    var k = Math.min(usableW / bounds.w, usableH / bounds.h);
    var offsetX = pad + (usableW - bounds.w * k) / 2;
    var offsetY = pad + (usableH - bounds.h * k) / 2;
    minimapBox = { bounds: bounds, k: k, offsetX: offsetX, offsetY: offsetY };

    world.querySelectorAll('.cv-card, .cv-sticky, .cv-chip').forEach(function (item) {
      var dot = document.createElement('div');
      dot.className = 'cv-minimap-card' + (item.dataset.step ? ' is-step' : '');
      dot.style.left = (offsetX + (item.offsetLeft - bounds.x) * k) + 'px';
      dot.style.top = (offsetY + (item.offsetTop - bounds.y) * k) + 'px';
      dot.style.width = Math.max(4, item.offsetWidth * k) + 'px';
      dot.style.height = Math.max(3, item.offsetHeight * k) + 'px';
      minimapCards.appendChild(dot);
    });
    updateMinimapViewport();
  }

  function updateMinimapViewport() {
    if (!minimapViewport || !minimapBox) return;
    var b = minimapBox;
    var left = b.offsetX + ((-tx) / scale - b.bounds.x) * b.k;
    var top = b.offsetY + ((-ty) / scale - b.bounds.y) * b.k;
    var w = (canvas.clientWidth / scale) * b.k;
    var h = (canvas.clientHeight / scale) * b.k;
    minimapViewport.style.left = left + 'px';
    minimapViewport.style.top = top + 'px';
    minimapViewport.style.width = Math.max(6, w) + 'px';
    minimapViewport.style.height = Math.max(6, h) + 'px';
  }

  function minimapJump(clientX, clientY) {
    if (!minimapBox) return;
    var b = minimapBox;
    var rect = minimap.getBoundingClientRect();
    var wx = b.bounds.x + (clientX - rect.left - b.offsetX) / b.k;
    var wy = b.bounds.y + (clientY - rect.top - b.offsetY) / b.k;
    flyToWorldPoint(wx, wy, scale, false);
  }

  if (minimap) {
    var minimapDragging = false;
    minimap.addEventListener('pointerdown', function (event) {
      minimapDragging = true;
      minimap.setPointerCapture(event.pointerId);
      minimapJump(event.clientX, event.clientY);
    });
    minimap.addEventListener('pointermove', function (event) {
      if (minimapDragging) minimapJump(event.clientX, event.clientY);
    });
    minimap.addEventListener('pointerup', function () { minimapDragging = false; });
  }

  /* ── Pan (drag) ──────────────────────────────────────────── */

  var pointers = new Map();
  var panState = null;
  var pinchState = null;

  function isPanTarget(target) {
    if (target.closest('.cv-topbar, .cv-controls, .cv-minimap')) return false;
    /* Cards stay clickable; background and chrome pans the canvas.
       Space + drag pans from anywhere. */
    return !target.closest('.cv-card, .cv-sticky') || spaceDown;
  }

  var spaceDown = false;
  window.addEventListener('keydown', function (event) {
    if (event.code === 'Space') spaceDown = true;
  });
  window.addEventListener('keyup', function (event) {
    if (event.code === 'Space') spaceDown = false;
  });

  canvas.addEventListener('pointerdown', function (event) {
    if (event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      clickCandidate = null;
      pinchState = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
        scale: scale,
        tx: tx,
        ty: ty
      };
      panState = null;
      return;
    }
    if (!isPanTarget(event.target)) return;
    panState = { x: event.clientX, y: event.clientY, tx: tx, ty: ty };
    canvas.classList.add('is-panning');
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', function (event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchState) {
      var pts = Array.from(pointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var midX = (pts[0].x + pts[1].x) / 2;
      var midY = (pts[0].y + pts[1].y) / 2;
      var c = canvas.getBoundingClientRect();
      var factor = clamp(pinchState.scale * (dist / pinchState.dist), MIN_SCALE, MAX_SCALE) / pinchState.scale;
      var next = clamp(pinchState.scale * factor, MIN_SCALE, MAX_SCALE);
      var ratio = next / pinchState.scale;
      scale = next;
      tx = (midX - c.left) - ((midX - c.left) - pinchState.tx) * ratio;
      ty = (midY - c.top) - ((midY - c.top) - pinchState.ty) * ratio;
      applyTransform(false);
      return;
    }

    if (panState) {
      tx = panState.tx + (event.clientX - panState.x);
      ty = panState.ty + (event.clientY - panState.y);
      applyTransform(false);
    }
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchState = null;
    if (pointers.size === 0) {
      panState = null;
      canvas.classList.remove('is-panning');
    }
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  /* ── Click a node: the camera centres on it ────────────────
     A plain click (no drag, not on a link or button) on any
     card or sticky zooms the camera in, centring that node.
     Drag still pans from the background, Space + drag pans
     from anywhere. */
  var clickCandidate = null;

  canvas.addEventListener('pointerdown', function (event) {
    clickCandidate = null;
    if (event.button !== 0 || pointers.size !== 1) return;
    var card = event.target.closest('.cv-card, .cv-sticky, .cv-chip');
    if (!card) return;
    if (event.target.closest('a, button, input, textarea, select, .cv-pin, .cv-callout')) return;
    clickCandidate = { el: card, x: event.clientX, y: event.clientY };
  });

  canvas.addEventListener('pointerup', function (event) {
    if (!clickCandidate) return;
    var el = clickCandidate.el;
    var moved = Math.hypot(event.clientX - clickCandidate.x, event.clientY - clickCandidate.y);
    clickCandidate = null;
    if (moved > 6 || pointers.size > 0) return;
    var r = rectToWorld(el);
    var s = clamp(Math.min(
      canvas.clientWidth / (r.w * 1.35),
      canvas.clientHeight / (r.h * 1.35)
    ), MIN_SCALE, 1.25);
    flyToWorldPoint(r.cx, r.cy, s, true);
  });

  /* ── Wheel: scroll pans, ctrl/cmd zooms ──────────────────── */

  canvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      var rect = canvas.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * 0.0022), false);
      return;
    }
    tx -= event.deltaX;
    ty -= event.deltaY;
    applyTransform(false);
  }, { passive: false });

  /* ── Controls ────────────────────────────────────────────── */

  function bindButton(id, handler) {
    var button = document.getElementById(id);
    if (button) button.addEventListener('click', handler);
  }

  bindButton('cv-zoom-in', function () {
    zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2, true);
  });
  bindButton('cv-zoom-out', function () {
    zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.2, true);
  });
  bindButton('cv-fit', function () {
    fitView(true);
  });

  /* ── Keyboard ──────────────────────────────────────────────
     Global, so keys work without focusing the canvas first.
     Control buttons hand focus to the canvas on handled keys,
     so arrow keys never get stuck cycling through the buttons
     themselves. */

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  window.addEventListener('keydown', function (event) {
    if (isEditableTarget(event.target)) return;
    var active = document.activeElement;
    var inChrome = active && active !== document.body && active.closest &&
      active.closest('.cv-controls, .cv-minimap, .cv-topbar');
    var handled = true;
    var step = 80 / scale;
    if (tour.playing && event.key === 'ArrowRight') nextStep();
    else if (tour.playing && event.key === 'ArrowLeft') prevStep();
    else if (event.key === 'ArrowLeft') tx += step;
    else if (event.key === 'ArrowRight') tx -= step;
    else if (event.key === 'ArrowUp') ty += step;
    else if (event.key === 'ArrowDown') ty -= step;
    else if (event.key === '+' || event.key === '=') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2, true);
    else if (event.key === '-') zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.2, true);
    else if (event.key === '0') fitView(true);
    else if (event.key === 'Escape') { if (tour.playing) stopTour(); else handled = false; }
    else handled = false;
    if (handled) {
      event.preventDefault();
      if (inChrome) canvas.focus({ preventScroll: true });
      if (event.key.startsWith('Arrow') && !tour.playing) {
        applyTransform(false);
      }
    }
  });

  /* ── Guided tour ───────────────────────────────────────────
     Manual mode: click Tour to enter, then step with the
     prev and next buttons or the left and right arrow keys.
     Click again (Exit) or press Escape to leave. */

  var tour = { playing: false, index: 0 };
  var tourButton = document.getElementById('cv-tour');
  var tourPrev = document.getElementById('cv-prev');
  var tourNext = document.getElementById('cv-next');
  var tourCount = document.getElementById('cv-tour-count');
  var tourControls = document.getElementById('cv-controls');
  var tourSteps = [];

  function collectSteps() {
    tourSteps = Array.from(world.querySelectorAll('[data-step]'))
      .filter(function (el) { return el.dataset.step; })
      .sort(function (a, b) { return Number(a.dataset.step) - Number(b.dataset.step); });
  }

  function updateTourUi() {
    if (!tourButton) return;
    var icon = tourButton.querySelector('.material-symbols-rounded');
    var label = tourButton.querySelector('.cv-btn-tour-label');
    if (icon) icon.textContent = tour.playing ? 'close' : 'play_arrow';
    if (label) label.textContent = tour.playing ? 'Exit' : 'Tour';
    tourButton.classList.toggle('is-playing', tour.playing);
    tourButton.setAttribute('aria-label', tour.playing ? 'Exit the guided tour' : 'Play the guided tour');
    if (tourControls) tourControls.classList.toggle('is-touring', tour.playing);
    if (tourCount) tourCount.textContent = (tour.index + 1) + ' / ' + tourSteps.length;
    if (tourPrev) tourPrev.disabled = !tour.playing || tour.index <= 0;
    if (tourNext) tourNext.disabled = !tour.playing || tour.index >= tourSteps.length - 1;
  }

  function tourShow(index) {
    tour.index = clamp(index, 0, Math.max(0, tourSteps.length - 1));
    var el = tourSteps[tour.index];
    if (!el) { stopTour(); return; }
    world.querySelectorAll('.is-tour-target').forEach(function (n) { n.classList.remove('is-tour-target'); });
    el.classList.add('is-tour-target');
    var r = rectToWorld(el);
    var zoom = clamp(1.0 * (900 / Math.max(r.w, 640)), 0.5, 1.1);
    flyToWorldPoint(r.cx, r.cy, zoom, true);
    updateTourUi();
  }

  function startTour() {
    if (!tourSteps.length) return;
    tour.playing = true;
    tourShow(0);
  }

  function stopTour() {
    tour.playing = false;
    world.querySelectorAll('.is-tour-target').forEach(function (n) { n.classList.remove('is-tour-target'); });
    updateTourUi();
    fitView(true);
  }

  function nextStep() {
    if (tour.playing) tourShow(tour.index + 1);
  }

  function prevStep() {
    if (tour.playing) tourShow(tour.index - 1);
  }

  if (tourButton) {
    tourButton.addEventListener('click', function () {
      if (tour.playing) stopTour();
      else startTour();
      canvas.focus({ preventScroll: true });
    });
  }
  if (tourPrev) tourPrev.addEventListener('click', function () { prevStep(); canvas.focus({ preventScroll: true }); });
  if (tourNext) tourNext.addEventListener('click', function () { nextStep(); canvas.focus({ preventScroll: true }); });

  /* ── Skin switcher (template demo only) ──────────────────── */

  var SKINS = ['signal', 'acid'];
  var skinButtons = Array.prototype.slice.call(
    document.querySelectorAll('[data-cv-skin-option]')
  );

  function setSkin(name) {
    if (SKINS.indexOf(name) === -1) return;
    document.body.dataset.cvSkin = name;
    skinButtons.forEach(function (button) {
      var active = button.getAttribute('data-cv-skin-option') === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    try { localStorage.setItem('cv-skin', name); } catch (e) { /* ignore */ }
  }

  skinButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setSkin(button.getAttribute('data-cv-skin-option'));
    });
  });

  (function initSkin() {
    var saved = null;
    try { saved = localStorage.getItem('cv-skin'); } catch (e) { /* ignore */ }
    setSkin(saved && SKINS.indexOf(saved) !== -1 ? saved : 'signal');
  })();

  /* ── Boot ────────────────────────────────────────────────── */

  function staggerEntrance() {
    var items = world.querySelectorAll('.cv-card, .cv-sticky, .cv-chip');
    items.forEach(function (item) {
      var step = Number(item.dataset.step || 0);
      item.style.setProperty('--d', (step ? step * 70 : 200) + 'ms');
    });
    world.classList.add('is-ready');
  }

  function boot() {
    collectSteps();
    /* Big boards can ask for a landing view: data-cv-focus on
       the canvas names an element the camera centres on at
       boot, instead of fitting the whole world. */
    var focusId = canvas.getAttribute('data-cv-focus');
    var focusEl = focusId ? document.getElementById(focusId) : null;
    if (focusEl) {
      var r = rectToWorld(focusEl);
      var s = clamp(Math.min(
        canvas.clientWidth / (r.w * 2.2),
        canvas.clientHeight / (r.h * 1.5)
      ), MIN_SCALE, 1);
      flyToWorldPoint(r.cx, r.cy, s, false);
    } else {
      fitView(false);
    }
    drawWires();
    buildMinimap();
    staggerEntrance();
    applyTransform(false);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      drawWires();
      buildMinimap();
      updateMinimapViewport();
    }, 150);
  });

  /* Re-measure once fonts settle so wires and bounds are right. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      drawWires();
      buildMinimap();
      updateMinimapViewport();
    });
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
