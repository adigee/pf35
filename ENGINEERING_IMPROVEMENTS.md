# Engineering Improvements Checklist

Ordered by impact. Tackle high-priority items first.

---

## High Priority

### Performance
- [ ] Throttle `handlePanels()` scroll handler using `requestAnimationFrame`
- [ ] Cache `querySelectorAll('.block-text')` result on `DOMContentLoaded` instead of querying on every scroll
- [ ] Batch all DOM reads before DOM writes in `handlePanels()` to eliminate layout thrashing
- [ ] Convert all PNG/GIF images to webp format
- [ ] Add `srcset` + `sizes` attributes for responsive image loading
- [ ] Add `loading="lazy"` to all images below the fold
- [ ] Compress and resize GIF walkthroughs (currently 6–12 MB each)

### Code Duplication
- [ ] Remove duplicate timeline HTML — render from a single shared data source
- [ ] Remove duplicate skills grid HTML — same fix
- [ ] Audit all `.b-*` vs `.p-*` paired blocks for further duplication

---

## Medium Priority

### Code Structure
- [ ] Extract CSS into a separate `style.css` file
- [ ] Extract JavaScript into a separate `main.js` file
- [ ] Normalize image filenames — remove spaces and URL encoding (`project%20content/` → `project-content/`)

### Error Handling
- [ ] Add null guards before all `getElementById` / `querySelector` calls
- [ ] Add `onerror` fallback on all `<img>` tags (show placeholder on load failure)
- [ ] Validate `localStorage` reads before applying theme state

### Breakpoint Consistency
- [ ] Define breakpoints as CSS custom properties or a shared JS constant
- [ ] Remove hardcoded `768` magic number from JavaScript (`window.innerWidth <= 768`)

### Git Hygiene
- [ ] Add image directories to `.gitignore` (or move to external storage / CDN)
- [ ] Consider using Git LFS for large binary assets if kept in repo

---

## Low Priority

### Build Tooling
- [ ] Add `package.json`
- [ ] Set up a minimal build step (e.g. vite or esbuild) for minification
- [ ] Add an image optimization script (e.g. `sharp` or `squoosh-cli`) to the build

### Security
- [ ] Replace hardcoded email with a contact form or bot-resistant obfuscation
- [ ] Add a `<meta http-equiv="Content-Security-Policy">` tag
- [ ] Add `<meta name="referrer" content="strict-origin-when-cross-origin">`

### Testing
- [ ] Add unit tests for `handlePanels()` scroll logic
- [ ] Add unit tests for theme toggle + localStorage persistence
- [ ] Add visual regression tests for key breakpoints (desktop / tablet / mobile)

### Developer Experience
- [ ] Add a `README.md` with local setup and deployment instructions
- [ ] Add `font-display: swap` to Google Fonts URL to prevent invisible text during load
- [ ] Add Core Web Vitals monitoring (e.g. via web-vitals.js)
