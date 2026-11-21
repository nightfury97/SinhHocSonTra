# Design — Sơn Trà Biodiversity Console

A locked design system for this app. Every screen redesign reads this file before
emitting code. Do not regenerate per screen — extend or amend this file when the
system needs to grow.

## Scope note — this is an operational app, not a marketing site

Hallmark's macrostructure catalogue (Bento Grid, Marquee Hero, Workbench, …) and nav/footer
archetypes (N1–N13, Ft1–Ft8) are built for landing pages. This product is a persistent
sidebar-shell operational tool for forest rangers (4 destinations: dashboard, map, species
catalogue, field-entry form) — there is no hero, no pricing, no footer. The redesign therefore
applies Hallmark's **anti-slop disciplines** (locked OKLCH tokens, restrained accent, hairline
rather than drop-shadow cards, real 8-state interactive components, typography purity, mobile
non-negotiables, motion restraint) to the existing sidebar-shell architecture, rather than
forcing a landing-page nav/macrostructure onto an app shell. This is a deliberate, stated
exception — see SKILL.md's non-destructive rule.

## Genre
editorial

## Macrostructure family
- App shell: fixed 250px dark side-rail (persistent nav, 4 destinations) + scrollable content
  canvas. Not a catalog macrostructure — see scope note above.
- Screens vary only in content composition:
  - **Dashboard** — KPI tile row + 2-up chart/monitoring row + 2-up feed/feature row.
  - **Map** — filter rail + spatial canvas + floating selection card.
  - **Species catalogue** — filterable list + detail rail.
  - **Field entry** — form + reports rail.

## Theme
Custom (tuned), anchored on the product's existing nature-conservation identity — refined into
precise OKLCH rather than replaced. Vibe: "cool rainforest ledger, terracotta waymark."

- `--color-paper` oklch(97% 0.014 95) — warm cream canvas
- `--color-paper-2` oklch(99% 0.006 90) — raised panel
- `--color-ink` oklch(23% 0.03 152)
- `--color-ink-2` oklch(51% 0.02 140)
- `--color-rule` oklch(90% 0.02 95)
- `--color-surface-dark` oklch(26% 0.045 155) — side-rail + dark feature panel
- `--color-accent` oklch(52% 0.13 40) — terracotta, primary signal (≤ 5% of any view)
- `--color-accent-2` oklch(50% 0.07 195) — teal, secondary categorical / data accent
- `--color-focus` oklch(56% 0.11 195) — focus ring, deliberately distinct from the accent

Axes: paper-band = light · display-style = roman-serif · accent-hue = warm.

Full token set (surfaces, ink, rule, accent, semantic status, taxon swatches, workflow status,
map terrain) lives in [`src/tokens.css`](src/tokens.css) — the single source of truth. Page code
never inlines a raw colour; every colour reference is `var(--token-name)`.

## Typography
- Display: Spectral, weight 600, normal style (never italic in headings)
- Body: IBM Plex Sans, weight 400/500
- Mono/outlier: IBM Plex Mono — used systematically for data labels, timestamps, tabular figures,
  and eyebrows (a deliberate "field-ledger" register, not a decorative outlier — the app is
  data-dense, so mono tags every data-adjacent label, not just two isolated slots)
- Scale: 1.25 ratio, `--text-xs` (10.9px) through `--text-2xl` (28px), plus `--text-display`
  clamp for stat/hero numerals
- Tabular numbers (`font-variant-numeric: tabular-nums`) on every data figure

## Spacing
4-point named scale (`--space-3xs` … `--space-3xl`) in `src/tokens.css`. Screens use named
tokens, never raw px.

## Motion
- Easings: `--ease-out` `cubic-bezier(0.16,1,0.3,1)`, `--ease-in`, `--ease-in-out`
- Durations: 100ms (instant) / 180ms (hover/short) / 260ms (medium)
- Reveal pattern: none — this is a working tool, not a marketing scroll. No page-load reveals.
- Reduced-motion fallback: all transitions collapse to 0.01ms via `prefers-reduced-motion`

## Microinteractions stance
- Every button, chip, nav link, and field ships hover / focus-visible / active states
  (`src/ui.css`) — the pre-redesign version had none.
- Focus rings never animate in; they appear instantly via `:focus-visible`.
- No card-lift-on-hover, no gradient sweeps, no bounce easing.

## CTA voice
- Primary: solid `--color-surface-dark` fill, `--radius-md`, medium weight (`.btn-primary`)
- Secondary: hairline `--color-rule` border, paper fill (`.btn-secondary`)
- Ghost / ancillary: no border, `--color-accent-2` text (`.btn-ghost`)
- On dark panels: `.btn-on-dark` — outline variant tuned for the dark feature card

## Per-page allowances
- No enrichment tier anywhere — function and data carry every screen, no illustration/photo
  placeholders beyond the two explicitly-labelled "drop your own asset here" slots that already
  existed (map basemap, species photo).

## What screens MUST share
- The side-rail nav voice, wordmark, and status panel.
- The accent (terracotta) and focus (teal) colour roles and their restrained usage.
- The Spectral/IBM Plex Sans/IBM Plex Mono type system.
- The spacing scale and hairline-panel component voice (`.panel`, no drop shadows at rest).
- The button/chip/badge/field component classes in `src/ui.css`.

## What screens MAY differ on
- Internal content composition (grid vs. list vs. form vs. spatial canvas) — driven by what
  each screen's job actually is, not by a rotation rule.

## Exports

### tokens.css
See [`src/tokens.css`](src/tokens.css) — the canonical token file, imported first in
`src/main.jsx`. Single-page/app project; no additional export formats (Tailwind `@theme`,
DTCG, shadcn) were requested.

## Change log
- 2026-08-15 — Initial system extraction + full-app redesign (Hallmark `redesign`, multi-page/
  app flow). Kept the existing Spectral + IBM Plex Sans + IBM Plex Mono pairing and the
  forest-green/terracotta/cream identity; replaced ad-hoc inline hex with locked OKLCH tokens,
  replaced the uniform drop-shadow card pattern with hairline panels, added real interaction
  states throughout, and fixed two real bugs surfaced during the redesign: the mobile header
  title/subtitle overflowing at narrow widths, and the mobile nav scrim intercepting clicks on
  the sidebar it was meant to sit behind.
- 2026-08-20 — Token-conformance pass (Hallmark `redesign`, no new theme/macrostructure — colour
  tokens were already clean). The screens' ~180 inline styles used raw px for spacing and
  font-size instead of the locked `--space-*`/`--text-*` scale. Moved panel padding into the
  shared `.panel`/`.panel-dark` base rule (removing ~10 duplicated per-component overrides) and
  mapped remaining margin/padding/gap/font-size values to their nearest scale token across all
  17 screen components. Left untouched, deliberately: decorative/geometric one-offs (icon and
  avatar box sizes, chart bar geometry, decorative circle overlays, map canvas positioning) —
  these are component-intrinsic dimensions, not spacing rhythm or type scale, and forcing them
  onto the 4-point/1.25-ratio scale would have degraded hand-tuned visual details rather than
  fixed drift.
