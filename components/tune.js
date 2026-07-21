/* ─────────────────────────────────────────
   TYPOGRAPHY TUNER  (homepage, dev-only)
   Activated ONLY with ?tune=1 in the URL — otherwise this
   script does nothing, so it's inert in production.

   What it gives you, live in the browser:
     • Font pairing — swap the Display / Body / Mono typeface
       for the whole page (writes the --font-* tokens).
     • Per-role fine controls — pick a role (Name, Bio,
       Tagline, Location, Feature eyebrow, Nav, Resume) and
       nudge its family / size / weight / letter-spacing /
       line-height. Only roles you actually touch are emitted.
     • Edit copy — flip the homepage text to contenteditable
       so you can rewrite it in place.
     • Live CSS export — the panel shows (and copies) the
       exact CSS for whatever you changed, ready to bake in.

   The tuner always starts from what's currently live — it never
   restores a past session. "Reset" drops all changes and reloads
   back to the production styles.
───────────────────────────────────────── */
(function () {
  if (new URLSearchParams(location.search).get('tune') !== '1') return;

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

  /* ── Tunable text roles on the homepage ──
     sel      = what gets the override CSS
     sample   = element to read the design defaults from
     edit     = selectors made contenteditable in Edit mode */
  var ROLES = [
    { key: 'name',     label: 'Name + role',    sel: '.rail-identity .name',  base: 'display', edit: ['.rail-identity .name'] },
    { key: 'bio',      label: 'Bio',            sel: '.rail-intro .bio',      base: 'body',    edit: ['.rail-intro .bio'] },
    { key: 'tagline',  label: 'Tagline',        sel: '.rail-intro .tagline',  base: 'body',    edit: ['.rail-intro .tagline'] },
    { key: 'location', label: 'Location',       sel: '.rail-intro .location', base: 'body',    edit: ['.rail-intro .location'] },
    { key: 'eyebrow',  label: 'Feature eyebrow', sel: '.fc-eyebrow',          base: 'mono',    edit: [] },
    { key: 'nav',      label: 'Nav links',      sel: '.rail-nav a',           base: 'body',    edit: ['.rail-nav a'] },
    { key: 'resume',   label: 'Resume row',     sel: '.rail-resume .rr-label, .rail-resume .rr-link', sample: '.rr-label', base: 'body', edit: ['.rail-resume .rr-label'] }
  ];

  function r(n, d) { var p = Math.pow(10, d); return Math.round(n * p) / p; }

  /* Read the design defaults for a role from the live page. */
  function readBase(role) {
    var el = document.querySelector(role.sample || role.sel);
    if (!el) return { size: 16, weight: 400, tracking: 0, leading: 1.5 };
    var cs = getComputedStyle(el);
    var size = parseFloat(cs.fontSize) || 16;
    var ls = (cs.letterSpacing === 'normal') ? 0 : (parseFloat(cs.letterSpacing) || 0);
    var lh = (cs.lineHeight === 'normal') ? size * 1.2 : (parseFloat(cs.lineHeight) || size * 1.4);
    return { size: Math.round(size), weight: parseInt(cs.fontWeight, 10) || 400, tracking: r(ls / size, 3), leading: r(lh / size, 2) };
  }

  var baseRoles = {};
  ROLES.forEach(function (role) { baseRoles[role.key] = readBase(role); });

  /* ── State — always seeded fresh from the live page ──
     The tuner is just a knob on whatever's currently shipping:
     nothing is restored across loads, so a reload always shows
     the production styles. */
  var state = { display: 'Manrope', body: 'Manrope', mono: 'Manrope', edit: false, roles: {} };
  ROLES.forEach(function (role) {
    var b = baseRoles[role.key];
    state.roles[role.key] = { family: '', size: b.size, weight: b.weight, tracking: b.tracking, leading: b.leading, touched: false };
  });

  /* ── Live style element + CSS builder ── */
  var styleEl = document.createElement('style');
  styleEl.id = 'tune-style';
  document.head.appendChild(styleEl);

  function buildCSS() {
    var lines = [];
    var vars = [];
    if (state.display !== 'Manrope') vars.push('  --font-display: ' + stackFor(state.display) + ';');
    if (state.body !== 'Manrope')    vars.push('  --font-body:    ' + stackFor(state.body) + ';');
    if (state.mono !== 'Manrope')    vars.push('  --font-mono:    ' + stackFor(state.mono) + ';');
    if (vars.length) lines.push(':root {\n' + vars.join('\n') + '\n}');

    ROLES.forEach(function (role) {
      var s = state.roles[role.key], b = baseRoles[role.key];
      if (!s.touched) return;
      var decl = [];
      if (s.family) decl.push('  font-family: ' + stackFor(s.family) + ';');
      if (s.size !== b.size) decl.push('  font-size: ' + s.size + 'px;');
      if (s.weight !== b.weight) decl.push('  font-weight: ' + s.weight + ';');
      if (s.tracking !== b.tracking) decl.push('  letter-spacing: ' + s.tracking + 'em;');
      if (s.leading !== b.leading) decl.push('  line-height: ' + s.leading + ';');
      if (decl.length) lines.push(role.sel + ' {\n' + decl.join('\n') + '\n}');
    });
    return lines.join('\n\n');
  }

  function apply() {
    root.style.setProperty('--font-display', stackFor(state.display));
    root.style.setProperty('--font-body', stackFor(state.body));
    root.style.setProperty('--font-mono', stackFor(state.mono));

    var css = '';
    ROLES.forEach(function (role) {
      var s = state.roles[role.key];
      if (!s.touched) return;
      var d = [];
      if (s.family) d.push('font-family:' + stackFor(s.family) + ' !important');
      d.push('font-size:' + s.size + 'px !important');
      d.push('font-weight:' + s.weight + ' !important');
      d.push('letter-spacing:' + s.tracking + 'em !important');
      d.push('line-height:' + s.leading + ' !important');
      css += role.sel + '{' + d.join(';') + '}\n';
    });
    styleEl.textContent = css;

    if (ui.out) ui.out.value = buildCSS() || '/* no changes yet */';
  }

  /* ── UI ── */
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
    return wrap;
  }

  function buildPanel() {
    var panel = el('div', [
      'position:fixed;top:16px;right:16px;z-index:99999;width:290px;',
      'max-height:calc(100vh - 32px);overflow:auto;',
      'background:rgba(20,20,23,0.96);backdrop-filter:blur(12px);',
      'border:1px solid #35353c;border-radius:12px;color:#eaeaea;',
      'font-family:' + PANEL_FONT + ';font-size:12px;line-height:1.4;',
      'box-shadow:0 16px 48px rgba(0,0,0,0.5);'
    ].join(''));

    /* Header */
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
    bodyWrap.appendChild(el('div', 'font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;', 'Font pairing'));
    [['display', 'Display'], ['body', 'Body'], ['mono', 'Mono']].forEach(function (pair) {
      var lbl = el('label', 'display:block;margin-top:8px;color:#bbb;', pair[1]);
      lbl.appendChild(makeSelect(state[pair[0]], false, function (v) { state[pair[0]] = v; apply(); }));
      bodyWrap.appendChild(lbl);
    });

    /* Role fine-tuning */
    bodyWrap.appendChild(el('div', 'margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;', 'Fine-tune a role'));
    var roleSel = el('select', 'width:100%;margin-top:6px;padding:5px 6px;background:#1b1b1f;color:#eee;border:1px solid #3a3a40;border-radius:6px;font:inherit;');
    ROLES.forEach(function (role) {
      var o = el('option', null, role.label); o.value = role.key; roleSel.appendChild(o);
    });
    bodyWrap.appendChild(roleSel);

    var controls = el('div');
    bodyWrap.appendChild(controls);

    function renderControls(key) {
      controls.innerHTML = '';
      var role = ROLES.filter(function (x) { return x.key === key; })[0];
      var s = state.roles[key];
      function touch() { s.touched = true; }

      var famLbl = el('label', 'display:block;margin-top:10px;color:#bbb;', 'Typeface');
      famLbl.appendChild(makeSelect(s.family, true, function (v) { s.family = v; touch(); apply(); }));
      controls.appendChild(famLbl);

      controls.appendChild(makeRange('Size (px)', 8, 120, 1, s.size, function (v) { s.size = v; touch(); apply(); }));
      controls.appendChild(makeRange('Weight', 100, 900, 100, s.weight, function (v) { s.weight = v; touch(); apply(); }));
      controls.appendChild(makeRange('Letter-spacing (em)', -0.08, 0.4, 0.005, s.tracking, function (v) { s.tracking = r(v, 3); touch(); apply(); }));
      controls.appendChild(makeRange('Line-height', 0.85, 2.2, 0.05, s.leading, function (v) { s.leading = r(v, 2); touch(); apply(); }));

      var resetRole = el('button', 'margin-top:12px;width:100%;padding:6px;background:#242429;color:#bbb;border:1px solid #3a3a40;border-radius:6px;cursor:pointer;font:inherit;', 'Reset this role');
      resetRole.onclick = function () {
        var b = baseRoles[key];
        state.roles[key] = { family: '', size: b.size, weight: b.weight, tracking: b.tracking, leading: b.leading, touched: false };
        renderControls(key); apply();
      };
      controls.appendChild(resetRole);
    }
    roleSel.onchange = function () { renderControls(roleSel.value); };
    renderControls(ROLES[0].key);

    /* Edit copy */
    var editRow = el('label', 'display:flex;align-items:center;gap:8px;margin-top:16px;color:#bbb;cursor:pointer;');
    var editCb = el('input'); editCb.type = 'checkbox'; editCb.checked = state.edit; editCb.style.accentColor = '#8ee0c0';
    editRow.appendChild(editCb);
    editRow.appendChild(el('span', null, 'Edit text (click into copy)'));
    editCb.onchange = function () { state.edit = editCb.checked; setEditing(state.edit); };
    bodyWrap.appendChild(editRow);

    /* Export */
    bodyWrap.appendChild(el('div', 'margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;', 'CSS output'));
    ui.out = el('textarea', 'width:100%;height:120px;margin-top:6px;padding:8px;background:#0f0f11;color:#8ee0c0;border:1px solid #2c2c32;border-radius:6px;font-family:ui-monospace,monospace;font-size:11px;resize:vertical;');
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
    var resetBtn = el('button', 'flex:1;padding:7px;background:#242429;color:#bbb;border:1px solid #3a3a40;border-radius:6px;cursor:pointer;font:inherit;', 'Reset');
    resetBtn.title = 'Drop all changes and reload the live production styles';
    resetBtn.onclick = function () {
      /* Purge any snapshot from the old persisting version, then reload —
         the tuner re-seeds from the live page, so this returns to production. */
      try { localStorage.removeItem('pf35-tune'); } catch (e) {}
      location.reload();
    };
    btnRow.appendChild(copyBtn); btnRow.appendChild(resetBtn);
    bodyWrap.appendChild(btnRow);

    panel.appendChild(header);
    panel.appendChild(bodyWrap);
    document.body.appendChild(panel);
  }

  /* ── Edit mode: contenteditable + suppress link nav ── */
  function editableEls() {
    var out = [];
    ROLES.forEach(function (role) {
      role.edit.forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) { out.push(n); });
      });
    });
    return out;
  }
  function blockNav(e) { if (state.edit) e.preventDefault(); }
  function setEditing(on) {
    editableEls().forEach(function (n) {
      n.contentEditable = on ? 'true' : 'false';
      n.style.outline = on ? '1px dashed rgba(142,224,192,0.6)' : '';
      n.style.outlineOffset = on ? '3px' : '';
      if (on) n.addEventListener('click', blockNav);
      else n.removeEventListener('click', blockNav);
    });
  }

  buildPanel();
  apply();
  if (state.edit) setEditing(true);
})();
