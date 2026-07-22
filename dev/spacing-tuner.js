/* ─────────────────────────────────────────
   SPACING DIAL KIT — dev-only, case-study vertical rhythm
   ---------------------------------------------------------------
   A disposable in-browser tuner for the case-study rhythm. Unlike a
   token tuner (one knob = every gap of that role), this exposes each
   ADJACENCY as its own independent control — eyebrow→title, title→hero,
   header→body, text→figure, figure→text, callout in/out, section break,
   image→caption, … Every slider writes a single targeted rule, so a
   space can be dialled in on its own and later baked as a real rule.

   Two halves:
     • VISUALISE — a coloured band in every vertical gap, labelled with
       the transition that owns it and its live pixel value. Click a
       band to jump to its slider; hover a slider to flash its band(s).
     • TWEAK — one slider per adjacency, written to an injected <style>
       that overrides case-study.css live.

   NOT shipped: lives under dev/ (excluded from deploy) and loads only
   on localhost with ?tune=1 (see main.js). "Copy CSS" hands back the
   full rule block; "Reset" drops overrides back to the shipped values.
───────────────────────────────────────── */
(function () {
  if (window.__spacingTuner) { window.__spacingTuner.toggle(); return; }

  var cs = document.querySelector('.cs-content');
  if (!cs) { console.warn('[spacing-tuner] no .cs-content on this page — open a case study.'); return; }

  /* Every distinct adjacency, its controlling selector, shipped default,
     slider range, group + colour. `void` mode splits the value across
     margin-top + padding-top so the chapter divider stays centred. */
  var T = [
    // id            group      label                       selector                                   def  min  max  color     mode
    ['eyebrow-title','Header',  'eyebrow → title',          '.cs-content > h1',                          16,  0,  64, '#ff5da2'],
    ['title-hero',   'Header',  'title → hero',             '.cs-content > .cs-hero-img-wrap',           64,  0, 160, '#ff86b8'],
    ['hero-meta',    'Header',  'hero → meta',              '.cs-content > .cs-meta',                    24,  0,  96, '#ffa8cf'],
    ['section',      'Chapters','section ↔ section',        '.cs-content > .cs-section',                128, 24, 320, '#a06bff', 'void'],
    ['header-body',  'Text',    'section header → body',    '.cs-section > .b-section-header + *',        24,  0,  96, '#22c7b8'],
    ['para-para',    'Text',    'paragraph ↔ paragraph',    '.b-body + .b-body',                         16,  0,  48, '#4aa3ff'],
    ['fig-enter',    'Figures', 'text → figure',            '.cs-section > .cs-figure',                  64,  0, 160, '#ffb020'],
    ['fig-exit',     'Figures', 'figure → next',            '.cs-section > .cs-figure + *',              64,  0, 160, '#ffcf6b'],
    ['img-caption',  'Figures', 'image → caption',          '.cs-figcaption',                             8,  0,  40, '#e0a44a'],
    ['call-enter',   'Callout', 'text → callout',           '.cs-section > .cs-callout',                 64,  0, 160, '#5ad17a'],
    ['call-exit',    'Callout', 'callout → next',           '.cs-section > .cs-callout + *',             64,  0, 160, '#9be3ad'],
    ['stats-enter',  'Stats',   'text → stats',             '.cs-section > .cs-outcomes',                64,  0, 160, '#38bdf8'],
    ['stats-exit',   'Stats',   'stats → next',             '.cs-section > .cs-outcomes + *',            64,  0, 160, '#8fd6fb'],
    ['sublabel',     'List',    'text → sub-label',         '.cs-section > .b-label',                    24,  0,  96, '#f59e42'],
    ['label-list',   'List',    'sub-label/list → list',    '.cs-section > .cs-list',                    16,  0,  64, '#f7b877'],
    ['list-exit',    'List',    'list → next',              '.cs-section > .cs-list + *',                64,  0, 160, '#fbd0a0']
  ];
  var DEF = {}, VAL = {}, META = {};
  T.forEach(function (r) {
    META[r[0]] = { id: r[0], group: r[1], label: r[2], sel: r[3], def: r[4], min: r[5], max: r[6], color: r[7], mode: r[8] || 'margin' };
    DEF[r[0]] = r[4]; VAL[r[0]] = r[4];
  });
  function color(id) { return META[id] ? META[id].color : '#888'; }
  function label(id) { return META[id] ? META[id].label : id; }

  /* ── injected overrides ─────────────────────────────────────── */
  var styleEl = document.createElement('style');
  styleEl.id = '__spacingTunerStyle';
  document.head.appendChild(styleEl);
  function writeStyle() {
    /* Flow premise: a gap is owned solely by the NEXT element's margin-top.
       The eyebrow / sub-labels ship a margin-bottom (var(--sp-5) = 20px) that
       collapses with the following margin-top and floors the gap — zero it so
       the slider has full range down to 0. */
    var reset = '.cs-content > .b-label, .cs-section > .b-label { margin-bottom: 0; }';
    styleEl.textContent = reset + '\n' + T.map(function (r) {
      var m = META[r[0]], v = VAL[r[0]];
      if (m.mode === 'void') return m.sel + ' { margin-top:' + (v / 2) + 'px; padding-top:' + (v / 2) + 'px; }';
      return m.sel + ' { margin-top:' + v + 'px; }';
    }).join('\n');
  }

  /* ── classify an adjacency → transition id ──────────────────── */
  function is(el, cls) { return el.classList && el.classList.contains(cls); }
  function isBlock(el) { return is(el, 'cs-figure') || is(el, 'cs-callout') || is(el, 'cs-outcomes'); }
  function exitId(el) { return is(el, 'cs-figure') ? 'fig-exit' : is(el, 'cs-callout') ? 'call-exit' : 'stats-exit'; }
  function enterId(el) { return is(el, 'cs-figure') ? 'fig-enter' : is(el, 'cs-callout') ? 'call-enter' : 'stats-enter'; }

  function classify(prev, cur, container) {
    if (container === cs) {
      if (is(cur, 'cs-hero-img-wrap')) return 'title-hero';
      if (is(cur, 'cs-meta')) return 'hero-meta';
      if (cur.tagName === 'H1') return 'eyebrow-title';
      return 'section'; // sections + footer read as the chapter void
    }
    if (container.classList && container.classList.contains('cs-figure')) return 'img-caption';
    // inside a .cs-section — the cascade lets the "exit" rule win when
    // a block precedes, so classify by prev first.
    if (isBlock(prev)) return exitId(prev);
    if (isBlock(cur)) return enterId(cur);
    if (is(prev, 'b-section-header')) return 'header-body';
    if (is(prev, 'cs-list')) return 'list-exit';
    if (is(cur, 'cs-list')) return 'label-list';
    if (is(cur, 'b-label')) return 'sublabel';
    return 'para-para';
  }

  /* ── overlay ────────────────────────────────────────────────── */
  var layer = document.createElement('div');
  layer.id = '__spacingTunerLayer';
  layer.style.cssText = 'position:absolute;left:0;top:0;z-index:2147482000;pointer-events:none;';
  document.body.appendChild(layer);
  var bandsByTid = {};

  function firstChildEl(el) { var c = el.firstElementChild; while (c && c.getBoundingClientRect().height === 0) c = c.nextElementSibling; return c; }

  function collect() {
    var gaps = [], sy = window.scrollY, r = cs.getBoundingClientRect();
    var colLeft = r.left + window.scrollX, colWidth = r.width;
    function walk(container) {
      var kids = Array.prototype.filter.call(container.children, function (k) { var b = k.getBoundingClientRect(); return b.height > 0 || b.width > 0; });
      for (var i = 1; i < kids.length; i++) {
        var prev = kids[i - 1], cur = kids[i];
        if (container === cs && is(cur, 'cs-section')) {
          var head = firstChildEl(cur) || cur;
          var top = prev.getBoundingClientRect().bottom + sy, bot = head.getBoundingClientRect().top + sy;
          if (bot - top >= 1) gaps.push({ top: top, bot: bot, tid: 'section', px: Math.round(bot - top) });
          continue;
        }
        var g = cur.getBoundingClientRect().top - prev.getBoundingClientRect().bottom;
        if (g < 0.5) continue;
        gaps.push({ top: prev.getBoundingClientRect().bottom + sy, bot: cur.getBoundingClientRect().top + sy, tid: classify(prev, cur, container), px: Math.round(g) });
      }
    }
    walk(cs);
    cs.querySelectorAll('.cs-section').forEach(walk);
    cs.querySelectorAll('.cs-figure').forEach(walk);
    return { gaps: gaps, colLeft: colLeft, colWidth: colWidth };
  }

  var overlayOn = true;
  function draw() {
    layer.innerHTML = ''; bandsByTid = {};
    if (!overlayOn) return;
    var d = collect();
    d.gaps.forEach(function (gp) {
      var c = color(gp.tid);
      var band = document.createElement('div');
      band.dataset.tid = gp.tid;
      band.style.cssText = 'position:absolute;left:' + d.colLeft + 'px;width:' + d.colWidth + 'px;top:' + gp.top + 'px;height:' + (gp.bot - gp.top) +
        'px;background:' + c + '1f;border-top:1px dashed ' + c + ';border-bottom:1px dashed ' + c + ';box-sizing:border-box;pointer-events:none;';
      var chip = document.createElement('button');
      chip.dataset.tid = gp.tid;
      chip.textContent = gp.tid + ' · ' + gp.px;
      chip.title = label(gp.tid) + ' — click to tune';
      chip.style.cssText = 'all:unset;position:absolute;left:' + (d.colLeft + 6) + 'px;top:' + ((gp.top + gp.bot) / 2 - 9) + 'px;font:600 10px/1.4 ui-monospace,Menlo,monospace;' +
        'padding:1px 6px;border-radius:3px;background:' + c + ';color:#0b0b0f;white-space:nowrap;cursor:pointer;pointer-events:auto;';
      chip.onclick = function () { focusRow(gp.tid); };
      layer.appendChild(band); layer.appendChild(chip);
      (bandsByTid[gp.tid] = bandsByTid[gp.tid] || []).push(band);
    });
  }
  var raf = null;
  function refresh() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }

  function flashBands(tid, on) {
    (bandsByTid[tid] || []).forEach(function (b) {
      var c = color(tid);
      b.style.background = on ? c + '4d' : c + '1f';
      b.style.outline = on ? '2px solid ' + c : 'none';
    });
  }

  /* ── panel ──────────────────────────────────────────────────── */
  var panel = document.createElement('div');
  panel.id = '__spacingTunerPanel';
  panel.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483000;width:310px;max-height:calc(100vh - 32px);overflow:auto;' +
    'background:#14141b;color:#e8e8ef;border:1px solid #2a2a37;border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.5);' +
    'font:400 12px/1.45 ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;';

  /* Sticky top bar — title + the controls you reach for most, so nothing
     important requires scrolling the slider list. */
  var bar = document.createElement('div');
  bar.style.cssText = 'position:sticky;top:0;background:#14141b;z-index:3;border-bottom:1px solid #2a2a37;';
  panel.appendChild(bar);

  var head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;';
  head.innerHTML = '<strong style="font:700 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;">SPACING DIAL KIT</strong>';
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '×'; closeBtn.style.cssText = 'all:unset;cursor:pointer;font-size:18px;line-height:1;color:#9a9aab;padding:0 4px;';
  closeBtn.onclick = function () { api.toggle(); };
  head.appendChild(closeBtn); bar.appendChild(head);

  var toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:0 14px 10px;';
  bar.appendChild(toolbar);

  var body = document.createElement('div');
  body.style.cssText = 'padding:6px 14px 14px;'; panel.appendChild(body);

  var rowEls = {};
  var lastGroup = null;
  T.forEach(function (r) {
    var m = META[r[0]];
    if (m.group !== lastGroup) {
      lastGroup = m.group;
      var gh = document.createElement('div');
      gh.textContent = m.group;
      gh.style.cssText = 'margin:14px 0 2px;font:700 9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#6f6f80;';
      body.appendChild(gh);
    }
    var row = document.createElement('div');
    row.style.cssText = 'margin:9px 0;padding:4px 6px;border-radius:6px;transition:background .12s;';
    row.onmouseenter = function () { flashBands(m.id, true); };
    row.onmouseleave = function () { flashBands(m.id, false); };

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;gap:7px;margin-bottom:4px;';
    top.innerHTML = '<span style="width:10px;height:10px;border-radius:2px;background:' + m.color + ';flex:0 0 auto;"></span>' +
      '<span style="flex:1;font-size:11.5px;">' + m.label + '</span>';
    var num = document.createElement('input');
    num.type = 'number'; num.min = m.min; num.max = m.max; num.value = m.def;
    num.style.cssText = 'width:50px;background:#0d0d12;color:#e8e8ef;border:1px solid #2a2a37;border-radius:4px;padding:2px 5px;font:600 11px ui-monospace,Menlo,monospace;text-align:right;';
    top.appendChild(num); row.appendChild(top);

    var slider = document.createElement('input');
    slider.type = 'range'; slider.min = m.min; slider.max = m.max; slider.step = 1; slider.value = m.def;
    slider.style.cssText = 'width:100%;accent-color:' + m.color + ';margin:0;';
    row.appendChild(slider);

    function apply(v) {
      v = Math.max(m.min, Math.min(m.max, parseInt(v, 10) || 0));
      slider.value = v; num.value = v; VAL[m.id] = v; writeStyle(); refresh();
    }
    slider.addEventListener('input', function () { apply(slider.value); });
    num.addEventListener('input', function () { apply(num.value); });
    rowEls[m.id] = { row: row, slider: slider, num: num, apply: apply };
    body.appendChild(row);
  });

  function focusRow(tid) {
    var r = rowEls[tid]; if (!r) return;
    r.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var c = color(tid);
    r.row.style.background = c + '33';
    setTimeout(function () { r.row.style.background = ''; }, 900);
  }

  /* overlay toggle + actions — pinned in the sticky top bar */
  var ovRow = document.createElement('label');
  ovRow.style.cssText = 'display:flex;align-items:center;gap:7px;flex:1;cursor:pointer;user-select:none;font-size:11.5px;';
  var ovBox = document.createElement('input'); ovBox.type = 'checkbox'; ovBox.checked = true; ovBox.style.cssText = 'accent-color:#ffb020;';
  ovBox.addEventListener('change', function () { overlayOn = ovBox.checked; refresh(); });
  ovRow.appendChild(ovBox); ovRow.appendChild(document.createTextNode('Overlay'));
  toolbar.appendChild(ovRow);

  function mkBtn(t) { var b = document.createElement('button'); b.textContent = t; b.style.cssText = 'cursor:pointer;background:#22222d;color:#e8e8ef;border:1px solid #333341;border-radius:6px;padding:5px 10px;font:600 11px ui-sans-serif,system-ui;'; return b; }
  var copyBtn = mkBtn('Copy CSS'), resetBtn = mkBtn('Reset');
  toolbar.appendChild(copyBtn); toolbar.appendChild(resetBtn);

  var note = document.createElement('div');
  note.style.cssText = 'margin-top:12px;color:#7a7a88;font-size:10.5px;line-height:1.5;';
  note.textContent = 'Each row is one rule. Click a band on the page to jump to its slider. Bands show the real rendered gap.';
  body.appendChild(note);

  function cssOut() {
    var lines = [], g = null;
    T.forEach(function (r) {
      var m = META[r[0]], v = VAL[r[0]];
      if (m.group !== g) { g = m.group; lines.push((lines.length ? '\n' : '') + '/* ' + g + ' */'); }
      if (m.mode === 'void') lines.push(m.sel + ' { margin-top: ' + (v / 2) + 'px; padding-top: ' + (v / 2) + 'px; }');
      else lines.push(m.sel + ' { margin-top: ' + v + 'px; }');
    });
    return lines.join('\n');
  }
  copyBtn.onclick = function () {
    var out = cssOut();
    navigator.clipboard.writeText(out).then(function () { var o = copyBtn.textContent; copyBtn.textContent = 'Copied!'; setTimeout(function () { copyBtn.textContent = o; }, 1400); });
    console.log('[spacing-tuner]\n' + out);
  };
  resetBtn.onclick = function () { T.forEach(function (r) { rowEls[r[0]].apply(DEF[r[0]]); }); };

  document.body.appendChild(panel);
  writeStyle();

  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  cs.querySelectorAll('img').forEach(function (img) { img.addEventListener('load', refresh); });
  setTimeout(refresh, 300);
  refresh();

  var api = {
    toggle: function () {
      var hidden = panel.style.display === 'none';
      panel.style.display = hidden ? '' : 'none';
      overlayOn = hidden ? ovBox.checked : false; refresh();
    }
  };
  window.__spacingTuner = api;
  console.log('[spacing-tuner] ready — one slider per adjacency. Click a band to tune that exact space.');
})();
