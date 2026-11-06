/* Benchmark for the HousingAnywhere page (see the .bench styles in
   application.css). Desktop: three protection cards side by side; hovering or
   focusing one fades the others and fills its segment of the move-in →
   move-out timeline. Below 1200px: the cards stack as a swipeable deck and the
   front card owns the timeline segment. The per-platform comparison table
   sits behind a toggle. */
(function () {
  var bench = document.querySelector('[data-benchmark]');
  if (!bench) return;

  var cards = [].slice.call(bench.querySelectorAll('.bench-card'));
  var stops = [].slice.call(bench.querySelectorAll('.bench-stop'));
  var timeline = bench.querySelector('.bench-timeline');
  var cardsWrap = bench.querySelector('.bench-cards');
  var dotsWrap = bench.querySelector('[data-benchmark-dots]');
  var phone = window.matchMedia('(max-width: 1199px)');
  var count = cards.length;
  var current = 0;

  /* Card i owns timeline segment i (stop i → stop i + 1). The fill is
     cumulative: card 1 fills Move-in → 48h, card 2 keeps that and adds
     48h → Rest of stay, card 3 runs on to Move-out. */
  function paintRail(index) {
    stops.forEach(function (stop, k) {
      stop.classList.toggle('is-reached', index >= 0 && k <= index + 1);
      stop.classList.toggle('is-current', index >= 0 && k === index + 1);
    });
    if (index < 0) {
      timeline.classList.remove('is-filled');   /* fade out, width stays put */
      return;
    }
    if (!timeline.classList.contains('is-filled')) {
      /* Coming from idle: start again from zero while invisible, then fade in and grow */
      timeline.classList.add('is-resetting');
      bench.style.setProperty('--fill', 0);
      void timeline.offsetWidth;
      timeline.classList.remove('is-resetting');
      timeline.classList.add('is-filled');
    }
    bench.style.setProperty('--fill', index + 1);
  }

  /* ── Desktop: hover / focus ── */
  function setActive(index) {
    cards.forEach(function (card, i) {
      card.classList.toggle('is-active', i === index);
    });
    bench.classList.toggle('has-active', index >= 0);
    paintRail(index);
  }

  cards.forEach(function (card, i) {
    card.addEventListener('mouseenter', function () { if (!phone.matches) setActive(i); });
    card.addEventListener('focus', function () { if (!phone.matches) setActive(i); });
    card.addEventListener('blur', function (event) {
      if (!phone.matches && !card.contains(event.relatedTarget)) setActive(-1);
    });
  });
  cardsWrap.addEventListener('mouseleave', function () { if (!phone.matches) setActive(-1); });

  /* ── Phones: deck ── */
  var dots = cards.map(function (card, index) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'bench-dot';
    dot.setAttribute('aria-label', 'Card ' + (index + 1) + ' of ' + count);
    dot.addEventListener('click', function () {
      current = index;
      renderDeck();
    });
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  function renderDeck() {
    cards.forEach(function (card, i) {
      var pos = (i - current + count) % count;
      card.dataset.pos = pos;
      card.toggleAttribute('inert', pos !== 0);
      card.style.transform = '';
      card.style.opacity = '';
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === current);
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    paintRail(current);
  }

  function layout() {
    if (phone.matches) {
      cards.forEach(function (card) { card.classList.remove('is-active'); card.removeAttribute('tabindex'); });
      bench.classList.remove('has-active');
      renderDeck();
    } else {
      cards.forEach(function (card) {
        delete card.dataset.pos;
        card.removeAttribute('inert');
        card.style.transform = '';
        card.style.opacity = '';
        card.setAttribute('tabindex', '0');
      });
      setActive(-1);
    }
  }

  /* Swipe the front card left or right to move through the deck */
  var drag = null;
  cardsWrap.addEventListener('pointerdown', function (event) {
    if (!phone.matches) return;
    var card = event.target.closest('.bench-card');
    if (!card || card.dataset.pos !== '0') return;
    drag = { card: card, x: event.clientX, dx: 0, id: event.pointerId };
    card.setPointerCapture(event.pointerId);
    card.classList.add('is-dragging');
  });

  cardsWrap.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag.dx = event.clientX - drag.x;
    drag.card.style.transform = 'translateX(' + drag.dx + 'px) rotate(' + drag.dx / 28 + 'deg)';
    drag.card.style.opacity = String(Math.max(0.5, 1 - Math.abs(drag.dx) / 500));
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    var dx = drag.dx;
    drag.card.classList.remove('is-dragging');
    drag = null;
    if (Math.abs(dx) > 70) current = (current + (dx < 0 ? 1 : count - 1)) % count;
    renderDeck();
  }
  cardsWrap.addEventListener('pointerup', endDrag);
  cardsWrap.addEventListener('pointercancel', endDrag);

  bench.addEventListener('keydown', function (event) {
    if (!phone.matches) return;
    if (event.key === 'ArrowRight') { current = (current + 1) % count; renderDeck(); }
    if (event.key === 'ArrowLeft') { current = (current + count - 1) % count; renderDeck(); }
  });

  phone.addEventListener('change', layout);
  layout();

  /* Hidden per-platform comparison table */
  var tableToggle = document.querySelector('[data-benchmark-table-toggle]');
  var table = document.getElementById('bench-comparison-table');
  var tableLabel = tableToggle && tableToggle.querySelector('[data-benchmark-table-label]');

  if (tableToggle && table) {
    tableToggle.addEventListener('click', function () {
      var open = table.hidden;
      table.hidden = !open;
      tableToggle.setAttribute('aria-expanded', String(open));
      if (tableLabel) {
        tableLabel.textContent = open ? 'Hide comparison table' : 'View comparison table';
      }
    });
  }
})();
