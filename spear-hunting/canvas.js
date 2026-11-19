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

  function applyTransform(animate, duration) {
    var ms = duration || 700;
    world.style.transition = animate && !reduceMotion
      ? 'transform ' + ms + 'ms cubic-bezier(0.22, 1, 0.36, 1)'
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

  function flyToWorldPoint(worldX, worldY, targetScale, animate, duration) {
    var vw = canvas.clientWidth;
    var vh = canvas.clientHeight;
    scale = clamp(targetScale, MIN_SCALE, MAX_SCALE);
    tx = vw / 2 - worldX * scale;
    ty = vh / 2 - worldY * scale;
    applyTransform(animate, duration);
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

  /* Center and side-edge points of an element, in world space.
     Uses layout coordinates (offsetLeft etc), not screen rects:
     screen rects are mid-animation during camera flights, which
     would skew every measured landing point. */
  function rectToWorld(el) {
    var left = el.offsetLeft;
    var top = el.offsetTop;
    var width = el.offsetWidth;
    var height = el.offsetHeight;
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
    /* In record mode a node click toggles it into the slide's
       focus set instead of flying the camera. */
    if (recordMode) {
      toggleRecordFocus(el);
      return;
    }
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
    /* Record mode keys: capture, clear focus, copy, exit.
       Pan and zoom keys fall through to the normal handlers. */
    if (recordMode && !event.ctrlKey && !event.metaKey && !event.altKey) {
      var recordKey = event.key.toLowerCase();
      if (recordKey === 'n') { captureRecordSlide(); event.preventDefault(); return; }
      if (recordKey === 'c') { clearRecordFocus(); event.preventDefault(); return; }
      if (recordKey === 'p') { copyRecordDeck(); event.preventDefault(); return; }
      if (event.key === 'Escape') { exitRecordMode(); event.preventDefault(); return; }
    }
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
     Two ways to author a tour:

     1. A deck (preferred): a <script type="application/json"
        id="cv-tour-deck"> in the page holds an ordered list of
        slides — the PowerPoint model. A slide is one camera
        shot:
          focus     one element id, or an array to frame a
                    cluster (the union bounding box is fitted)
          zoom      camera scale, overriding the auto fit
          caption   narration line shown above the controls
          spotlight dim everything outside the focus
          slow      a longer, weightier camera move
          cam       { x, y, s } exact camera point in world
                    space, as captured by record mode; wins
                    over focus for framing (focus still drives
                    the highlight and spotlight)
          hold      keep the camera where it is; caption-only beat
     2. data-step attributes: one stop per element in numeric
        order — the fallback when no deck is present. */

  var tour = { playing: false, index: 0 };
  var tourButton = document.getElementById('cv-tour');
  var tourPrev = document.getElementById('cv-prev');
  var tourNext = document.getElementById('cv-next');
  var tourCount = document.getElementById('cv-tour-count');
  var tourControls = document.getElementById('cv-controls');
  var tourSlides = [];
  var tourCaption = null;

  function normalizeSlide(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var slide = {};
    if (raw.cam && typeof raw.cam.x === 'number' &&
        typeof raw.cam.y === 'number' && typeof raw.cam.s === 'number') {
      slide.cam = { x: raw.cam.x, y: raw.cam.y, s: raw.cam.s };
    }
    if (typeof raw.focus === 'string') {
      slide.focus = [raw.focus];
    } else if (Array.isArray(raw.focus)) {
      var ids = [];
      raw.focus.forEach(function (id) {
        if (typeof id === 'string') ids.push(id);
      });
      if (ids.length) slide.focus = ids;
    }
    if (typeof raw.caption === 'string') slide.caption = raw.caption;
    if (typeof raw.zoom === 'number') slide.zoom = raw.zoom;
    if (raw.spotlight) slide.spotlight = true;
    if (raw.slow) slide.slow = true;
    if (raw.hold) slide.hold = true;
    if (!slide.cam && !slide.focus && !slide.hold) return null;
    return slide;
  }

  function loadDeck() {
    var node = document.getElementById('cv-tour-deck');
    if (!node) return null;
    var slides = [];
    try {
      var data = JSON.parse(node.textContent);
      if (Array.isArray(data)) {
        data.forEach(function (raw) {
          var slide = normalizeSlide(raw);
          if (slide) slides.push(slide);
        });
      }
    } catch (err) {
      console.warn('cv-tour-deck: could not parse JSON', err);
    }
    return slides.length ? slides : null;
  }

  /* Fallback: a stop per data-step element, in numeric order. */
  function collectSteps() {
    var slides = [];
    Array.prototype.slice.call(world.querySelectorAll('[data-step]'))
      .sort(function (a, b) { return Number(a.dataset.step) - Number(b.dataset.step); })
      .forEach(function (el) {
        if (el.id) slides.push({ focus: [el.id], caption: '' });
      });
    return slides;
  }

  /* Bounding box of several elements, in world space. */
  function unionWorldRect(els) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    els.forEach(function (el) {
      var r = rectToWorld(el);
      minX = Math.min(minX, r.cx - r.w / 2);
      minY = Math.min(minY, r.cy - r.h / 2);
      maxX = Math.max(maxX, r.cx + r.w / 2);
      maxY = Math.max(maxY, r.cy + r.h / 2);
    });
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: maxX - minX,
      h: maxY - minY
    };
  }

  function ensureCaption() {
    if (tourCaption) return tourCaption;
    tourCaption = document.createElement('div');
    tourCaption.className = 'cv-tour-caption';
    tourCaption.hidden = true;
    document.body.appendChild(tourCaption);
    return tourCaption;
  }

  function setTourCaption(text) {
    var el = ensureCaption();
    el.textContent = text;
    el.hidden = !(tour.playing && text);
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
    if (tourCount) tourCount.textContent = (tour.index + 1) + ' / ' + tourSlides.length;
    if (tourPrev) tourPrev.disabled = !tour.playing || tour.index <= 0;
    if (tourNext) tourNext.disabled = !tour.playing || tour.index >= tourSlides.length - 1;
  }

  function tourShow(index) {
    tour.index = clamp(index, 0, Math.max(0, tourSlides.length - 1));
    var slide = tourSlides[tour.index];
    if (!slide) { stopTour(); return; }

    var els = [];
    (slide.focus || []).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) els.push(el);
    });
    world.querySelectorAll('.is-tour-target').forEach(function (n) { n.classList.remove('is-tour-target'); });
    els.forEach(function (el) { el.classList.add('is-tour-target'); });
    world.classList.toggle('is-spotlight', Boolean(slide.spotlight && els.length));

    var duration = slide.slow ? 1400 : 700;
    if (slide.cam && !slide.hold) {
      flyToWorldPoint(slide.cam.x, slide.cam.y, slide.cam.s, true, duration);
    } else if (els.length && !slide.hold) {
      var r = els.length === 1 ? rectToWorld(els[0]) : unionWorldRect(els);
      var zoom;
      if (typeof slide.zoom === 'number') {
        zoom = slide.zoom;
      } else if (els.length === 1) {
        /* Tall cards need a zoom that fits their height too, or
           the camera lands inside a dark crop and pins float on
           black. */
        zoom = clamp(Math.min(
          900 / Math.max(r.w, 640),
          640 / Math.max(r.h, 1)
        ), 0.4, 1.1);
      } else {
        /* Clusters: fit the whole union with breathing room. */
        zoom = clamp(Math.min(
          canvas.clientWidth / (r.w * 1.3),
          canvas.clientHeight / (r.h * 1.3)
        ), MIN_SCALE, 1.1);
      }
      flyToWorldPoint(r.cx, r.cy, zoom, true, duration);
    }

    setTourCaption(slide.caption || '');
    updateTourUi();
  }

  function startTour() {
    if (!tourSlides.length) return;
    tour.playing = true;
    tourShow(0);
  }

  function stopTour() {
    tour.playing = false;
    world.querySelectorAll('.is-tour-target').forEach(function (n) { n.classList.remove('is-tour-target'); });
    world.classList.remove('is-spotlight');
    if (tourCaption) tourCaption.hidden = true;
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

  /* ── Tour record mode ─────────────────────────────────────
     Author a deck by performing it. Open the page with
     #tour-record appended to the URL, then:
       - pan and zoom the canvas to frame the shot
       - click nodes to add them to the focus set (they get the
         spotlight and the highlight ring); click again to drop
         one, C to drop all
       - press N to capture the framed shot as the next slide
       - press P (or Copy deck) to copy the finished JSON, and
         paste it into the page as the cv-tour-deck script
       - Esc exits record mode
     Slides capture the exact camera (cam), so what you framed
     is what the viewer sees. Captions and flags like slow can
     be added by hand afterwards. */

  var recordMode = false;
  var recordFocus = [];
  var recordSlides = [];
  var recordPanel = null;
  var recordStatusTimer = null;

  function enterRecordMode() {
    if (recordMode) return;
    recordMode = true;
    buildRecordPanel();
  }

  function exitRecordMode() {
    if (!recordMode) return;
    recordMode = false;
    if (recordPanel) {
      recordPanel.parentNode.removeChild(recordPanel);
      recordPanel = null;
    }
    clearRecordFocus();
    if (history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function buildRecordPanel() {
    recordPanel = document.createElement('div');
    recordPanel.className = 'cv-record';

    var bar = document.createElement('div');
    bar.className = 'cv-record-bar';

    var title = document.createElement('span');
    title.className = 'cv-record-title';
    title.textContent = 'Tour recorder';

    var hint = document.createElement('span');
    hint.className = 'cv-record-hint';
    hint.textContent = 'Frame a shot · click nodes to spotlight · N capture · C clear · P copy';

    var status = document.createElement('span');
    status.className = 'cv-record-status';
    status.id = 'cv-record-status';
    status.textContent = '0 slides';

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'cv-record-copy';
    copy.textContent = 'Copy deck';
    copy.addEventListener('click', function () { copyRecordDeck(); });

    bar.appendChild(title);
    bar.appendChild(hint);
    bar.appendChild(status);
    bar.appendChild(copy);

    var json = document.createElement('textarea');
    json.className = 'cv-record-json';
    json.id = 'cv-record-json';
    json.readOnly = true;
    json.spellcheck = false;
    json.value = '// Press N to capture the first slide';

    recordPanel.appendChild(bar);
    recordPanel.appendChild(json);
    document.body.appendChild(recordPanel);
  }

  function recordDeckJson() {
    return JSON.stringify(recordSlides, null, 2);
  }

  function refreshRecordJson() {
    var json = document.getElementById('cv-record-json');
    var status = document.getElementById('cv-record-status');
    if (json) {
      json.value = recordSlides.length
        ? recordDeckJson()
        : '// Press N to capture the first slide';
    }
    if (status) {
      status.textContent = recordSlides.length +
        (recordSlides.length === 1 ? ' slide' : ' slides');
    }
  }

  function flashRecordStatus(text) {
    var status = document.getElementById('cv-record-status');
    if (!status) return;
    status.textContent = text;
    clearTimeout(recordStatusTimer);
    recordStatusTimer = setTimeout(refreshRecordJson, 2200);
  }

  function captureRecordSlide() {
    var vw = canvas.clientWidth;
    var vh = canvas.clientHeight;
    var slide = {
      cam: {
        x: Math.round((vw / 2 - tx) / scale),
        y: Math.round((vh / 2 - ty) / scale),
        s: Math.round(scale * 100) / 100
      }
    };
    if (recordFocus.length) {
      slide.focus = recordFocus.length === 1 ? recordFocus[0] : recordFocus.slice();
      slide.spotlight = true;
    }
    recordSlides.push(slide);
    refreshRecordJson();
    flashRecordStatus('Slide ' + recordSlides.length + ' captured');
  }

  function copyRecordDeck() {
    if (!recordSlides.length) return;
    var text = recordDeckJson();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { flashRecordStatus('Deck copied — paste into the page'); },
        function () { fallbackCopyRecord(text); flashRecordStatus('Deck copied — paste into the page'); }
      );
    } else {
      fallbackCopyRecord(text);
      flashRecordStatus('Deck copied — paste into the page');
    }
  }

  function fallbackCopyRecord(text) {
    var json = document.getElementById('cv-record-json');
    if (!json) return;
    json.readOnly = false;
    json.select();
    try { document.execCommand('copy'); } catch (err) { /* ignore */ }
    json.readOnly = true;
  }

  function toggleRecordFocus(el) {
    if (!el.id) return;
    var i = recordFocus.indexOf(el.id);
    if (i === -1) {
      recordFocus.push(el.id);
      el.classList.add('is-record-focus');
    } else {
      recordFocus.splice(i, 1);
      el.classList.remove('is-record-focus');
    }
  }

  function clearRecordFocus() {
    recordFocus = [];
    world.querySelectorAll('.is-record-focus').forEach(function (n) {
      n.classList.remove('is-record-focus');
    });
  }

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
      /* Cap the stagger: big boards must not wait seconds. */
      item.style.setProperty('--d', Math.min(step * 70, 800) + 'ms');
    });
    world.classList.add('is-ready');
    /* Once the entrance has settled, drop the stagger delays so
       later opacity changes (the tour spotlight) transition
       immediately instead of waiting out the entrance order. */
    setTimeout(function () {
      items.forEach(function (item) { item.style.setProperty('--d', '0ms'); });
    }, 3400);
  }

  function boot() {
    tourSlides = loadDeck() || collectSteps();
    /* Big boards can ask for a landing view: data-cv-focus on
       the canvas names an element the camera centres on at
       boot, instead of fitting the whole world. A shared link
       can pick its own landing with #focus=<element-id>, which
       wins over the page default. */
    var focusId = canvas.getAttribute('data-cv-focus');
    var hashFocus = (window.location.hash || '').match(/focus=([A-Za-z0-9_-]+)/);
    if (hashFocus && document.getElementById(hashFocus[1])) {
      focusId = hashFocus[1];
    }
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
    /* Record mode: open the page with #tour-record appended. */
    if ((window.location.hash || '').indexOf('tour-record') !== -1) {
      enterRecordMode();
    }
    drawWires();
    buildMinimap();
    staggerEntrance();
    applyTransform(false);
  }

  /* Re-focus when the hash changes without a reload, so in-page
     links and pasted hash URLs both retarget the camera. Also
     lets record mode start from a hash appended mid-session. */
  window.addEventListener('hashchange', function () {
    if ((window.location.hash || '').indexOf('tour-record') !== -1) {
      enterRecordMode();
    }
    var m = (window.location.hash || '').match(/focus=([A-Za-z0-9_-]+)/);
    if (!m) return;
    var el = document.getElementById(m[1]);
    if (!el) return;
    var r = rectToWorld(el);
    var s = clamp(Math.min(
      canvas.clientWidth / (r.w * 2.2),
      canvas.clientHeight / (r.h * 1.5)
    ), MIN_SCALE, 1);
    flyToWorldPoint(r.cx, r.cy, s, true);
  });

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
