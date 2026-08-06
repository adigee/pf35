# AGENTS.md

## "Playground" convention

When Aditya says "playground", it means an **in-context dial kit**, not a separate/standalone page:

- The playground lives on the page where the target element already lives (e.g. a button
  playground on the homepage, an animation playground on the homepage).
- The element being played with stays exactly as it is in its real context.
- Only the **variants** of that one element are toggleable — like a dial kit. No new
  standalone HTML file for the element itself, no isolated sandbox page.

If a new standalone exploration file already exists (e.g. `word-roll-playground.html`),
treat it as obsolete for this purpose and fold the work into the real page instead.

## Pushing explorations to the playground branch

"Push this to the playground" means the **`playground` branch** (off `main`) — the
holding area for all visual explorations and dial kits. Explorations get committed there
so the work is saved for future reference without ever touching production (`main`).

- When Aditya parks an exploration, commit it to `playground` and push `origin/playground`.
- A parked in-context (dial-kit) exploration is captured as a **self-contained HTML file**
  on the playground branch (e.g. `word-cycle-playground.html`) so it can be reviewed later
  in isolation; the live page is then restored to its committed state.
- Never merge `playground` into `main`.
