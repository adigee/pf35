# Clean company URLs (no "spear-hunting" in the link)

Date: 2026-11-20. Size: small change. Revision 4: facts checked against
`adigee/pf35` at commit `e03046a` (2026-11-19). Ready to build.

## Intent and why

Links sent to recruiters should read `adityagujaran.com/housinganywhere`, not
`adityagujaran.com/spear-hunting/housinganywhere/`. The phrase makes it obvious
the page was made for that one role. The private index of every page stays where
it is, at a URL only the owner uses.

## Goals

- `/housinganywhere`, `/orbisk`, `/wero` (and every future company folder under
  `spear-hunting/`) serve that company's page with the clean URL kept in the
  address bar. The trailing-slash form works too.
- The three links already sent (`/spear-hunting/housinganywhere/`, `/orbisk/`,
  `/wero/`) keep working and land on the clean URL. Same for any link sent under
  the older `/spearfishing/<company>` path.
- Analytics keep identifying the visit by company and tagging it "unlocked".
- The private index keeps working at `/spearhunting/índice/` and also opens at
  `/spearhuntingindex`. Its links use clean URLs.
- Adding a new company page needs no routing edit.

## Non-goals / anti-goals

- No folder moves or renames. `spearhunting/índice/` keeps its name and URL.
  The one file move is the opportunity map demo, into the template (see Design).
- Asset URLs (`/spear-hunting/<company>/assets/...`, shared CSS and JS) still
  contain the word. They show only in devtools.
- `spear-hunting/canvas-components.html` keeps its URL. It is the canvas
  template's component gallery and is never sent to recruiters.
- No other template modules are moved or shared. The prototype embed
  (`prototype.css`, `prototype.js`) and `benchmark.js` stay HousingAnywhere-only.
- No change to `components/analytics.js` logic, the "Spear-hunting visit" event
  name, or the values written to `pf_via` (`via: 'spear-hunting'` stays; it
  lives in localStorage and is never shown).
- No hiding of a page from someone who guesses another company slug.
- Failure case: the phrase still appearing in the address bar after landing, in
  the canonical tag, in `og:url`, or in a link preview.

## Facts checked in the repo (commit `e03046a`)

| Fact | Where |
|---|---|
| Company pages: `housinganywhere`, `orbisk`, `wero` | `spear-hunting/<slug>/index.html` |
| Private index lives in a separate top-level folder; its folder name is NFC-encoded, the same bytes as the live URL `/spearhunting/%C3%ADndice` that works today | `spearhunting/índice/index.html` |
| Index is generated from the company folders; links built on line 106 | `scripts/generate-spear-hunting-indice.mjs`, run with `npm run spearhunting:indice` |
| `data-company` is already used, as the **display name** the generator puts in the index (line 82). It is set on HousingAnywhere and Orbisk and missing on wero. So the slug needs a new attribute: `data-slug` | company `<html>` tags |
| New-page helper copies `_template/`, replaces `__SLUG__`, and already rejects slugs that fail `^[a-z0-9]+(?:-[a-z0-9]+)*$` | `scripts/new-spear-hunting-page.mjs` |
| Check script already enforces `noindex, nofollow`, alt text, no TODOs on ready pages and no dash characters, and has `--self-test` | `scripts/check-spear-hunting.mjs` |
| Line 46 infers the slug from the path. Line 49 sets `cs_unlock` with `path=/`. Line 50 writes `pf_via = { to: <slug>, via: 'spear-hunting' }`, so `to` holds the slug | `components/head.js` |
| Canonical and `og:url` use the **www** host: `https://www.adityagujaran.com/spear-hunting/<slug>/`. No `twitter:url` | company pages, both templates |
| Every company page and template already has `noindex, nofollow`. No `robots.txt`, no sitemap | |
| No relative URLs in company pages. All asset paths are root-absolute, including `map-data.json` (loaded via `data-src`) | |
| `package.json` exists: devDependencies plus one script (`spearhunting:indice`), no build script | repo root |
| `.vercelignore` excludes `dev/`, `_archive/` and `spear-hunting/_template/`, so `_template` is not deployed | |
| Top-level folders: none collide with a company slug. `unlocked/` has a page; `prototypes/` only holds `verify-rental/` | |
| No `spearfishing` folder or reference anywhere | |
| `map-demo.html` is the review page for the opportunity map, a reusable template module (`opportunity-map.js`, `opportunity-map.css`, `map-data.json`). It sits in the HousingAnywhere folder and loads HousingAnywhere's copies; the page doesn't link to it. The template's `opportunity-map.js` and `.css` are byte-identical to HousingAnywhere's | `spear-hunting/housinganywhere/map-demo.html`, `spear-hunting/_template/` |
| The helper copies **every** entry in `_template/` into the new company folder | `scripts/new-spear-hunting-page.mjs`, `createPage()` |
| Old-route mentions to update: generator line 106; `head.js` comments (lines 36, 73, 84); `nav.js` line 7; `analytics.js` line 20; `design.md` lines 376 and 402 | |

