/* ─────────────────────────────────────────
   TYPE TUNER — page-agnostic, dev-only
   ---------------------------------------------------------------
   A disposable in-browser typography tuner that works on EVERY page
   of the site (home + every case-study page), not a hardcoded one.

   It is NOT shipped: this file lives in the repo under dev/ and is
   excluded from the production deploy (see .vercelignore). You run it
   by injecting it on demand — via the bookmarklet in dev/type-tuner.md
   or by pasting this file into the DevTools console.

   What it gives you, live in the browser:
     • Font pairing — swap the Display / Body / Mono typeface for the
       whole page (writes the global --font-* tokens, so it affects
       every page that uses the design system).
     • Click-to-tune ANY text — hit "Pick element", click any text on
       the page, and the tuner reads that element's LIVE computed CSS
       (the real shipped values from style.css / case-study.css) and
       seeds every control from there. Nudge family / size / weight /
       letter-spacing / line-height and see it live.
     • Live CSS export — the panel shows (and copies) clean CSS for
       everything you changed, keyed by a generated selector, ready to
       hand back to bake into the stylesheets.

   The tuner always starts from what's currently live — it never
   restores a past session. Re-running the bookmarklet toggles it.
───────────────────────────────────────── */
(function () {
  /* Re-injecting toggles the panel instead of stacking copies. */
  if (window.__typeTuner) { window.__typeTuner.toggle(); return; }

  var root = document.documentElement;

  /* ── Typefaces on offer (curated Google Fonts) ──
     Each carries its own css2 query fragment so the request
     is valid per-family (variable ranges, italics, opsz). */
  var FONTS = [
    { name: 'Manrope',           cat: 'sans',  gf: 'Manrope:wght@300;400;500;600;700' },
    { name: 'Inter',             cat: 'sans',  gf: 'Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
    { name: 'Instrument Sans',   cat: 'sans',  gf: 'Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
    { name: 'Space Grotesk',     cat: 'sans',  gf: 'Space+Grotesk:wght@300;400;500;600;700' },
    { name: 'DM Sans',           cat: 'sans',  gf: 'DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' },
    { name: 'Sora',              cat: 'sans',  gf: 'Sora:wght@300;400;500;600;700' },
    { name: 'Outfit',            cat: 'sans',  gf: 'Outfit:wght@300;400;500;600;700' },
    { name: 'Schibsted Grotesk', cat: 'sans',  gf: 'Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400' },
    { name: 'Figtree',           cat: 'sans',  gf: 'Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400' },
    { name: 'Fraunces',          cat: 'serif', gf: 'Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400' },
    { name: 'Newsreader',        cat: 'serif', gf: 'Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400' },
    { name: 'Instrument Serif',  cat: 'serif', gf: 'Instrument+Serif:ital@0;1' },
    { name: 'Spectral',          cat: 'serif', gf: 'Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
    { name: 'Playfair Display',  cat: 'serif', gf: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400' },
    { name: 'Lora',              cat: 'serif', gf: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400' },
    { name: 'JetBrains Mono',    cat: 'mono',  gf: 'JetBrains+Mono:wght@300;400;500;600;700' },
    { name: 'Space Mono',        cat: 'mono',  gf: 'Space+Mono:ital,wght@0,400;0,700;1,400' },
    { name: 'IBM Plex Mono',     cat: 'mono',  gf: 'IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700' }
  ];
  var FALLBACK = { sans: 'sans-serif', serif: 'serif', mono: 'monospace' };

  function fontByName(n) { for (var i = 0; i < FONTS.length; i++) if (FONTS[i].name === n) return FONTS[i]; return null; }
  function stackFor(n) { var f = fontByName(n); return f ? "'" + f.name + "', " + FALLBACK[f.cat] : n; }

  /* Load every family in one request. */
  (function loadFonts() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' +
      FONTS.map(function (f) { return 'family=' + f.gf; }).join('&') + '&display=swap';
    document.head.appendChild(link);
  })();

  function r(n, d) { var p = Math.pow(10, d); return Math.round(n * p) / p; }

  /* Which of our curated families is currently bound to a --font-* token,
     so the pairing dropdowns start on the real shipped value. */
  function tokenFont(tokenVar) {
    var raw = getComputedStyle(root).getPropertyValue(tokenVar).trim();
    var first = (raw.split(',')[0] || '').replace(/['"]/g, '').trim();
    return fontByName(first) ? first : '';
  }

  /* Read the design defaults for an element from the live page. */
  function readBase(el) {
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize) || 16;
    var ls = (cs.letterSpacing === 'normal') ? 0 : (parseFloat(cs.letterSpacing) || 0);
    var lh = (cs.lineHeight === 'normal') ? size * 1.2 : (parseFloat(cs.lineHeight) || size * 1.4);
    return { size: Math.round(size), weight: parseInt(cs.fontWeight, 10) || 400, tracking: r(ls / size, 3), leading: r(lh / size, 2) };
  }

  /* Build a reasonable CSS selector for a clicked element.
     Prefer an id, then the element's own classes (so tuning a role like
     .cs-hero-desc tunes every instance), else fall back to the nearest
     classed ancestor plus this element's tag (handles e.g. .tagline em). */
  function selectorFor(el) {
    if (el.id) return '#' + el.id;
    if (el.classList && el.classList.length) {
      return '.' + Array.prototype.join.call(el.classList, '.');
    }
    var tag = el.tagName.toLowerCase();
    var p = el.parentElement;
    while (p && p !== document.body) {
      if (p.id) return '#' + p.id + ' ' + tag;
      if (p.classList && p.classList.length) return '.' + Array.prototype.join.call(p.classList, '.') + ' ' + tag;
      p = p.parentElement;
    }
    return tag;
  }

  /* ── State — always seeded fresh from the live page ── */
  var state = {
    display: tokenFont('--font-display'),
    body: tokenFont('--font-body'),
    mono: tokenFont('--font-mono'),
    roles: {},        /* selector -> { base, family, size, weight, tracking, leading } */
    order: [],        /* selector insertion order for the switcher */
    active: null      /* selector currently shown in the controls */
  };

  /* ── Live style element + CSS builder ── */
  var styleEl = document.createElement('style');
  styleEl.id = 'tt-style';
  document.head.appendChild(styleEl);

  function buildCSS() {
    var lines = [];
    var vars = [];
    if (state.display) vars.push('  --font-display: ' + stackFor(state.display) + ';');
    if (state.body)    vars.push('  --font-body:    ' + stackFor(state.body) + ';');
    if (state.mono)    vars.push('  --font-mono:    ' + stackFor(state.mono) + ';');
    if (vars.length) lines.push(':root {\n' + vars.join('\n') + '\n}');

    state.order.forEach(function (sel) {
      var s = state.roles[sel], b = s.base;
      var decl = [];
      if (s.family) decl.push('  font-family: ' + stackFor(s.family) + ';');
      if (s.size !== b.size) decl.push('  font-size: ' + s.size + 'px;');
      if (s.weight !== b.weight) decl.push('  font-weight: ' + s.weight + ';');
      if (s.tracking !== b.tracking) decl.push('  letter-spacing: ' + s.tracking + 'em;');
      if (s.leading !== b.leading) decl.push('  line-height: ' + s.leading + ';');
      if (decl.length) lines.push(sel + ' {\n' + decl.join('\n') + '\n}');
    });
    return lines.join('\n\n');
  }

  function apply() {
    if (state.display) root.style.setProperty('--font-display', stackFor(state.display));
    if (state.body) root.style.setProperty('--font-body', stackFor(state.body));
    if (state.mono) root.style.setProperty('--font-mono', stackFor(state.mono));

    var css = '';
    state.order.forEach(function (sel) {
      var s = state.roles[sel];
      var d = [];
      if (s.family) d.push('font-family:' + stackFor(s.family) + ' !important');
      d.push('font-size:' + s.size + 'px !important');
      d.push('font-weight:' + s.weight + ' !important');
      d.push('letter-spacing:' + s.tracking + 'em !important');
      d.push('line-height:' + s.leading + ' !important');
      css += sel + '{' + d.join(';') + '}\n';
    });
    styleEl.textContent = css;

    if (ui.out) ui.out.value = buildCSS() || '/* nothing changed yet — pick an element or swap a font */';
  }

  /* ── UI helpers ── */
  var ui = {};
  var PANEL_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }

  function fontOptions(includeInherit) {
    var html = includeInherit ? '<option value="">— inherit —</option>' : '';
    var cat = '';
    FONTS.forEach(function (f) {
      if (f.cat !== cat) { cat = f.cat; html += '<option disabled>· ' + cat + ' ·</option>'; }
      html += '<option value="' + f.name + '">' + f.name + '</option>';
    });
    return html;
  }

  function makeSelect(val, includeInherit, onChange) {
    var s = el('select', 'width:100%;margin-top:4px;padding:5px 6px;background:#1b1b1f;color:#eee;border:1px solid #3a3a40;border-radius:6px;font:inherit;');
    s.innerHTML = fontOptions(includeInherit);
    s.value = val;
    s.onchange = function () { onChange(s.value); };
    return s;
  }

  function makeRange(label, min, max, step, val, onInput) {
    var wrap = el('div', 'margin-top:10px;');
    var head = el('div', 'display:flex;justify-content:space-between;font-size:11px;color:#aaa;');
    head.appendChild(el('span', null, label));
    var num = el('span', 'color:#8ee0c0;font-variant-numeric:tabular-nums;', String(val));
    head.appendChild(num);
    var input = el('input', 'width:100%;margin-top:3px;accent-color:#8ee0c0;');
    input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = val;
    input.oninput = function () { num.textContent = input.value; onInput(parseFloat(input.value)); };
    wrap.appendChild(head); wrap.appendChild(input);
    return { wrap: wrap, num: num, input: input };
  }

  /* ── Element picker: hover highlight + click to select ── */
  var hl = el('div', 'position:fixed;z-index:99998;pointer-events:none;border:2px solid #8ee0c0;background:rgba(142,224,192,0.12);border-radius:3px;display:none;transition:all 60ms ease;');
  document.body.appendChild(hl);
  var picking = false;

  function isTextish(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.closest && node.closest('#tt-panel')) return false;
    return (node.textContent || '').trim().length > 0;
  }

  function onPickMove(e) {
    var t = document.elementFromPoint(e.clientX, e.clientY);
    if (!isTextish(t)) { hl.style.display = 'none'; return; }
    var box = t.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.left = box.left + 'px'; hl.style.top = box.top + 'px';
    hl.style.width = box.width + 'px'; hl.style.height = box.height + 'px';
  }

  function onPickClick(e) {
    var t = document.elementFromPoint(e.clientX, e.clientY);
    e.preventDefault(); e.stopPropagation();
    stopPicking();
    if (!isTextish(t)) return;
    addRole(selectorFor(t), t);
  }

  function startPicking() {
    if (picking) return;
    picking = true;
    ui.pickBtn.textContent = 'Click any text… (Esc)';
    ui.pickBtn.style.background = '#8ee0c0'; ui.pickBtn.style.color = '#0f0f11';
    document.addEventListener('mousemove', onPickMove, true);
    document.addEventListener('click', onPickClick, true);
    document.addEventListener('keydown', onPickKey, true);
  }
  function stopPicking() {
    picking = false;
    hl.style.display = 'none';
    ui.pickBtn.textContent = '+ Pick element';
    ui.pickBtn.style.background = '#242429'; ui.pickBtn.style.color = '#eaeaea';
    document.removeEventListener('mousemove', onPickMove, true);
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('keydown', onPickKey, true);
  }
  function onPickKey(e) { if (e.key === 'Escape') { e.preventDefault(); stopPicking(); } }

  /* ── Roles: one per picked selector ── */
  function addRole(sel, sampleEl) {
    if (!state.roles[sel]) {
      var b = readBase(sampleEl);
      state.roles[sel] = { base: b, family: '', size: b.size, weight: b.weight, tracking: b.tracking, leading: b.leading };
      state.order.push(sel);
    }
    state.active = sel;
    refreshRoleSwitcher();
    renderControls(sel);
    apply();
  }

  function refreshRoleSwitcher() {
    ui.roleSel.innerHTML = '';
    if (!state.order.length) {
      ui.roleSel.innerHTML = '<option>— no element picked —</option>';
      ui.roleSel.disabled = true;
      return;
    }
    ui.roleSel.disabled = false;
    state.order.forEach(function (sel) {
      var o = el('option', null, sel); o.value = sel; ui.roleSel.appendChild(o);
    });
    ui.roleSel.value = state.active;
  }

  function renderControls(sel) {
    ui.controls.innerHTML = '';
    if (!sel || !state.roles[sel]) {
      ui.controls.appendChild(el('div', 'margin-top:10px;color:#888;font-size:11px;', 'Pick an element to tune its type, or swap a font above.'));
      return;
    }
    var s = state.roles[sel], b = s.base;

    var famLbl = el('label', 'display:block;margin-top:10px;color:#bbb;', 'Typeface');
    famLbl.appendChild(makeSelect(s.family, true, function (v) { s.family = v; apply(); }));
    ui.controls.appendChild(famLbl);

    ui.controls.appendChild(makeRange('Size (px)', 8, 120, 1, s.size, function (v) { s.size = v; apply(); }).wrap);
    ui.controls.appendChild(makeRange('Weight', 100, 900, 100, s.weight, function (v) { s.weight = v; apply(); }).wrap);
    ui.controls.appendChild(makeRange('Letter-spacing (em)', -0.08, 0.4, 0.005, s.tracking, function (v) { s.tracking = r(v, 3); apply(); }).wrap);
    ui.controls.appendChild(makeRange('Line-height', 0.85, 2.2, 0.05, s.leading, function (v) { s.leading = r(v, 2); apply(); }).wrap);

    var row = el('div', 'display:flex;gap:8px;margin-top:12px;');
    var resetRole = el('button', 'flex:1;padding:6px;background:#242429;color:#bbb;border:1px solid #3a3a40;border-radius:6px;cursor:pointer;font:inherit;', 'Reset');
    resetRole.onclick = function () {
      s.family = ''; s.size = b.size; s.weight = b.weight; s.tracking = b.tracking; s.leading = b.leading;
      renderControls(sel); apply();
    };
    var removeRole = el('button', 'flex:1;padding:6px;background:#242429;color:#e0928e;border:1px solid #3a3a40;border-radius:6px;cursor:pointer;font:inherit;', 'Remove');
    removeRole.onclick = function () {
      delete state.roles[sel];
      state.order = state.order.filter(function (x) { return x !== sel; });
      state.active = state.order[state.order.length - 1] || null;
      refreshRoleSwitcher(); renderControls(state.active); apply();
    };
    row.appendChild(resetRole); row.appendChild(removeRole);
    ui.controls.appendChild(row);
  }

  /* ── Panel ── */
  function buildPanel() {
    var panel = el('div', [
      'position:fixed;top:16px;right:16px;z-index:99999;width:300px;',
      'max-height:calc(100vh - 32px);overflow:auto;',
      'background:rgba(20,20,23,0.96);backdrop-filter:blur(12px);',
      'border:1px solid #35353c;border-radius:12px;color:#eaeaea;',
      'font-family:' + PANEL_FONT + ';font-size:12px;line-height:1.4;',
      'box-shadow:0 16px 48px rgba(0,0,0,0.5);'
    ].join(''));
    panel.id = 'tt-panel';
    ui.panel = panel;

    var header = el('div', 'display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #2c2c32;cursor:pointer;');
    header.appendChild(el('strong', 'font-size:12px;letter-spacing:0.02em;', 'TYPE TUNER'));
    var collapse = el('span', 'color:#888;font-size:14px;', '–');
    header.appendChild(collapse);

    var bodyWrap = el('div', 'padding:12px 14px;');
    header.onclick = function () {
      var hidden = bodyWrap.style.display === 'none';
      bodyWrap.style.display = hidden ? 'block' : 'none';
      collapse.textContent = hidden ? '–' : '+';
    };

    /* Font pairing */
    bodyWrap.appendChild(el('div', 'font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;', 'Font pairing (whole site)'));
    [['display', 'Display'], ['body', 'Body'], ['mono', 'Mono']].forEach(function (pair) {
      var lbl = el('label', 'display:block;margin-top:8px;color:#bbb;', pair[1]);
      var sel = makeSelect(state[pair[0]], true, function (v) { state[pair[0]] = v; apply(); });
      lbl.appendChild(sel);
      bodyWrap.appendChild(lbl);
    });

    /* Pick + fine-tune */
    bodyWrap.appendChild(el('div', 'margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;', 'Tune an element'));
    ui.pickBtn = el('button', 'width:100%;margin-top:8px;padding:8px;background:#242429;color:#eaeaea;border:1px solid #3a3a40;border-radius:6px;cursor:pointer;font:inherit;font-weight:600;', '+ Pick element');
    ui.pickBtn.onclick = function () { picking ? stopPicking() : startPicking(); };
    bodyWrap.appendChild(ui.pickBtn);

    ui.roleSel = el('select', 'width:100%;margin-top:8px;padding:5px 6px;background:#1b1b1f;color:#eee;border:1px solid #3a3a40;border-radius:6px;font:inherit;font-family:ui-monospace,monospace;font-size:11px;');
    ui.roleSel.onchange = function () { state.active = ui.roleSel.value; renderControls(state.active); };
    bodyWrap.appendChild(ui.roleSel);

    ui.controls = el('div');
    bodyWrap.appendChild(ui.controls);

    /* Export */
    bodyWrap.appendChild(el('div', 'margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;', 'CSS output'));
    ui.out = el('textarea', 'width:100%;height:130px;margin-top:6px;padding:8px;background:#0f0f11;color:#8ee0c0;border:1px solid #2c2c32;border-radius:6px;font-family:ui-monospace,monospace;font-size:11px;resize:vertical;');
    ui.out.readOnly = true;
    bodyWrap.appendChild(ui.out);

    var btnRow = el('div', 'display:flex;gap:8px;margin-top:8px;');
    var copyBtn = el('button', 'flex:1;padding:7px;background:#8ee0c0;color:#0f0f11;border:none;border-radius:6px;cursor:pointer;font:inherit;font-weight:600;', 'Copy CSS');
    copyBtn.onclick = function () {
      var css = buildCSS();
      if (navigator.clipboard) navigator.clipboard.writeText(css);
      copyBtn.textContent = 'Copied ✓';
      setTimeout(function () { copyBtn.textContent = 'Copy CSS'; }, 1200);
    };
    var resetBtn = el('button', 'flex:1;padding:7px;background:#242429;color:#bbb;border:1px solid #3a3a40;border-radius:6px;cursor:pointer;font:inherit;', 'Reset all');
    resetBtn.title = 'Drop every change and reload the live production styles';
    resetBtn.onclick = function () { location.reload(); };
    btnRow.appendChild(copyBtn); btnRow.appendChild(resetBtn);
    bodyWrap.appendChild(btnRow);

    panel.appendChild(header);
    panel.appendChild(bodyWrap);
    document.body.appendChild(panel);

    refreshRoleSwitcher();
    renderControls(null);
  }

  buildPanel();
  apply();

  window.__typeTuner = {
    toggle: function () {
      var p = ui.panel;
      p.style.display = (p.style.display === 'none') ? '' : 'none';
      if (p.style.display === 'none' && picking) stopPicking();
    }
  };
})();
