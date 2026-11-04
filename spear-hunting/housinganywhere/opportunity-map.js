/* Interactive opportunity map.
   Mount: <div class="om" data-opportunity-map data-src="/path/to/map-data.json"></div>
   All wording comes from the JSON file. */
(function () {
  var TYPE_LABELS = {
    businessOutcome: 'Business outcome',
    productOutcome: 'Product outcome',
    opportunity: 'Opportunity',
    solution: 'Solution'
  };
  var DURATION = 200;
  var STAGGER = 50;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 768px)');

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderEvidence(items) {
    var wrap = make('div', 'om-evidence');
    items.forEach(function (item) {
      if (item.image) {
        var figure = make('figure');
        var img = make('img', 'zoomable');
        img.src = item.image;
        img.alt = item.alt || item.caption || '';
        img.loading = 'lazy';
        figure.appendChild(img);
        if (item.caption) figure.appendChild(make('figcaption', null, item.caption));
        wrap.appendChild(figure);
      } else if (item.quote) {
        var quote = make('blockquote');
        quote.appendChild(make('p', null, item.quote));
        if (item.source) quote.appendChild(make('footer', null, item.source));
        wrap.appendChild(quote);
      }
    });
    return wrap;
  }

  /* Children of a tapped node settle in one after another. */
  function show(target) {
    clearTimeout(target._omTimer);
    target.classList.remove('om-out');
    target.hidden = false;
    if (reducedMotion.matches) return;
    var isList = target.classList.contains('om-children');
    var items = isList ? Array.prototype.slice.call(target.children) : [target];
    items.forEach(function (item, index) {
      item.classList.remove('om-enter');
      void item.offsetWidth;
      item.style.setProperty('--om-d', String(index * STAGGER));
      item.classList.add('om-enter');
    });
  }

  function hide(target, immediate) {
    clearTimeout(target._omTimer);
    target.classList.remove('om-enter');
    if (immediate || reducedMotion.matches) {
      target.classList.remove('om-out');
      target.hidden = true;
      return;
    }
    target.classList.add('om-out');
    fadeWires(target);
    target._omTimer = setTimeout(function () {
      target.classList.remove('om-out');
      target.hidden = true;
      drawWires(target.closest('.om-tree'));
    }, DURATION);
  }

  /* Connectors: one curve from each open parent to each child. Positions use
     offsetLeft/offsetTop so a card mid-animation does not skew the curve. */
  function offsetWithin(node, panel) {
    var x = 0;
    var y = 0;
    for (var current = node; current && current !== panel; current = current.offsetParent) {
      x += current.offsetLeft;
      y += current.offsetTop;
    }
    return { x: x, y: y };
  }

  function nodeOf(item) {
    return item.querySelector(':scope > .om-cell > .om-node');
  }

  function wireShape(panel, parent, child) {
    var parentNode = nodeOf(parent);
    var childNode = nodeOf(child);
    var from = offsetWithin(parentNode, panel);
    var to = offsetWithin(childNode, panel);
    var x1 = from.x + parentNode.offsetWidth;
    var y1 = from.y + parentNode.offsetHeight / 2;
    var x2 = to.x;
    var y2 = to.y + childNode.offsetHeight / 2;
    var mid = (x1 + x2) / 2;
    return 'M' + x1 + ' ' + y1 + ' C' + mid + ' ' + y1 + ' ' + mid + ' ' + y2 + ' ' + x2 + ' ' + y2;
  }

  function collectWires(panel, item, wires) {
    var list = item.querySelector(':scope > .om-children');
    if (!list || list.hidden) return;
    Array.prototype.forEach.call(list.children, function (child, index) {
      wires.push({ child: child, index: index, d: wireShape(panel, item, child) });
      collectWires(panel, child, wires);
    });
  }

  /* Existing curves keep their element, so a fade in progress is not restarted
     when the layout shifts underneath it. */
  function drawWires(panel, entering) {
    if (!panel) return;
    var svg = panel.querySelector(':scope > .om-wires');
    if (!svg) {
      svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'om-wires');
      svg.setAttribute('aria-hidden', 'true');
      panel.insertBefore(svg, panel.firstChild);
    }
    var wires = [];
    if (desktop.matches && !panel.hidden) collectWires(panel, panel.querySelector('.om-item'), wires);

    var existing = new Map();
    Array.prototype.slice.call(svg.children).forEach(function (path) {
      existing.set(path._omChild, path);
    });
    wires.forEach(function (wire) {
      var path = existing.get(wire.child);
      if (path) {
        existing.delete(wire.child);
        if (entering && entering.contains(wire.child)) path.classList.remove('om-out');
      } else {
        path = document.createElementNS(SVG_NS, 'path');
        path._omChild = wire.child;
        if (entering && !reducedMotion.matches && entering.contains(wire.child)) {
          path.style.setProperty('--om-d', String(wire.index * STAGGER));
          path.classList.add('om-enter');
        }
        svg.appendChild(path);
      }
      path.setAttribute('d', wire.d);
    });
    existing.forEach(function (path) { path.remove(); });
  }

  function fadeWires(target) {
    var svg = target.closest('.om-tree').querySelector(':scope > .om-wires');
    if (!svg) return;
    Array.prototype.forEach.call(svg.children, function (path) {
      if (target.contains(path._omChild)) path.classList.add('om-out');
    });
  }

  /* Closing a parent also closes everything open underneath it. */
  function collapseWithin(container) {
    container.querySelectorAll('button.om-node[aria-expanded="true"]').forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
      button._omTargets.forEach(function (target) { hide(target, true); });
    });
  }

  function setOpen(button, open) {
    button.setAttribute('aria-expanded', String(open));
    var panel = button.closest('.om-tree');
    button._omTargets.forEach(function (target) {
      if (open) {
        show(target);
        drawWires(panel, target);
      } else {
        collapseWithin(target);
        hide(target, false);
      }
    });
  }

  function renderItem(data) {
    var children = data.children || [];
    var evidence = data.evidence || [];
    var expandable = children.length > 0 || evidence.length > 0;

    var item = make('li', 'om-item');
    item.dataset.type = data.type;
    var cell = make('div', 'om-cell');
    item.appendChild(cell);

    var node = make(expandable ? 'button' : 'div', 'om-node');
    node.appendChild(make('span', 'om-tag', TYPE_LABELS[data.type] || data.type));
    node.appendChild(make('span', 'om-label', data.label));
    if (data.link) {
      var link = make('a', 'om-link', data.link.label);
      link.href = data.link.href;
      link.addEventListener('click', scrollToTarget);
      /* A link cannot live inside a button, so expandable nodes put it below. */
      (expandable ? cell : node).appendChild(link);
    }
    cell.insertBefore(node, cell.firstChild);

    if (!expandable) return item;

    var targets = [];
    node.type = 'button';
    node.setAttribute('aria-expanded', 'false');
    node.appendChild(make('span', 'om-chevron'));
    node.querySelector('.om-chevron').setAttribute('aria-hidden', 'true');

    if (evidence.length > 0) {
      var evidenceBlock = renderEvidence(evidence);
      evidenceBlock.hidden = true;
      cell.appendChild(evidenceBlock);
      targets.push(evidenceBlock);
    }

    if (children.length > 0) {
      var list = make('ul', 'om-children');
      list.setAttribute('role', 'list');
      list.hidden = true;
      children.forEach(function (child) { list.appendChild(renderItem(child)); });
      item.appendChild(list);
      targets.push(list);
    }

    node._omTargets = targets;
    node.addEventListener('click', function () {
      setOpen(node, node.getAttribute('aria-expanded') !== 'true');
    });
    if (data.open) {
      node.setAttribute('aria-expanded', 'true');
      targets.forEach(function (target) { target.hidden = false; });
    }
    return item;
  }

  function scrollToTarget(event) {
    var id = this.getAttribute('href').slice(1);
    var target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function render(root, data) {
    root.textContent = '';
    var trees = data.trees || [];

    /* Drop the class once an entrance finishes, so hiding and re-showing a
       panel (switching sides) never replays it. */
    root.addEventListener('animationend', function (event) {
      if (event.target.classList.contains('om-enter')) event.target.classList.remove('om-enter');
    });

    var toggle = make('div', 'om-toggle');
    toggle.setAttribute('role', 'group');
    toggle.setAttribute('aria-label', 'Choose a side');
    var panels = [];

    trees.forEach(function (tree, index) {
      var button = make('button', null, tree.toggleLabel || tree.id);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(index === 0));

      var panel = make('div', 'om-tree');
      panel.id = 'om-tree-' + tree.id;
      panel.hidden = index !== 0;
      var list = make('ul');
      list.setAttribute('role', 'list');
      list.appendChild(renderItem(tree.root));
      panel.appendChild(list);
      panels.push(panel);

      button.addEventListener('click', function () {
        toggle.querySelectorAll('button').forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });
        panels.forEach(function (other) { other.hidden = other !== panel; });
        drawWires(panel);
      });
      toggle.appendChild(button);
    });

    if (trees.length > 1) root.appendChild(toggle);
    if (data.hint) root.appendChild(make('p', 'b-body-small om-hint', data.hint));
    panels.forEach(function (panel) { root.appendChild(panel); });

    function redraw() {
      panels.forEach(function (panel) { drawWires(panel); });
    }
    redraw();
    /* Wrapping text, images and fonts all change card sizes after first paint. */
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(redraw);
      panels.forEach(function (panel) { observer.observe(panel); });
    } else {
      window.addEventListener('resize', redraw);
    }
    desktop.addEventListener('change', redraw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  }

  function mount(root) {
    fetch(root.dataset.src)
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        return response.json();
      })
      .then(function (data) { render(root, data); })
      .catch(function () {
        root.textContent = '';
        root.appendChild(make('p', 'b-body om-error', 'The map could not be loaded.'));
      });
  }

  document.querySelectorAll('[data-opportunity-map]').forEach(mount);
})();
