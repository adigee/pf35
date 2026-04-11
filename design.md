# Design System — pf35

This document is the single source of truth for all design decisions in this project. Every token, value, and rule defined here must be followed strictly. If a change is needed, update this document first, then the code.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Layout](#5-layout)
6. [Motion](#6-motion)
7. [Components](#7-components)
8. [Responsive Behavior](#8-responsive-behavior)
9. [Accessibility](#9-accessibility)
10. [Implementation Rules](#10-implementation-rules)

---

## 1. Design Principles

### Voice through restraint
The portfolio belongs to a designer. The design should demonstrate taste through discipline — not decoration. Every element earns its place.

### Warmth over sterility
Neither mode uses pure black/white. Dark mode uses near-black with warm ivory text. Light mode uses warm peach surfaces with cool navy text. This creates tactility and avoids the clinical coldness of pure `#000`/`#fff` systems.

### Single-font hierarchy
All text — body, headings, labels, even what would typically be monospaced — uses **Manrope**. Hierarchy is achieved entirely through weight, size, and letter-spacing, not through font switching. This constraint creates cohesion.

### Opacity as a design tool
Muted and subtle text are derived from the primary text color at reduced opacity, not separate hex values. This keeps secondary text perceptually related to the primary, even when the background changes.

### Two modes, one palette family
Dark and light modes are not simple inversions. Each has a distinct character — warm-dark and warm-light — while sharing a structural logic: background → surface → surface-2 → border → text (subtle → muted → full).

> **Note to designer:** This section should be reviewed and expanded with your own articulation of intent. These principles are inferred from the code. Correct or replace any that don't reflect your actual thinking.

---

## 2. Color System

### Implementation

Colors are defined as CSS custom properties on `:root` (dark mode default) and overridden under `[data-theme="light"]`. Theme is stored in `localStorage` and applied to `<html data-theme="...">`. System preference (`prefers-color-scheme`) is used as fallback.

```
Default:  Dark mode (:root)
Override: [data-theme="light"]
Storage:  localStorage key 'theme'
Element:  <html data-theme="dark|light">
```

---

### Dark Mode (Default)

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#040404` | Page background |
| `--color-surface` | `#0F0E0C` | Primary surface (panels, cards) |
| `--color-surface-2` | `#1A1916` | Secondary surface (elevated elements, tooltips) |
| `--color-border` | `rgba(248, 246, 238, 0.08)` | Borders, dividers |
| `--color-text` | `#F8F6EE` | Primary text |
| `--color-text-muted` | `rgba(248, 246, 238, 0.45)` | Secondary text, labels, metadata |
| `--color-text-subtle` | `rgba(248, 246, 238, 0.20)` | Tertiary text, placeholders, disabled |
| `--color-primary` | `#ACA0E8` | Interactive: links, CTAs, active states |
| `--color-primary-muted` | `rgba(172, 160, 232, 0.12)` | Primary backgrounds, soft highlights |
| `--color-accent` | `#F0956E` | Decorative highlights, emphasis |
| `--color-accent-muted` | `rgba(240, 149, 110, 0.12)` | Accent backgrounds |
| `--color-accent-on-accent` | `#040404` | Text rendered on accent-colored backgrounds |

**Character:** Midnight near-black with warm ivory text. Soft lavender for interaction, peachy coral for decoration. The warmth in the palette prevents harshness.

---

### Light Mode

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FFF3E8` | Page background |
| `--color-surface` | `#FFE0C4` | Primary surface |
| `--color-surface-2` | `#FFD0A8` | Secondary surface |
| `--color-border` | `rgba(26, 42, 94, 0.10)` | Borders, dividers |
| `--color-text` | `#1A2A5E` | Primary text |
| `--color-text-muted` | `rgba(26, 42, 94, 0.48)` | Secondary text, labels, metadata |
| `--color-text-subtle` | `rgba(26, 42, 94, 0.20)` | Tertiary text, placeholders, disabled |
| `--color-primary` | `#2147CC` | Interactive: links, CTAs, active states |
| `--color-primary-muted` | `rgba(33, 71, 204, 0.11)` | Primary backgrounds, soft highlights |
| `--color-accent` | `#F5600A` | Decorative highlights, emphasis |
| `--color-accent-muted` | `rgba(245, 96, 10, 0.11)` | Accent backgrounds |
| `--color-accent-on-accent` | `#FFF3E8` | Text rendered on accent-colored backgrounds |

**Character:** Warm peach cream background with deep navy text. Cobalt blue for interaction, burnt orange for decoration. Cool text on warm surface creates a subtle tension that reads as refined.

---

### Semantic Color Pairings

These pairings must not be broken. Never use a token outside its intended semantic role.

| Situation | Token to use |
|---|---|
| Page/app background | `--color-bg` |
| Card, panel, inset surface | `--color-surface` |
| Elevated element (tooltip, dropdown) | `--color-surface-2` |
| Any line or rule | `--color-border` |
| Body text, headings | `--color-text` |
| Captions, labels, metadata | `--color-text-muted` |
| Placeholder, disabled, de-emphasised | `--color-text-subtle` |
| Link, button, interactive element | `--color-primary` |
| Tinted background behind interactive | `--color-primary-muted` |
| Decorative, non-interactive highlight | `--color-accent` |
| Tinted background behind accent | `--color-accent-muted` |

---

### One-off Colors

These are intentional exceptions, not tokens. Do not generalise them.

| Value | Where | Why |
|---|---|---|
| `rgba(255,255,255,0.5)` | Image captions (dark mode) | Overlaid on photos — must be literal white |
| `rgba(0,0,0,0.35)` | Image captions (light mode) | Overlaid on photos — must be literal black |
| `#f4f4f6` | `.panel--decision` background | Deliberate light-gray deviation for that specific panel |
| `rgba(255,255,255,0.4)` | Email button border in contact panel | Contact panel uses inverted `--color-primary` bg; literal white required |

---

## 3. Typography

### Font Family

All text uses **Manrope** exclusively. There is no secondary or monospace font.

```css
--font-display: 'Manrope', sans-serif;
--font-body:    'Manrope', sans-serif;
--font-mono:    'Manrope', sans-serif;
```

**Loaded weights:** 300, 400, 500, 600, 700 (via Google Fonts)

**Rule:** Do not introduce a second typeface. If a future need feels like it requires a different font, solve it first through weight, size, or spacing. Only add a second font if that proves impossible.

---

### Type Scale

Base: `16px`. All values in `rem`.

| Token | rem | px | Role |
|---|---|---|---|
| `--text-2xs` | 0.5625 | 9 | Label Small — uppercase micro text |
| `--text-xs` | 0.6875 | 11 | Label — uppercase small text, sub-headings |
| `--text-sm` | 0.875 | 14 | Body Small — captions, secondary text |
| `--text-base` | 1.125 | 18 | Body — primary paragraph text |
| `--text-lg` | 1.75 | 28 | H4 — section headings (responsive) |
| `--text-2xl` | 2.75 | 44 | H3 — major headings (responsive) |
| `--text-3xl` | 4.3125 | 69 | H2 — large display (responsive) |
| `--text-4xl` | 5.5 | 88 | H1 — hero/title (responsive) |

The scale is deliberately non-linear. The gap between `--text-base` and `--text-lg` is intentionally large — there is no mid-range between body and heading. This creates sharp visual contrast between content and labels.

---

### Line Height

| Token | Value | Used for |
|---|---|---|
| `--leading-tight` | 1.1 | H1, H2 — large display text |
| `--leading-snug` | 1.18 | H3 |
| `--leading-normal` | 1.4 | H4, body captions |
| `--leading-body` | 1.6 | Body text — comfortable reading |
| `--leading-loose` | 1.8 | Body bold — extra breathing room at weight 600+ |
| `--leading-medium` | 1.5 | Body small — compact but readable |

---

### Letter Spacing

| Token | Value | Used for |
|---|---|---|
| `--tracking-tight` | -0.04em | H1 — tight tracking at large scale |
| `--tracking-snug` | -0.02em | H2 — subtle tightening |
| `--tracking-normal` | 0em | Default (no override needed) |
| `--tracking-wide` | 0.04em | Body links, timeline periods |
| `--tracking-wider` | 0.1em | Labels, uppercase text |
| `--tracking-widest` | 0.16em | Label Small — maximum optical spacing |

**Rule:** Negative tracking is only used on large display text (H1, H2). Wide/wider/widest tracking is only used on uppercase small text. Never apply wide tracking to sentence-case body text.

---

### Font Weight Usage

| Weight | Used for |
|---|---|
| 300 | Body text default, light emphasis |
| 400 | Standard body, timeline roles, skill names |
| 500 | Body captions, image descriptions |
| 600 | Nav name, bold accents within body |
| 700 | All headings, display text, strong emphasis |

---

### Type Scale — Responsive Overrides

The type scale adjusts at four breakpoints. Only heading tokens are overridden; body text (`--text-sm`, `--text-base`) remains fixed except at `≤810px` where `--text-sm` reduces to `0.75rem` (12px).

| Breakpoint | `--text-4xl` (H1) | `--text-3xl` (H2) | `--text-2xl` (H3) | `--text-lg` (H4) |
|---|---|---|---|---|
| `>1440px` (default) | 5.5rem / 88px | 4.3125rem / 69px | 2.75rem / 44px | 1.75rem / 28px |
| `1200–1440px` | 5.5rem / 88px | 3.25rem / 52px | 2.375rem / 38px | 1.75rem / 28px |
| `810–1200px` | 4.5rem / 72px | 2.5rem / 40px | 2.125rem / 34px | 1.5rem / 24px |
| `≤810px` | 2.875rem / 46px | 2.5rem / 40px | 1.625rem / 26px | 1.375rem / 22px |

---

### Text Style Classes

These classes encapsulate the full typographic treatment. Use these — do not reconstruct equivalent styles inline.

| Class | Size | Weight | Leading | Tracking | Transform | Notes |
|---|---|---|---|---|---|---|
| `.b-label` | `--text-2xs` | 400 | — | `--tracking-widest` | uppercase | Muted color |
| `.b-title` | `--text-2xl` | 700 | `--leading-snug` | `--tracking-snug` | — | Panel/section headings |
| `.b-title--xl` | `--text-4xl` | 700 | `--leading-tight` | `--tracking-tight` | — | Hero title |
| `.b-company` | `--text-sm` | 400 | — | — | — | Muted color, company context |
| `.b-body` | `--text-base` | 300 | `--leading-body` | — | — | Max-width 340px |
| `.b-body-bold` | `--text-base` | 600 | `--leading-loose` | — | — | Emphasis within body |
| `.b-body-caption` | `--text-sm` | 500 | `--leading-normal` | — | — | Captions |
| `.b-body-small` | `--text-sm` | 300 | `--leading-medium` | — | — | Secondary content |
| `.b-body-small-impact` | `--text-sm` | 700 | `--leading-medium` | — | — | Small but prominent |
| `.b-link` | `--text-xs` | 400 | — | `--tracking-wide` | uppercase | Primary color |
| `.b-tag` | `--text-2xs` | 400 | — | `--tracking-wide` | uppercase | Muted, bordered |
| `.b-aside` | `--text-sm` | 400 | — | — | — | Italic, muted |

---

## 4. Spacing

All spacing uses `rem` (base 16px). Use tokens — do not hardcode pixel values.

| Token | rem | px |
|---|---|---|
| `--sp-1` | 0.25 | 4 |
| `--sp-2` | 0.5 | 8 |
| `--sp-3` | 0.75 | 12 |
| `--sp-4` | 1 | 16 |
| `--sp-5` | 1.25 | 20 |
| `--sp-6` | 1.5 | 24 |
| `--sp-8` | 2 | 32 |
| `--sp-10` | 2.5 | 40 |
| `--sp-12` | 3 | 48 |
| `--sp-16` | 4 | 64 |
| `--sp-20` | 5 | 80 |
| `--sp-24` | 6 | 96 |

Note there is no `--sp-7`, `--sp-9`, etc. If an in-between value is needed, use the nearest token or reconsider the spacing decision. Do not create ad-hoc values.

---

## 5. Layout

### Structure

Desktop layout is a fixed **two-column grid**:

- **Left column:** `400px` fixed (`--left-col`). Contains the navigation sidebar — sticky, does not scroll.
- **Right column:** Flexible fill. Scroll context for the page.

At `≤768px` the layout collapses to a single column. The fixed sidebar is hidden; navigation appears inline.

### Layout Tokens

| Token | Value | Purpose |
|---|---|---|
| `--left-col` | 400px | Desktop sidebar width |
| `--nav-height` | 3.25rem (52px) | Sticky nav bar height |
| `--panel-transition` | 420ms ease | Panel enter/exit opacity |

### Panels

Panels are full-viewport overlays (fixed, `z-index: 1`) triggered from the left sidebar. They appear on the right side of the layout on desktop. Each panel is identified by a modifier class:

| Class | Background | Character |
|---|---|---|
| `.panel--intro` | `--color-bg` | Default page background |
| `.panel--bounce` | `--color-text` | Inverted — text becomes background |
| `.panel--unbabel` | `--color-bg` | Matches page background |
| `.panel--decision` | `--color-bg` | Matches page background |
| `.panel--trq` | `--color-bg` | Matches page background |
| `.panel--cocoon` | `--color-accent` | Accent-colored, high warmth |
| `.panel--experience` | `--color-bg` | Default page background |
| `.panel--skills` | `--color-text` | Inverted |
| `.panel--contact` | `--color-primary` | Primary color fill |

Panels fade in/out via `opacity` only (`transition: opacity var(--panel-transition)`). No translate or scale — the content feels like it's already there, revealed rather than arriving.

---

## 6. Motion

### Principles

- **Opacity-first:** State changes (panel reveal, theme switch, page load) use opacity. Avoid transforms for macro transitions.
- **Short and purposeful:** Interactive feedback (hover, toggle) uses durations under 200ms. Structural transitions (panels, theme) use 300–420ms.
- **Ease everywhere:** All transitions use `ease` (not `linear`, not `ease-in-out`). This is a deliberate consistency decision.

### Motion Values

| Element | Property | Duration | Easing | Notes |
|---|---|---|---|---|
| Page load | `opacity` (fade-in) | 250ms | ease | `@keyframes fade-in`, body animation |
| Theme switch | `background`, `color` | 300ms | ease | Applied to `body` |
| Panel enter/exit | `opacity` | 420ms | ease | Via `--panel-transition` token |
| Link hover | `color`, `text-decoration-color` | 120ms | ease | All `<a>` elements |
| Nav links hover | `color` | 120ms | ease | `.nav-links a` |
| Tooltip | `opacity`, `transform` (4px → 0) | 150ms | ease | Timezone pill tooltip |
| Theme toggle track | `background` | 300ms | ease | `.toggle-track` |
| Theme toggle knob | `transform` (translateX 0 → 16px) | 250ms | ease | `.toggle-knob` |
| Contact email btn | `background` | 200ms | ease | `.p-email` hover |
| Contact links | `color` | 150ms | ease | `.p-contact-links a` hover |
| Reading marker | `opacity` | 300ms | ease | Appears/disappears |

### Rules

- Do not use `transition: all`. Always specify the property.
- Do not add `transition-delay` without a documented reason.
- Hover transitions should be ≤150ms. Anything slower feels sluggish.
- Structural transitions (panels, theme) should be in the 300–420ms range.
- `@keyframes` animations should only be used for entry/appearance — not for looping or continuous motion.

---

## 7. Components

### Navigation

The sticky top bar (`--nav-height: 52px`) contains:
- **Name** (`.nav-name`): 14px, weight 600, display font, links to top — hover turns primary color
- **Nav links** (`.nav-links a`): 9px, uppercase, `--tracking-wider`, muted color — hover turns full text color

Nav links are hidden on mobile (`≤768px`).

### Timeline

`.b-timeline-item` uses a two-column grid: `5.5rem` (date column) + `1fr` (content). Items are separated by `--sp-3` gaps.

- Period: 11px, muted, mono-style tracking
- Role: 14px, weight 400
- Company: 9px, muted, uppercase

### Tags

`.b-tag` — 9px, uppercase, `--tracking-wide`, muted color, `1px solid --color-border` border, no fill. Tags signal taxonomy, not interactivity.

### Timezone Pill

Live clock display with a tooltip on hover. Tooltip uses `--color-surface-2` background with `--color-border` border. Appears at `translateY(0)` from `translateY(4px)` with 150ms ease.

### Theme Toggle

Located in the footer. Pill toggle (`border-radius: 9999px`) with a sliding knob. Dark mode: knob at `translateX(16px)`. Light mode: knob at `translateX(0)`. Label text fades between "Dark" and "Light" using `opacity` transition.

### Panel CTA (Link 1)

`.panel-cta` — used in right-column fixed panels, below the project hero image.

**Structure:** `inline-flex` row — label text on the left, filled circle with SVG arrow on the right.

```html
<a href="…" class="panel-cta [cs-link]">
  View project
  <span class="panel-cta-circle" aria-hidden="true">
    <svg viewBox="0 0 16 16">
      <line x1="3" y1="8" x2="13" y2="8"/>
      <polyline points="9 4 13 8 9 12"/>
    </svg>
  </span>
</a>
```

| Property | Value |
|---|---|
| Font | `--font-display`, `--text-sm` (14px), weight 500 |
| Default colour | `--color-text` (ivory dark / navy light) |
| Hover colour | `--color-primary` |
| Circle size | 36×36px, `border-radius: 50%` |
| Circle background | `--color-primary` |
| Arrow | Inline SVG, white stroke, `stroke-width: 1.75` |
| Hover — circle | Rotates 45° (`transform: rotate(45deg)`, 200ms ease) |
| Hover — text | Shifts to `--color-primary` (150ms ease) |
| Top spacing | `margin-top: --sp-10` |

**Variant:** Add class `cs-link` for internal page links — JS intercepts the click and plays the left-column exit transition before navigating. Omit `cs-link` for external links (use `target="_blank" rel="noopener"`).

---

### Mobile Visuals

When panels are hidden on mobile (`≤768px`), `.mobile-visual` cards replace them inline. Variants:
- `.mobile-visual--dark` — dark background
- `.mobile-visual--red` — `--color-primary` background  
- `.mobile-visual--soft` — `--color-primary-muted` background
- `.mobile-visual--plain` — default background
- `.mobile-visual--img` — image container with shadow

---

## 8. Responsive Behavior

| Breakpoint | Width | Key changes |
|---|---|---|
| Desktop large | >1440px | Default — full type scale |
| Desktop medium | 1200–1440px | H2 shrinks to 52px, H3 to 38px |
| Desktop small | 810–1200px | H1→72px, H2→40px, H3→34px, H4→24px |
| Tablet/Mobile | ≤810px | Full type scale reduction; `--text-sm` → 12px |
| Mobile | ≤768px | Single column layout; panels hidden; mobile visuals shown; nav links hidden |
| Small mobile | ≤400px | Minimum supported viewport |

### Rules

- Never set a `max-width` that causes content to overflow the left column at `400px`.
- Mobile layout is a complete redesign, not a scaled-down desktop — treat it as a separate context.
- Fixed panels do not exist on mobile. All panel content must have a mobile visual equivalent.

---

## 9. Accessibility

This project targets **WCAG 2.1 AA**.

### Contrast Requirements

| Usage | Minimum ratio |
|---|---|
| Normal text (<18px / <14px bold) | 4.5:1 |
| Large text (≥18px / ≥14px bold) | 3:1 |
| UI components and focus indicators | 3:1 |

### Known Checks

- `--color-text` (`#F8F6EE`) on `--color-bg` (`#040404`) — high contrast, passes AAA
- `--color-primary` (`#ACA0E8`) on `--color-bg` (`#040404`) — verify interactive text contrast ≥4.5:1
- `--color-text-muted` (45% ivory on `#040404`) — decorative/secondary; must still pass 3:1 where conveying information
- Light mode: `--color-text` (`#1A2A5E`) on `--color-bg` (`#FFF3E8`) — passes

### Rules

- All interactive elements must have visible focus styles.
- `text-transform: uppercase` is CSS-only and does not affect accessible text — acceptable.
- Opacity-based text colors must be checked at each breakpoint and each mode. An opacity that passes on one background may fail on another.
- Do not rely on color alone to convey state or meaning.

> **Note:** A full contrast audit against all token pairings has not been documented here. This should be completed and recorded in this section.

---

## 10. Implementation Rules

These rules are strict. They exist because this is a small, deliberate codebase — inconsistency here is more damaging than in a large system.

1. **Use tokens, not values.** Every color, size, spacing, and duration must reference a CSS variable. Raw hex codes and pixel values in CSS are a signal that a token is missing or being bypassed.

2. **Use text style classes.** Never reconstruct `.b-body`, `.b-label`, etc. inline. If the class doesn't exist for a use case, create it and document it here.

3. **Extend, don't override.** If a component needs a variation, add a modifier class. Do not override token values inside a component rule.

4. **Update this document when the design changes.** A code change that introduces a new token, value, or interaction without a corresponding update to `design.md` is incomplete.

5. **No new fonts.** Manrope only. See [Typography](#3-typography).

6. **No new hardcoded colors.** Only the one-off exceptions listed in [Color System](#2-color-system) are permitted. New cases require a token.

7. **Both modes must work.** Every new component or style must be tested in both dark and light mode. The theme system is semantic — if you use the right tokens, both modes come for free.

8. **Motion must be intentional.** New transitions must be added to the [Motion](#6-motion) table with documented rationale.

---

*Last updated: 2026-04-11*
