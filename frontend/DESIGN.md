# Dotty — design system

All tokens live in `app/globals.css` (`:root` + `@theme inline`). Components use tokens only; no raw hex in TSX.

## Principles

- Soft lavender **canvas**, white **cards** on top. Cards are separated by soft wide shadows, not borders. Borders only inside white surfaces (inputs, dialogs).
- One accent: periwinkle **primary** `#5F59FF`. Deep navy **ink** `#14142B` for headings and the strongest CTA on a page (search submit, active day chip, map toggle).
- Colour carries meaning: every event category and transport type has one **tone**, used the same way everywhere (plan card pin + tag + thumb, map marker, timeline bar, booking tile, dialog tile).
- Decoration is only for beauty and never touches content: mesh glow + faint grid with crosshair dots + tiny coordinate labels (`.m3-decor`), serif-italic accent word (`.m3-accent`), sparkle pill badge (`.m3-pill-badge`). Decor is `aria-hidden`, `pointer-events: none`, below content, low contrast. No glass / translucent surfaces.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--canvas` | `#EFF0F9` | page background |
| `--surface-bright` | `#FFFFFF` | cards, dialogs, inputs |
| `--surface-container-low / -container / -high / -highest` | `#F6F7FC → #D9DCEC` | nested fills, hover, segmented track |
| `--on-surface` / `--ink` | `#14142B` | text, dark CTA |
| `--on-surface-variant` | `#6B6F8E` | secondary text, meta |
| `--primary` / `--primary-container` / `--primary-soft` | `#5F59FF` / `#EBEAFF` / `#F5F4FF` | accent, tonal fill, selected row |
| `--outline` / `--outline-variant` | `#D5D8E8` / `#E8EAF4` | input border, dividers |
| `--success` `--warning` `--error` | `#12915A` `#C77700` `#D1344B` | status |

**Tones** — `data-tone="<name>"` sets `--tone-bg`, `--tone-fg`, `--tone-solid` (Tailwind: `bg-tone-bg`, `text-tone-fg`, `bg-tone-solid`):
`lavender`, `violet`, `rose`, `mint`, `sky`, `peach`, `amber`, `slate`.

| Category | Tone | Transport | Tone |
| --- | --- | --- | --- |
| excursion | lavender | plane | lavender |
| museum | violet | train | mint |
| theater | rose | car | peach |
| walk | mint | walk | slate |
| accommodation | sky | other / bus | amber |
| restaurant | peach | | |
| meeting | amber | | |
| other | slate | | |

Mapping lives in `CATEGORY_TONE` / `TRANSPORT_TONE` (`@entities/event`). `-solid` is for fills under white text (pins, markers), `-bg` + `-fg` for tags and tiles.

## Typography

Manrope (UI) + Cormorant Garamond italic (`--font-serif`, accent word only, max one per screen).

| Role | Class / size | Weight | Line-height |
| --- | --- | --- | --- |
| Display | `.m3-display` clamp(40–64px) | 800, −0.04em | 1.02 |
| Headline | `.m3-headline` clamp(30–40px) | 800 | 1.08 |
| Title | `.m3-title` 20px | 800 | 1.3 |
| Subtitle | 17px | 700–800 | 1.35 |
| Body | 16px | 500 | 1.55 |
| Label | `.m3-label` 14px | 700 | 1.4 |
| Meta | `.m3-meta` 13px, icon-left, tabular nums | 600 | — |
| Micro / eyebrow | `.m3-eyebrow` 11px uppercase +0.08em | 700 | — |

## Spacing, size, motion

- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 (`--space-2xs … --space-2xl`). Card padding 16–20px, page gutter 12–16px mobile.
- Targets ≥ 44px (`--target-size`), controls 48px (`--control-size`).
- Elevation: `--shadow-1` resting card, `--shadow-2` hover / floating chip, `--shadow-3` dialog / sheet / menu, `--shadow-primary` / `--shadow-ink` under filled CTAs.
- Motion: 120ms press, 180ms colour, 280ms spatial; easing `--ease-effects` (colour) and `--ease-spatial` (movement). Respect `prefers-reduced-motion`.

