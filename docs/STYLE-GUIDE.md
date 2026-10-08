# 4 Rivers style guide

One page for how the product looks, so new screens match without guessing. The values live in `src/index.css` (tokens and
type classes) and `src/theme/theme.ts` (the documented source of the palette).

## Voice
Warm, plain, encouraging. Short sentences. Scripture first, then the practical step. Never salesy, never guilt. Sentence
case for headings ("What you'll learn"), not Title Case.

## Colors
| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Parchment | `#faf5ec` | `#1c1814` | Page background |
| Parchment deep | `#f2e9d8` | `#262019` | Soft bands, secondary buttons |
| Surface | `#ffffff` | `#2a2420` | Cards and inputs |
| Ink | `#2c2620` | `#f2ece0` | Headings and body text |
| Ink soft | `#5c5347` | `#b8ac98` | Secondary text |
| Line | `#e6dcc7` | `#3a332b` | Borders and dividers |
| Navy (water deep) | `#274b6d` | `#37739a` | Primary buttons, links, the source dot |
| Gold | `#c9a24b` | `#d4b06a` | Accents and highlights (text uses `gold-text`) |

**The four rivers** are the brand's color story. Each river keeps its color everywhere (cards, icons, progress, charts):
River 1 Income `#2f6f4f` green, River 2 Saving `#1f6f8b` teal, River 3 Investing `#3a5a9b` blue, River 4 Giving `#8a5a24` clay.
For small text in a river or gold color, use `readable()` or the `--color-*-text` tokens so contrast meets WCAG AA.
Never hard-code hex in components; use the tokens so dark mode works.

## Type
- **Headings:** Iowan Old Style / Palatino / Georgia (the "display" serif), semibold.
- **Interface and body copy:** the system sans (`font-ui`), for buttons, labels, forms, and short descriptive text.
- **Reading text** (lessons, Scripture, testimony): the serif body face, generous line height.

| Class | Size | Use |
| --- | --- | --- |
| `t-display` | 2.6 to 4.75rem | The home page headline, once |
| `t-h1` | 1.75 to 2.25rem | Page titles, major section titles |
| `t-h2` | 1.4 to 1.75rem | Section titles inside a page |
| `t-h3` | 1.25rem | Card titles |
| `t-h4` | 1.06rem | Small headings, list titles |
| `t-eyebrow` | 0.75rem caps | The small label above a heading |
| `t-lead` | 1.125rem | The sentence under a page title |

## Space and surfaces
- A page is a `page-stack` (2rem between sections). Landing sections use bigger gaps.
- **Cards** use `Card` (or `.panel`): large radius, hairline border, one soft shadow, `p-5` inside.
- A box inside a card uses `.panel-inner`. **Inputs and buttons** use the smaller `rounded-lg` or `rounded-xl`; pills are `rounded-full`.
- Four-color divider: `.river-rule`.

## Icons
- Features and navigation: the line set in `FeatureIcons.tsx` (24px grid, 1.75 stroke, round caps, current color).
- The four rivers: the hand-drawn set in `RiverIcons.tsx`, in the river's color.

## Motion
Short and soft: 200 to 600ms, ease-out. Pages fade in, home sections rise once, the hero streams draw in. Celebrations
(stars, confetti) are reserved for finishing something. Every animation is switched off under `prefers-reduced-motion`.

## Logo and brand images
The mark is one gold-or-navy source dot above four streams in the river colors (see `public/favicon.svg`). Keep clear space
equal to the dot's width around it; use it on parchment or the navy field only; never recolor the streams.
Regenerate the app icons, favicon and share card with `python3 tools/dev/make_brand_assets.py`.

## Accessibility
Contrast AA everywhere (axe runs on every key page in light and dark). Visible focus rings. Every control reachable by
keyboard. Headings in order. Images have alt text. Motion respects the visitor's setting.
