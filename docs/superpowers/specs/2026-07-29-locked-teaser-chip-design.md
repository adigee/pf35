# Locked case-study teaser chip

## Context

The case-study lock interaction (shipped in `4f42445`, further compacted in
`e94fbd6`) already has three pieces, all live on `main`:

1. A "Locked" pill badge inline with the eyebrow (`.cs-lock-badge`).
2. A frosted skeleton where the gated sections will land (`.cs-locked-skeleton`,
   built in `initGate()` in `components/case-study.js`).
3. A full-page password modal (`buildModal()` in the same file) that the badge
   opens.

The badge is the only entry point into the modal today. A first-time visitor
who scrolls past the hero sees a blurred skeleton with no explanation *in that
spot* — they have to look back up at the small eyebrow pill to understand why
the page looks unfinished.

## Goal

Add a small message directly on top of the frosted skeleton that plainly
states the page is locked, with its own "Unlock" button. This is a second,
more visible entry point into the *same* modal — not a separate password
flow.

## Design

**Markup** — in `initGate()` (`components/case-study.js`), immediately after
the existing `mount.innerHTML = '<div class="cs-locked-skeleton">...'` block,
append a sibling element inside `mount`:

```html
<div class="cs-teaser-chip">
  <div class="cs-gate-lock" aria-hidden="true">{{LOCK_ICON}}</div>
  <p class="b-section-header cs-gate-title">This case study is locked</p>
  <button type="button" class="cs-gate-btn cs-teaser-chip-btn">Unlock</button>
</div>
```

- Reuses the existing `LOCK_ICON` constant and the `.cs-gate-lock` /
  `.cs-gate-title` / `.cs-gate-btn` classes already used inside the modal, so
  the chip's typography and icon treatment match for free — no new visual
  language.
- No `<p class="cs-gate-note">` — keep it to the one line the user asked for
  ("This case study is locked") plus the button. No inline password field, no
  form.

**Wiring** — after `mount.innerHTML` is set, grab the new button and wire it
to the same `modal.open` already used by the eyebrow badge:

```js
var chipBtn = mount.querySelector('.cs-teaser-chip-btn');
if (chipBtn) chipBtn.addEventListener('click', function () { modal.open(); });
```

Since `modal` is built via `buildModal(data, reveal)` a few lines later in the
current code, the chip button listener attach must move to just after that
call (same place `badge.addEventListener('click', modal.open)` already sits) —
not before, since `modal` doesn't exist yet at the point the skeleton HTML is
written.

**Styling** — `case-study.css`:

- `#cs-locked-mount` (or the existing skeleton wrapper) gets `position:
  relative` so the chip can be positioned against it.
- `.cs-teaser-chip`: `position: absolute`, centered (`top`/`left: 50%` +
  `transform: translate(-50%, -50%)`) over the skeleton, `display: flex`,
  `flex-direction: column`, `align-items: center`, `gap`, solid
  `background: var(--color-bg)`, `border: 1px solid var(--color-border)`,
  `border-radius`, and a box-shadow — the same treatment
  `dev/lock-prototype.html`'s option-C `.cs-teaser-chip` used, so it reads
  clearly against the blur behind it.
- `.cs-teaser-chip-btn`: no new rule needed beyond what `.cs-gate-btn` already
  provides, unless spacing needs a small top margin.

**Not doing:**
- No inline password form on the chip (that was the old option-C prototype's
  approach; this ask is simpler — the chip is just a second trigger for the
  existing modal).
- No new open/close animation — the chip fades in with the rest of the locked
  page load, same as everything else in the skeleton.
- No changes to the modal itself, the badge, or the unlock/reveal logic.

## Testing

- Fresh (locked) load of `lockers-reducing-cancellation.html`: chip appears
  centered on the skeleton with the lock icon, "This case study is locked",
  and an "Unlock" button.
- Clicking the chip's button opens the same modal the eyebrow badge opens.
- Wrong password in the modal still shakes the modal card as today; correct
  password (`designforgrowth`) still reveals the real sections and removes
  the skeleton (and therefore the chip, since it's a child of `mount`, which
  is removed in `reveal()`).
- No layout shift: chip is `position: absolute` inside the existing skeleton
  wrapper, so it doesn't add height.