## Constraints

- Static site on Vercel, no build step, no existing `vercel.json`. Production
  host: `https://www.adityagujaran.com`.
- Pushing to `main` deploys to production. Work on a branch only.
- Don't add dependencies or scripts to `package.json`.
- Vercel order: redirects run **before** the filesystem; rewrites run **after**
  it, so real files and folders always win over a rewrite.
- `vercel.json` patterns are compiled by `@vercel/routing-utils`. A trailing
  `/?` is rejected as invalid (the deploy fails). Optional trailing slash is
  `{/}?`; without it a rule misses the trailing-slash form, which is how the
  three sent links are written.

## Approach (chosen)

Catch-all rewrite: `/:company` serves `/spear-hunting/:company/index.html`. Real
top-level files win, so existing pages are unaffected, and new companies need no
config edit. Risk: a company slug equal to a top-level folder would be shadowed,
so the helper refuses such slugs and the check script fails on them.

Rejected: one generated rule per folder (config can drift); moving folders to the
root (breaks root-absolute paths and the sent links).

## Design

### `vercel.json` (exact content)

```json
{
  "redirects": [
    { "source": "/spear-hunting/:company([a-z0-9-]+){/}?", "destination": "/:company", "permanent": false },
    { "source": "/spearfishing/:company([a-z0-9-]+){/}?", "destination": "/:company", "permanent": false }
  ],
  "rewrites": [
    { "source": "/spearhuntingindex", "destination": "/spearhunting/%C3%ADndice/index.html" },
    { "source": "/:company([a-z0-9-]+){/}?", "destination": "/spear-hunting/:company/index.html" }
  ]
}
```

- The slug pattern excludes dots and underscores, so `application.css`,
  `canvas.js`, `canvas-components.html` and `_canvas-template` are never
  redirected. `/spearhunting/...` (no hyphen) is a different path and is not
  matched either.
- Redirects are temporary (307). Vercel passes the query string through, so UTM
  tags survive.
- Rewrite order matters: `/spearhuntingindex` also matches the catch-all, so it
  stays first.
- Trailing slash on clean URLs is handled in the rewrite, not with a redirect: a
  redirect runs before the filesystem and would also strip slashes from real
  folders.
- The index alias points at the existing folder, percent-encoded. If it fails
  on the preview, delete only that rule. The old index URL keeps working
  regardless. Do not rename the folder.

### Company detection

Each company page's `<html>` gets `data-slug="<slug>"`, equal to its folder name.
Both templates get `data-slug="__SLUG__"`. Leave `data-company` as it is: it is
the display name.

In `components/head.js`, replace line 46 with:

```js
var shCompany = document.documentElement.getAttribute('data-slug');
```

Everything after it (cookie, `pf_via`) stays identical. `head.js` runs from
`<head>`, where `document.documentElement` already exists.

### Page source

- Company pages: canonical and `og:url` become
  `https://www.adityagujaran.com/<slug>` (www, no trailing slash).
- `_template` and `_canvas-template`: canonical and `og:url` become
  `https://www.adityagujaran.com/__SLUG__`.
- Asset paths and `og:image` stay as they are.

### Private index

In `scripts/generate-spear-hunting-indice.mjs` line 106, change the link from
`/spear-hunting/${encodeURIComponent(application.slug)}/` to
`/${encodeURIComponent(application.slug)}`. Run `npm run spearhunting:indice`
and commit the regenerated `spearhunting/índice/index.html`. The index's
canonical, `noindex`, stylesheet path and folder stay unchanged.

