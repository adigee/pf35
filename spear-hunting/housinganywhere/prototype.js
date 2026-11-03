/* Prototype embed for the HousingAnywhere page (see prototype.css).
   Desktop (above 768px): mounts the iframe from the template, scales the
   phone to fit the viewport and drives Restart and the demo toggles.
   Phones: never mounts the iframe. The poster and the open link show instead. */
(function () {
  var section = document.querySelector('[data-prototype]');
  if (!section) return;
  var container = section.closest('section') || section;

  var NAV_HEIGHT = 52; /* --nav-height (3.25rem) */
  var GAP = 16; /* --sp-4 */
  var PHONE_OUTER_WIDTH = 392; /* 390px screen plus 1px border each side */
  var PHONE_OUTER_HEIGHT = 846; /* 844px screen plus 1px border each side */
  var MIN_SCALE = 0.25;

  var desktop = window.matchMedia('(min-width: 769px)');
  var stage = section.querySelector('[data-prototype-stage]');
  var phone = section.querySelector('[data-prototype-phone]');
  var template = section.querySelector('template[data-prototype-frame]');
  var poster = section.querySelector('[data-prototype-poster]');
  var restart = section.querySelector('[data-prototype-restart]');
  var toggles = [].slice.call(section.querySelectorAll('[data-prototype-option]'));
  var frame = null;
  var pendingFit = 0;

  function isOn(button) {
    return button.getAttribute('aria-checked') === 'true';
  }

  function send(message) {
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(message, window.location.origin);
    }
  }

  /* After the iframe loads, tell it the current state of every toggle. */
  function syncOptions() {
    toggles.forEach(function (button) {
      send({ type: button.getAttribute('data-prototype-option'), on: isOn(button) });
    });
  }

  function mountFrame() {
    if (frame || !template) return;
    frame = template.content.firstElementChild.cloneNode(true);
    frame.addEventListener('load', syncOptions);
    phone.insertBefore(frame, phone.firstChild);
  }

  function unmountFrame() {
    if (!frame) return;
    frame.remove();
    frame = null;
  }

  /* Scale the phone so the whole phone and the section heading fit the viewport. */
  function fit() {
    if (!desktop.matches) {
      stage.style.removeProperty('--proto-scale');
      return;
    }
    var aboveStage = stage.getBoundingClientRect().top - container.getBoundingClientRect().top;
    var availableHeight = window.innerHeight - NAV_HEIGHT - aboveStage - GAP;
    var availableWidth = container.clientWidth;
    var scale = Math.min(1, availableHeight / PHONE_OUTER_HEIGHT, availableWidth / PHONE_OUTER_WIDTH);
    stage.style.setProperty('--proto-scale', String(Math.max(scale, MIN_SCALE)));
  }

  function layout() {
    if (desktop.matches) {
      mountFrame();
    } else {
      unmountFrame();
    }
    fit();
  }

  function scheduleFit() {
    if (pendingFit) return;
    pendingFit = window.requestAnimationFrame(function () {
      pendingFit = 0;
      fit();
    });
  }

  if (restart) {
    restart.addEventListener('click', function () {
      send({ type: 'reset' });
      toggles.forEach(function (button) {
        button.setAttribute('aria-checked', 'false');
      });
    });
  }

  toggles.forEach(function (button) {
    button.addEventListener('click', function () {
      var next = !isOn(button);
      button.setAttribute('aria-checked', String(next));
      send({ type: button.getAttribute('data-prototype-option'), on: next });
    });
  });

  if (poster) {
    var showPlaceholder = function () {
      phone.classList.add('is-placeholder');
    };
    poster.addEventListener('error', showPlaceholder);
    if (poster.complete && poster.naturalWidth === 0) showPlaceholder();
  }

  desktop.addEventListener('change', layout);
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('load', fit);
  layout();
})();
