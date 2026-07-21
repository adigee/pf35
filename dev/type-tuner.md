# Type Tuner — dev-only typography tool

A disposable in-browser typography tuner that works on **every page** of the site
(home + every case-study page). It reads the **live computed CSS** of whatever you
click, so every control starts from the real shipped value.

It is **not shipped**. The source lives here in the repo (`dev/type-tuner.js`) and
`dev/` is excluded from the Vercel production deploy via `.vercelignore`, so nothing
tuner-related is ever referenced by or served with the live site. You run it on demand.

## What it does

- **Font pairing (whole site)** — swap the Display / Body / Mono typeface; writes the
  global `--font-*` tokens, so it re-skins every page that uses the design system.
- **Pick element → tune** — click *any* text on the page; the tuner reads its live
  computed CSS and lets you nudge family / size / weight / letter-spacing / line-height.
  Tune several elements in one session; switch between them with the dropdown.
- **CSS output** — clean, copy-ready CSS keyed by a generated selector, to hand back
  for baking into `style.css` / `case-study.css`.

Re-running toggles the panel. **Reset all** reloads back to production styles.

## Run it — Option A: bookmarklet (recommended)

One-time setup, then one click on any page (works on the live site too):

1. Create a new bookmark in your browser (bookmark any page, then edit it).
2. Replace the bookmark **URL** with the entire contents of
   [`type-tuner.bookmarklet.txt`](./type-tuner.bookmarklet.txt) (it starts with `javascript:`).
3. Name it e.g. **Type Tuner** and put it on your bookmarks bar.
4. Open any page — `pf35.vercel.app`, a case study, or a local copy — and click the
   bookmark. The panel appears. Click it again to hide.

The whole tool is baked into the bookmark, so nothing has to be served from production.
If the tuner source here changes, regenerate the bookmarklet (see below) and re-paste it.

## Run it — Option B: DevTools console

Open DevTools → Console on any page, paste the contents of `type-tuner.js`, hit Enter.

## Regenerate the bookmarklet after editing `type-tuner.js`

```sh
node -e 'const fs=require("fs");const s=fs.readFileSync("dev/type-tuner.js","utf8").replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");fs.writeFileSync("dev/type-tuner.bookmarklet.txt","javascript:"+encodeURIComponent(s))'
```