### Opportunity map demo moves into the template

The demo is a review page for a template module, so it lives with the module and
its placeholder data, not inside one company's page.

- `git mv spear-hunting/housinganywhere/map-demo.html spear-hunting/_template/opportunity-map-demo.html`
- Point its three module references at the template's copies:
  `/spear-hunting/_template/opportunity-map.css`,
  `/spear-hunting/_template/opportunity-map.js` and
  `data-src="/spear-hunting/_template/map-data.json"`.
- Delete its `canonical`, `og:url` and `twitter:url` tags (it no longer has a
  public URL). Keep its `noindex, nofollow` meta and `data-status="draft"`.
- `_template/` is in `.vercelignore`, so the demo is not deployed, like the rest
  of the template. Its old URL, `/spear-hunting/housinganywhere/map-demo.html`,
  stops working. Review it locally: run `python3 -m http.server 8000` from the
  repo root and open
  `http://localhost:8000/spear-hunting/_template/opportunity-map-demo.html`.
- Naming rule for future module review pages: `_template/<module>-demo.html`.

### New-page helper

In `scripts/new-spear-hunting-page.mjs`:

- Also refuse a slug that equals a top-level entry of the repo (any folder, or
  any file without an extension) or `spearhuntingindex`, with a clear error. The
  slug pattern check stays.
- When copying `_template/`, skip entries whose name ends in `-demo.html`, so
  review pages never land in a company folder.

### Check script additions (`scripts/check-spear-hunting.mjs`)

A company folder is a direct child of `spear-hunting/` whose name doesn't start
with `_` and that contains `index.html`. Add these failures:

1. A company folder name fails the slug pattern, or equals a top-level entry or
   `spearhuntingindex`.
2. A company page's `data-slug` is missing or differs from its folder name.
3. A company page's canonical or `og:url` is not exactly
   `https://www.adityagujaran.com/<slug>`.
4. A template's `data-slug`, canonical or `og:url` is not the `__SLUG__` form
   above.
5. Any `href` in a company page, template or `spearhunting/índice/index.html`
   matches `^/spear-hunting/[a-z0-9-]+/?(#.*)?$` (a link to an old page route).
6. A company folder contains an HTML file other than `index.html`.

Extend `--self-test` with one collision case (a fake company named `unlocked`
must be reported) and one mismatched `data-slug` case.

### Pageviews

Umami and Vercel record the browser URL, so new visits appear as
`/housinganywhere`; past visits stay under `/spear-hunting/...`. For a continuous
series per company, filter by the `link:<slug>` identity or the event's `to`
property (it holds the slug).

### Docs and comments

Describe the new route in `design.md` (lines 376 and 402: page URLs are now
`/<slug>`, the index also opens at `/spearhuntingindex`). In `design.md` line 406,
say the demo is `spear-hunting/_template/opportunity-map-demo.html`, viewed
locally, and give the `<module>-demo.html` rule. Update the comments in
`components/head.js` (36, 73, 84), `components/nav.js` (7) and
`components/analytics.js` (20).

## Builder instructions

### Ground rules

- Create branch `clean-company-urls`. Commit there and push the branch for a
  Vercel preview. Never push to or merge into `main`; Adi merges.
- Run the route test from a scratch directory outside the repo (Appendix). Don't
  add dependencies or scripts to `package.json`.
- Change nothing beyond this plan. If something needs a decision, stop and
  report.

### Step 0: Confirm the facts still hold

`git log --oneline -1`. If HEAD is not `e03046a`, re-check the facts table
quickly (company folders, `head.js` lines 46 to 50, generator line 106, the
`data-company` usage on generator line 82, top-level folders). If anything
differs in a way that affects this plan, stop and report.

### Steps

1. Create `vercel.json` with the exact content above.
2. Add `data-slug` to the three company pages and both templates.
3. Edit `components/head.js` line 46 as shown.
4. Update canonical and `og:url` in the three company pages and both templates.
5. Edit generator line 106, run `npm run spearhunting:indice`, and commit the
   regenerated index.
6. Move the map demo into the template as described.
7. Add the collision refusal and the `-demo.html` skip to the new-page helper.
8. Add the check-script failures and self-tests.
9. Update docs and comments.

