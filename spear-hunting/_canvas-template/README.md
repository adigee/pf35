# Canvas template for spear hunting pages

A Miro style board page: the visitor lands on an infinite canvas of
scattered cards and pans and zooms instead of scrolling.

## Files

- `index.html` - the template page, full of TODO(adi) slots
- `/spear-hunting/canvas.css` - shared layout and default skin
- `/spear-hunting/canvas-skins.css` - the acid skin (dark and
  light) plus the demo switcher styles
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
- Tour: click Tour to enter, then step with the prev and next
  buttons or the left and right arrow keys; Exit or Escape
  returns to the fit view

Cards keep normal links and buttons working; content stays in the
DOM for screen readers and crawlers.

## Skins

A page picks a look with `data-cv-skin` on the body:

- `signal` (default) - the site's design language, midnight,
  ivory, lavender, soft rounded cards
- `acid` - neo brutalist rave board, in both of the site's
  themes: acid dark is bone cards with 2px ink borders and
  hard neon shadows on black graph paper; acid light is the
  full inversion, black cards with hard shadows on bone
  paper, pink taking over as the primary

Both skins react to the site theme toggle like the rest of
the portfolio. To use a skin, set `data-cv-skin="acid"` on the
body and link `/spear-hunting/canvas-skins.css` in the head.
The template page also has a Signal / Acid switcher in the top
pill (demo only, saves the choice to localStorage; remove it
on real project pages).
