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
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

  function show(target) {
    clearTimeout(target._omTimer);
    target.classList.remove('om-out');
    target.hidden = false;
    if (!reducedMotion.matches) {
      target.classList.remove('om-in');
      void target.offsetWidth;
      target.classList.add('om-in');
    }
  }

  function hide(target, immediate) {
    clearTimeout(target._omTimer);
    target.classList.remove('om-in');
    if (immediate || reducedMotion.matches) {
      target.classList.remove('om-out');
      target.hidden = true;
      return;
    }
    target.classList.add('om-out');
    target._omTimer = setTimeout(function () {
      target.classList.remove('om-out');
      target.hidden = true;
    }, DURATION);
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
    button._omTargets.forEach(function (target) {
      if (open) {
        show(target);
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
    if (data.highlight) node.classList.add('om-node--highlight');
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
      });
      toggle.appendChild(button);
    });

    if (trees.length > 1) root.appendChild(toggle);
    if (data.hint) root.appendChild(make('p', 'b-body-small om-hint', data.hint));
    panels.forEach(function (panel) { root.appendChild(panel); });
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