### Local verification

- Route test (Appendix): every line passes.
- `node scripts/check-spear-hunting.mjs` and
  `node scripts/check-spear-hunting.mjs --self-test` both pass.
- Prove the collision check bites: temporarily create
  `spear-hunting/unlocked/index.html`, confirm the check script fails, delete it.
- `node scripts/new-spear-hunting-page.mjs unlocked` refuses.
- `node scripts/new-spear-hunting-page.mjs zz-test` creates a folder without
  `opportunity-map-demo.html` in it. Delete `spear-hunting/zz-test/` afterwards.
- The demo opens locally (command above) and the map renders with the
  template's placeholder data.
- Grep: no `href` to `/spear-hunting/<slug>/` remains in company pages,
  templates or the index.

### Hand-off

Push the branch. Open a pull request whose description contains the preview
checklist below. Do not merge.

### Final report

The result of Step 0, files changed, route test and check script output, and
anything skipped or left for Adi.

## Preview checklist (Adi, on the branch preview, real browser)

| Open | Expect |
|---|---|
| `/housinganywhere`, `/orbisk`, `/wero` | Page loads; address bar unchanged |
| `/housinganywhere/` | Page loads |
| `/spear-hunting/housinganywhere/`, `/spear-hunting/orbisk/`, `/spear-hunting/wero/` | Lands on the clean URL |
| `/spear-hunting/wero/?utm_source=test` | Lands on `/wero?utm_source=test` |
| `/spearfishing/wero/` | Lands on `/wero` |
| `/spearhunting/índice/` | Private index, as before; its links open clean URLs |
| `/spearhuntingindex` | Same index (if not, delete that one rule) |
| `/unlocked`, `/prototypes/verify-rental/`, `/` | Their own pages, as before |
| `/not-a-company-xyz` | 404 |
| `/spear-hunting/housinganywhere/map-demo.html` | 404 (the demo moved into the template) |
| View source on a company page | Canonical and `og:url` are `https://www.adityagujaran.com/<slug>` |
| Open a company page, then a case study | No password gate |
| DevTools, Network tab, on a company page | Umami request for the "Spear-hunting visit" event, carrying the slug |

Umami and Vercel Analytics may ignore preview domains, so check the network
request rather than the dashboards. After merging, paste one clean URL into
LinkedIn's Post Inspector (https://www.linkedin.com/post-inspector/) and confirm
the preview shows the clean URL.

## Appendix: route test

Approximates Vercel's static routing using Vercel's own rule compiler, against
the real files in the repo (skipping folders in `.vercelignore`). The preview is
the real test; this catches rule mistakes first. Against the repo at `e03046a`
plus the `vercel.json` above, all 24 cases pass.

```sh
mkdir -p /tmp/route-test && cd /tmp/route-test
npm init -y >/dev/null && npm i @vercel/routing-utils
# save the script below as /tmp/route-test/route-test.cjs, then:
node route-test.cjs /absolute/path/to/pf35
```