## Squircles

- **Every** rounded surface uses continuous-curvature corners. The base layer sets `corner-shape: squircle` on all elements inside `@supports (corner-shape: squircle)`, so a component only sets `border-radius` from a token.
- Radius tokens are tuned per mode, because a squircle looks ~1.6× tighter than the same circular radius:

| Token | Fallback (no corner-shape) | Squircle |
| --- | --- | --- |
| `--radius-xs` icon buttons, small tiles | 8px | 12px |
| `--radius-sm` / `--shape-small` buttons, inputs, segmented | 12px | 20px |
| `--radius-md` / `--shape-medium` rows, plan cards | 16px | 26px |
| `--radius-lg` / `--shape-large` cards, map, sheets | 22px | 36px |
| `--radius-xl` / `--shape-xlarge` dialogs, hero, cover | 28px | 48px |

- Nested radius = outer − padding (e.g. trip cover inside card: `calc(var(--shape-large) - 0.375rem)`).
- Truly round things stay round (`corner-shape: round`): `.rounded-full`, pills/badges/tags, markers, pins, day chips, switches, dots, spinners. Add a class to that list in `globals.css` instead of overriding ad hoc.
- Borders, `outline` focus rings and `box-shadow` follow the corner shape automatically; focus-visible = `2px solid var(--primary)` offset 3px; inputs use a 4px `--primary-container` ring via box-shadow.
- Firefox / Safari get the fallback radii — smooth, slightly smaller rounded rectangles.

## Components

- **Button** `.m3-button` 48px, radius-sm. Variants: filled (primary + `--shadow-primary`), `--tonal`, `--outlined` (white + shadow-1), `--text`, `--danger`. Ink CTA = `.m3-search-submit` / `.m3-map-toggle`. Press: scale .97.
- **Icon button** `.m3-icon-button` 40px, radius-xs, container fill; on canvas use white + shadow-1.
- **Input / search** `.m3-input` 48px, 1px outline, focus ring. Search bar `.m3-search-bar` = white card, fields separated by hairlines, ink submit.
- **Segmented** `.m3-segmented` track `--surface-container-high`, active pill white + shadow-1.
- **Tag** `.m3-tag` (tone pill, 11px/800), **pill badge** `.m3-pill-badge` (white, sparkle icon).
- **Card** white, radius-lg, shadow-1, hover shadow-2 + 2px lift (clickable only).
- **List row / plan card** `.m3-plan-item`: tone pin (number = place index), title, tag + clock meta, address, tone thumb. Hover `--surface-container`, selected `--primary-soft` + 1.5px primary inset ring.
- **Add placeholder** `.m3-plan-add`: dashed outline + small primary square "+".
- **Dialog** `.m3-dialog` radius-xl, shadow-3, sticky header with title + close; widths 36rem (`--medium`) for forms, 48rem for ticket. Padding 24/32px.
- **Empty state** `.m3-empty` dashed, primary-soft fill, tone tile icon, one line of help.
- **Skeleton** `.m3-skeleton` shimmer, mirrors the real layout (no "Loading…" boxes for pages).
- **Map marker** `.m3-marker` tone-solid circle, white 3px ring; `data-hover` scales 1.2, `data-selected` grows + tone halo; label `.m3-marker-label`.
- **Timeline item** bars `bg-tone-bg text-tone-fg` + tone ring, selected = primary filled.
- **Day chips** sticky, white pills; the day in view (IntersectionObserver) is ink.

## Layout

- Trip «План»: left scrolling document (cover → stats → bookings → sticky day chips → day cards), right sticky map card. Mobile (<1024px): plan first, map behind an ink «Карта» toggle (sticky 44dvh when open), selected item opens as a bottom sheet.
- Hover on a plan row highlights its marker; selecting a row selects the marker and opens the inspector.
