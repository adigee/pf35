# Canvas template for spear hunting pages

A Miro style board page: the visitor lands on an infinite canvas of
scattered cards and pans and zooms instead of scrolling.

## Files

- `index.html` - the template page, full of TODO(adi) slots
- `/spear-hunting/canvas.css` - shared styles for every canvas page
- `/spear-hunting/canvas.js` - shared pan, zoom, wires, minimap, tour engine

## Create a new canvas page

Copy this folder to `spear-hunting/<slug>/`, or adapt
`scripts/new-spear-hunting-page.mjs` to pick this template. Then:

1. Replace every TODO(adi) slot.
2. Reposition cards by editing their inline `--x` / `--y` (world px),
   optional `--w` (width) and `--r` (rotation, stickies only).
3. Set `data-step="1..n"` on cards in reading order: that is the
   order the Tour button follows.
4. Point the wires SVG's `data-connect="fromId > toId, ..."` at the
   card ids you want connected.
5. Swap the placeholder `.cv-media-ph` block for a real
   `<img class="cv-media">` from `assets/`.
6. Set `data-status="ready"` and fill the meta tags when done.

## Interactions the engine gives you

- Drag background (or hold Space and drag anywhere) to pan
- Scroll pans, pinch or ctrl/cmd + scroll zooms
- Zoom buttons, fit button, keyboard `+ - = 0` and arrow keys
- Minimap: click or drag to jump the camera
- Tour: flies the camera through the `data-step` cards, auto
  advancing, stop by clicking again or pressing Escape

Cards keep normal links and buttons working; content stays in the
DOM for screen readers and crawlers.
