# Unify tooltip typography

## Context

`components/tooltip.js` is already a single shared tooltip primitive
(`data-tooltip` attribute → `.b-tt-anchor` / `.b-tt` bubble), used by both
the "Based in Lisbon" location text and the email button's "Click to copy"
hint (added in this branch). Despite sharing one component, the two
tooltips read as visually different: the Lisbon bubble shows plain
lowercase text, while the email bubble shows bold, uppercase, letter-spaced
text.

## Problem

The `.b-tt` bubble's injected styles don't reset typography, so it
inherits `font-weight`, `text-transform`, and `letter-spacing` from
whatever element it's mounted inside. The Lisbon anchor is a plain text
span, so the tooltip looks plain. The email anchor is a `.btn` (mono,
weight 600, uppercase, letter-spaced CTA styling per `style.css:136-151`),
so the tooltip inherits all of that and renders like a different
component.

## Fix

Make `.b-tt` typography self-contained in the style block injected by
`components/tooltip.js`: explicitly set `font-family: var(--font-body)`,
`font-weight: 400`, `font-style: normal`, `text-transform: none`,
`letter-spacing: normal`, `text-align: left`. No markup or behavior
changes — same component, same JS, now guaranteed to look identical
regardless of the anchor's own typography.

## Verification

Screenshotted both tooltips locally (Playwright, hover state) before and
after. Before: email tooltip read bold/uppercase/mono ("CLICK TO COPY").
After: both tooltips render identically — lowercase, regular weight,
sans-serif.