```js
// Local approximation of Vercel's static routing for this repo.
// Usage (from a scratch dir OUTSIDE the repo, after `npm i @vercel/routing-utils`):
//   node route-test.cjs /path/to/repo
// The preview deployment is the real test; this catches rule mistakes first.
const fs = require('fs');
const path = require('path');
const { getTransformedRoutes } = require('@vercel/routing-utils');

const repo = path.resolve(process.argv[2] || '.');
const cfg = JSON.parse(fs.readFileSync(path.join(repo, 'vercel.json'), 'utf8'));
const out = getTransformedRoutes(cfg);
if (out.error) { console.error('vercel.json rejected:', out.error.message); process.exit(1); }

const routes = out.routes;
const fsIdx = routes.findIndex(r => r.handle === 'filesystem');
const pre = routes.slice(0, fsIdx).filter(r => r.src);
const post = routes.slice(fsIdx + 1).filter(r => r.src);

function fileFor(urlPath) {
  const p = path.join(repo, decodeURIComponent(urlPath));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  const idx = path.join(p, 'index.html');
  if (fs.existsSync(idx)) return idx;
  return null;
}
function sub(tpl, m) { return tpl.replace(/\$(\d+)/g, (_, i) => m[+i] ?? ''); }

function resolve(urlPath) {
  for (const r of pre) {
    const m = urlPath.match(new RegExp(r.src));
    if (m && r.status) return { status: r.status, location: sub(r.headers.Location, m) };
  }
  const direct = fileFor(urlPath);
  if (direct) return { status: 200, file: path.relative(repo, direct) };
  for (const r of post) {
    const m = urlPath.match(new RegExp(r.src));
    if (!m) continue;
    const f = fileFor(sub(r.dest, m));
    if (f) return { status: 200, file: path.relative(repo, f) };
  }
  return { status: 404 };
}

const sh = path.join(repo, 'spear-hunting');
const companies = fs.readdirSync(sh, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('_') && fs.existsSync(path.join(sh, d.name, 'index.html')))
  .map(d => d.name);
const ignored = fs.existsSync(path.join(repo, '.vercelignore'))
  ? fs.readFileSync(path.join(repo, '.vercelignore'), 'utf8').split('\n').map(l => l.trim().replace(/\/$/, '')).filter(l => l && !l.startsWith('#'))
  : [];
const rootDirs = fs.readdirSync(repo, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'spear-hunting' && !ignored.includes(d.name)
    && fs.existsSync(path.join(repo, d.name, 'index.html')))
  .map(d => d.name);

const cases = [];
for (const c of companies) {
  const page = `spear-hunting/${c}/index.html`;
  cases.push([`/${c}`, { status: 200, file: page }]);
  cases.push([`/${c}/`, { status: 200, file: page }]);
  cases.push([`/spear-hunting/${c}`, { status: 307, location: `/${c}` }]);
  cases.push([`/spear-hunting/${c}/`, { status: 307, location: `/${c}` }]);
  cases.push([`/spearfishing/${c}/`, { status: 307, location: `/${c}` }]);
}
for (const d of rootDirs) cases.push([`/${d}`, { status: 200, file: `${d}/index.html` }]);
for (const f of ['application.css', 'canvas.js']) {
  if (fs.existsSync(path.join(sh, f))) cases.push([`/spear-hunting/${f}`, { status: 200, file: `spear-hunting/${f}` }]);
}
// _template is in .vercelignore (not deployed), so only _canvas-template is checked.
for (const t of ['_canvas-template']) {
  if (fs.existsSync(path.join(sh, t, 'index.html'))) cases.push([`/spear-hunting/${t}/`, { status: 200, file: `spear-hunting/${t}/index.html` }]);
}
const indexPage = 'spearhunting/\u00edndice/index.html';
cases.push(['/spearhuntingindex', { status: 200, file: indexPage }]);
cases.push(['/spearhunting/%C3%ADndice', { status: 200, file: indexPage }]);
cases.push(['/spearhunting/%C3%ADndice/', { status: 200, file: indexPage }]);
if (fs.existsSync(path.join(repo, 'prototypes/verify-rental/index.html'))) {
  cases.push(['/prototypes/verify-rental/', { status: 200, file: 'prototypes/verify-rental/index.html' }]);
}
cases.push(['/not-a-company-xyz', { status: 404 }]);

let fail = 0;
for (const [p, want] of cases) {
  const got = resolve(p);
  const ok = Object.keys(want).every(k => got[k] === want[k]);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${p.padEnd(40)} ${JSON.stringify(got)}${ok ? '' : '  expected ' + JSON.stringify(want)}`);
}
console.log(`\n${cases.length - fail}/${cases.length} passed. Companies: ${companies.join(', ')}. Root folders: ${rootDirs.join(', ')}`);
process.exit(fail ? 1 : 0);
```
## Addendum (2026-11-20): old index URL retired

Adi chose to retire `/spearhunting/índice/` in favour of `/spearhuntingindex`.
The folder moved to ASCII `spearhuntingindex/` (`index.html`, `index.css`), so
the accent rewrite rule is gone and `/spearhuntingindex` is a real folder.
`/spearhunting` and `/spearhunting/(.*)` redirect (307) to `/spearhuntingindex`.
`{/:path*}?` is rejected by Vercel's compiler and `:path*` misses the trailing
slash, hence the two explicit rules. Where the text above says
`spearhunting/índice/`, read `spearhuntingindex/`.
