/* ─────────────────────────────────────────
   DIAL KIT — dev-only style picker
   ---------------------------------------------------------------
   Select a line of content on the page and restyle it with any of
   the design-system text classes from design.md §3 (the .b-*
   classes). Works live on the page — nothing is saved; when you're
   happy with a line, "Copy markup" and bake it into index.html.

   Interaction:
     1. The "Dial kit" pill sits top-right. Click it.
     2. The panel drops down and the page enters pick mode — hover
        any text line to see it outlined, click to select it.
     3. The panel lists every .b-* text style with a live preview.
        Click one to apply it — it replaces the line's existing
        .b-* class (the line's own layout classes are untouched).
     4. "Edit text" makes the line's copy editable in place.
        "Copy markup" copies the line's outerHTML to the clipboard.
        "Reset line" restores the original. Esc deselects.

   Load it in local dev via the preview server's query param:
     node dev/serve.js   →   http://localhost:8931/?dialkit
   Or drop <script src="/dev/dial-kit.js"></script> before </body>
   on any page. dev/ never ships (see .vercelignore).
───────────────────────────────────────── */
(function () {
  /* Re-running toggles the panel instead of stacking copies. */
  if (window.__dialKit) { window.__dialKit.toggle(); return; }

  /* ── The styles on offer — the .b-* text classes from design.md §3
     that exist in style.css. Order is from kicker → display → body. */
  var STYLES = [
    { cls: 'b-label',             note: '11 · 500 · kicker' },
    { cls: 'b-title',             note: '44 · heading' },
    { cls: 'b-title--xl',         note: '88 · hero' },
    { cls: 'b-title--article',    note: '52 · article hero' },
    { cls: 'b-section-header',    note: '28 · section heading' },
    { cls: 'b-section-subheader', note: '16 · 600 · subheading' },
    { cls: 'b-body',              note: '16 · body' },
    { cls: 'b-body-bold',         note: '16 · 600 · bold' },
    { cls: 'b-body-caption',      note: '14 · 500 · caption' },
    { cls: 'b-body-small',        note: '14 · small' },
    { cls: 'b-body-small-impact', note: '14 · 700 · impact' },
    { cls: 'b-link',              note: '11 · primary CTA' },
    { cls: 'b-label-link',        note: '11 · quiet label link' }
  ];
  var KIT_CLASSES = STYLES.map(function (s) { return s.cls; });

  /* ── State ── */
  var selected = null;       /* the current line          */
  var originals = [];        /* { el, classes } touched   */
  var editing = false;
  var picking = false;

  /* ── Injected styles (tokens from the page, so it adapts) ── */
  var style = document.createElement('style');
  style.textContent =
    '#dk-panel{position:fixed;top:16px;right:16px;z-index:99999;width:280px;' +
      'max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;' +
      'background:var(--color-surface-2,#1B1B1F);color:var(--color-text,#F8F6EE);' +
      'border:1px solid var(--color-border,rgba(248,246,238,0.12));border-radius:14px;' +
      'box-shadow:0 18px 50px rgba(0,0,0,0.5);' +
      'font-family:var(--font-body,Manrope,sans-serif);font-size:12px;line-height:1.45;}' +
    '#dk-panel *{box-sizing:border-box;margin:0;padding:0;}' +
    '#dk-panel.dk-collapsed{width:auto;}' +
    '.dk-head{display:flex;align-items:center;justify-content:space-between;gap:10px;' +
      'padding:11px 14px;cursor:pointer;user-select:none;}' +
    '.dk-title{font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-text-muted,#bbb);white-space:nowrap;}' +
    '.dk-toggle{appearance:none;width:20px;height:20px;border-radius:50%;border:1px solid var(--color-border,#333);' +
      'background:transparent;color:var(--color-text-muted,#bbb);font-size:10px;line-height:1;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center;}' +
    '.dk-toggle:hover{border-color:var(--color-primary,#ACA0E8);color:var(--color-primary,#ACA0E8);}' +
    '#dk-panel.dk-collapsed .dk-body{display:none;}' +
    '.dk-body{overflow:auto;padding:12px 14px 14px;}' +
    '.dk-hint{font-size:11px;color:var(--color-text-muted,#999);margin-bottom:10px;}' +
    '.dk-hint strong{color:var(--color-text,#eee);font-weight:600;}' +
    '.dk-sel{display:none;}' +
    '.dk-sel.open{display:block;}' +
    '.dk-sel-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}' +
    '.dk-sel-tag{font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-primary,#ACA0E8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.dk-link{appearance:none;background:transparent;border:none;padding:0;font:inherit;font-size:10px;font-weight:600;' +
      'text-transform:uppercase;letter-spacing:0.06em;color:var(--color-text-muted,#999);cursor:pointer;white-space:nowrap;}' +
    '.dk-link:hover{color:var(--color-primary,#ACA0E8);}' +
    '.dk-link--warn:hover{color:#e0928e;}' +
    '.dk-meta{font-family:ui-monospace,SFMono-Regular,monospace;font-size:10px;color:var(--color-text-muted,#999);' +
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:10px;}' +
    '.dk-edit{display:none;width:100%;font:inherit;font-size:12px;color:var(--color-text,#eee);' +
      'background:var(--color-surface,#1E1D1A);border:1px solid var(--color-border,#333);border-radius:8px;' +
      'padding:8px 10px;margin-bottom:10px;outline:none;}' +
    '.dk-edit:focus{border-color:var(--color-primary,#ACA0E8);}' +
    '.dk-label{font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-text-muted,#999);margin-bottom:6px;}' +
    '.dk-styles{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;}' +
    '.dk-opt{display:flex;align-items:center;gap:10px;width:100%;padding:4px;background:transparent;' +
      'border:1px solid transparent;border-radius:8px;cursor:pointer;text-align:left;' +
      'font:inherit;color:var(--color-text,#eee);transition:border-color 120ms ease,background 120ms ease;}' +
    '.dk-opt:hover{border-color:var(--color-border,#333);background:var(--color-primary-muted,rgba(172,160,232,0.12));}' +
    '.dk-opt.is-active{border-color:var(--color-primary,#ACA0E8);background:var(--color-primary-muted,rgba(172,160,232,0.12));}' +
    '.dk-prev{flex:0 0 64px;height:38px;overflow:hidden;display:flex;align-items:center;justify-content:center;' +
      'background:var(--color-bg,#121212);border:1px dashed var(--color-border,#333);border-radius:6px;color:var(--color-text,#eee);}' +
    '.dk-prev-text{font-size:var(--text-sm,14px);white-space:nowrap;}' +
    '.dk-prev-text{font-family:var(--font-body,Manrope,sans-serif);color:inherit;}' +
    '.dk-opt-info{display:flex;flex-direction:column;min-width:0;}' +
    '.dk-opt-name{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;font-weight:600;letter-spacing:0.01em;}' +
    '.dk-opt-note{font-size:10px;color:var(--color-text-muted,#999);}' +
    '.dk-actions{display:flex;gap:8px;}' +
    '.dk-btn{flex:1;appearance:none;border:1px solid var(--color-border,#333);background:var(--color-surface,#1E1D1A);' +
      'color:var(--color-text,#eee);border-radius:999px;padding:6px 8px;font:inherit;font-size:10px;font-weight:600;' +
      'letter-spacing:0.05em;text-transform:uppercase;cursor:pointer;}' +
    '.dk-btn:hover{border-color:var(--color-primary,#ACA0E8);color:var(--color-primary,#ACA0E8);}' +
    '.dk-btn--danger:hover{border-color:#e0928e;color:#e0928e;}' +
    '#dk-hl{position:fixed;z-index:99998;pointer-events:none;border:1.5px solid var(--color-primary,#ACA0E8);' +
      'border-radius:4px;background:color-mix(in srgb,var(--color-primary,#ACA0E8) 12%,transparent);' +
      'display:none;transition:all 60ms ease;}' +
    '.dk-selected{outline:1.5px solid var(--color-primary,#ACA0E8);outline-offset:2px;}';
  (document.head || document.documentElement).appendChild(style);

  /* ── Hover-highlight box ── */
  var hl = document.createElement('div');
  hl.id = 'dk-hl';
  document.body.appendChild(hl);

  /* ── Panel ── */
  var panel = document.createElement('div');
  panel.id = 'dk-panel';

  var head = document.createElement('div');
  head.className = 'dk-head';
  var title = document.createElement('span');
  title.className = 'dk-title';
  title.textContent = 'Dial kit';
  var toggle = document.createElement('button');
  toggle.className = 'dk-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Collapse dial kit');
  toggle.innerHTML = '&#10005;';
  head.appendChild(title);
  head.appendChild(toggle);
  panel.appendChild(head);

  var body = document.createElement('div');
  body.className = 'dk-body';

  var hint = document.createElement('p');
  hint.className = 'dk-hint';
  hint.innerHTML = 'Click a <strong>line</strong> on the page to select it.';
  body.appendChild(hint);

  var sel = document.createElement('div');
  sel.className = 'dk-sel';

  var selRow = document.createElement('div');
  selRow.className = 'dk-sel-row';
  var selTag = document.createElement('span');
  selTag.className = 'dk-sel-tag';
  var editBtn = document.createElement('button');
  editBtn.className = 'dk-link';
  editBtn.type = 'button';
  editBtn.textContent = 'Edit text';
  editBtn.onclick = function () { toggleEdit(); };
  selRow.appendChild(selTag);
  selRow.appendChild(editBtn);
  sel.appendChild(selRow);

  var meta = document.createElement('div');
  meta.className = 'dk-meta';
  sel.appendChild(meta);

  var editArea = document.createElement('textarea');
  editArea.className = 'dk-edit';
  editArea.rows = 3;
  editArea.placeholder = 'Type new copy here…';
  sel.appendChild(editArea);

  body.appendChild(sel);

  var stylesLabel = document.createElement('div');
  stylesLabel.className = 'dk-label';
  stylesLabel.textContent = 'Apply a style';
  body.appendChild(stylesLabel);

  var stylesWrap = document.createElement('div');
  stylesWrap.className = 'dk-styles';
  var optNodes = {};
  STYLES.forEach(function (s) {
    var opt = document.createElement('button');
    opt.className = 'dk-opt';
    opt.type = 'button';
    opt.title = 'Apply .' + s.cls;
    opt.setAttribute('data-style', s.cls);
    var prev = document.createElement('span');
    prev.className = 'dk-prev';
    var prevText = document.createElement('span');
    prevText.className = 'dk-prev-text ' + s.cls;
    prevText.textContent = 'Aa';
    prev.appendChild(prevText);
    var info = document.createElement('span');
    info.className = 'dk-opt-info';
    var name = document.createElement('span');
    name.className = 'dk-opt-name';
    name.textContent = '.' + s.cls;
    var note = document.createElement('span');
    note.className = 'dk-opt-note';
    note.textContent = s.note;
    info.appendChild(name);
    info.appendChild(note);
    opt.appendChild(prev);
    opt.appendChild(info);
    opt.onclick = function () { applyStyle(s.cls); };
    stylesWrap.appendChild(opt);
    optNodes[s.cls] = opt;
  });
  body.appendChild(stylesWrap);

  var actions = document.createElement('div');
  actions.className = 'dk-actions';
  var copyBtn = document.createElement('button');
  copyBtn.className = 'dk-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Copy markup';
  copyBtn.onclick = function () { copyMarkup(); };
  var resetBtn = document.createElement('button');
  resetBtn.className = 'dk-btn dk-btn--danger';
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset line';
  resetBtn.onclick = function () { resetLine(); };
  actions.appendChild(copyBtn);
  actions.appendChild(resetBtn);
  body.appendChild(actions);

  panel.appendChild(body);
  document.body.appendChild(panel);

  head.addEventListener('click', function () {
    if (panel.classList.contains('dk-collapsed')) setOpen(true);
  });
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(false);
  });

  function setOpen(open) {
    panel.classList.toggle('dk-collapsed', !open);
    toggle.innerHTML = open ? '&#10005;' : '&#9881;';
    toggle.setAttribute('aria-label', open ? 'Collapse dial kit' : 'Open dial kit');
    if (open) {
      startPicking();
    } else {
      stopPicking();
      clearSelection();
    }
  }

  /* ── Line picking ── */
  function hasOwnText(el) {
    var n = el.childNodes;
    for (var i = 0; i < n.length; i++) {
      if (n[i].nodeType === 3 && (n[i].textContent || '').trim()) return true;
    }
    return false;
  }

  function inPanel(el) {
    return el && el.closest && el.closest('#dk-panel');
  }

  function isLine(el) {
    if (!el || !el.nodeType || el.nodeType !== 1) return false;
    if (inPanel(el)) return false;
    if (el.nodeName === 'SVG') return false;
    if (el.classList) {
      if (el.classList.contains('highlight') ||
          el.classList.contains('highlight__text') ||
          el.classList.contains('highlight__ink')) return false;
    }
    return hasOwnText(el) && (el.textContent || '').trim().length > 0;
  }

  /* Walk up from the point to the nearest element with its own text —
     the phrase inside [data-highlight] resolves to the line around it. */
  function lineFromPoint(x, y) {
    var t = document.elementFromPoint(x, y);
    if (!t) return null;
    var el = t;
    while (el && el !== document.body) {
      if (isLine(el)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function onMove(e) {
    if (!picking) return;
    var line = lineFromPoint(e.clientX, e.clientY);
    if (!line) { hl.style.display = 'none'; return; }
    var r = line.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.left = r.left + 'px';
    hl.style.top = r.top + 'px';
    hl.style.width = r.width + 'px';
    hl.style.height = r.height + 'px';
  }

  function onClick(e) {
    if (!picking) return;
    var line = lineFromPoint(e.clientX, e.clientY);
    if (!line) return;
    e.preventDefault();
    e.stopPropagation();
    selectLine(line);
  }

  function onKey(e) {
    if (!picking) return;
    if (e.key === 'Escape') {
      if (editing) { toggleEdit(); return; }
      e.preventDefault();
      clearSelection();
    }
  }

  function startPicking() {
    if (picking) return;
    picking = true;
    hint.innerHTML = 'Click a <strong>line</strong> to select it. Esc deselects.';
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
  }

  function stopPicking() {
    if (!picking) return;
    picking = false;
    hl.style.display = 'none';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
  }

  /* ── Selection ── */
  function clearSelection() {
    exitEdit();
    if (selected) selected.classList.remove('dk-selected');
    selected = null;
    sel.classList.remove('open');
    hint.innerHTML = 'Click a <strong>line</strong> on the page to select it.';
  }

  function exitEdit() {
    if (selected) selected.removeAttribute('contenteditable');
    editing = false;
    editArea.style.display = 'none';
    editBtn.textContent = 'Edit text';
  }

  function selectLine(el) {
    if (selected && selected !== el) {
      selected.classList.remove('dk-selected');
      exitEdit();
    }
    selected = el;
    /* Snapshot the shipped classes BEFORE adding the selection outline,
       so "Reset line" restores exactly what the page had. */
    if (!originals.some(function (o) { return o.el === el; })) {
      originals.push({ el: el, classes: el.className });
    }
    el.classList.add('dk-selected');
    sel.classList.add('open');
    hl.style.display = 'none';
    hint.innerHTML = 'Line selected — pick a style below, or click another line.';
    updatePanel();
  }

  function updatePanel() {
    if (!selected) return;
    selTag.textContent = selected.tagName.toLowerCase();
    var hasStyle = selected.className || '';
    meta.textContent = '.' + hasStyle.trim().replace(/\s+/g, ' .');
    KIT_CLASSES.forEach(function (cls) {
      optNodes[cls].classList.toggle('is-active', selected.classList.contains(cls));
    });
  }

  /* ── Actions ── */
  function applyStyle(cls) {
    if (!selected) return;
    selected.classList.remove.apply(selected.classList, KIT_CLASSES);
    selected.classList.add(cls);
    updatePanel();
  }

  function resetLine() {
    if (!selected) return;
    var o = null;
    for (var i = 0; i < originals.length; i++) {
      if (originals[i].el === selected) { o = originals[i]; break; }
    }
    if (o) selected.className = o.classes;
    updatePanel();
  }

  function copyMarkup() {
    if (!selected) return;
    var html = selected.outerHTML;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(html).catch(function () {});
    }
    copyBtn.textContent = 'Copied ✓';
    setTimeout(function () { copyBtn.textContent = 'Copy markup'; }, 1200);
  }

  function toggleEdit() {
    if (!selected) return;
    if (editing) {
      exitEdit();
      startPicking();
    } else {
      editing = true;
      stopPicking();
      selected.setAttribute('contenteditable', 'true');
      selected.focus();
      /* Land the caret at the end of the line so typing appends. */
      var range = document.createRange();
      range.selectNodeContents(selected);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      editBtn.textContent = 'Done';
    }
  }

  /* Start collapsed (just the head pill); opening arms pick mode. */
  setOpen(false);

  window.__dialKit = {
    toggle: function () {
      if (panel.classList.contains('dk-collapsed')) setOpen(true);
      else setOpen(false);
    }
  };
})();
