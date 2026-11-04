/* Benchmark stepper for the HousingAnywhere page (see the .bench styles in
   application.css). Shows one full-width protection card at a time via
   Next/Back, fills the move-in → move-out timeline as the stay progresses,
   and reveals the per-platform comparison table behind a toggle. */
(function () {
  var bench = document.querySelector('[data-benchmark]');
  if (!bench) return;

  var cards = [].slice.call(bench.querySelectorAll('.bench-card'));
  var back = bench.querySelector('[data-benchmark-back]');
  var next = bench.querySelector('[data-benchmark-next]');
  var count = bench.querySelector('[data-benchmark-count]');
  /* Timeline fill per step: past the 24h checkpoint, past "Rest of stay",
     and finally the whole way to Move-out. */
  var fills = [25, 75, 100];
  var last = cards.length - 1;
  var step = 0;

  function pad(number) {
    return (number < 10 ? '0' : '') + number;
  }

  function render() {
    cards.forEach(function (card, index) {
      card.hidden = index !== step;
    });
    if (back) back.disabled = step === 0;
    if (next) next.disabled = step === last;
    if (count) count.textContent = pad(step + 1) + ' / ' + pad(cards.length);
    bench.style.setProperty('--bench-fill', fills[step]);
  }

  if (back) {
    back.addEventListener('click', function () {
      if (step > 0) {
        step -= 1;
        render();
      }
    });
  }

  if (next) {
    next.addEventListener('click', function () {
      if (step < last) {
        step += 1;
        render();
      }
    });
  }

  render();

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
