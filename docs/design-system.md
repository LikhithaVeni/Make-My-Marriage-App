# Design system

The visual foundation for **Make My Marriage**, the product. Each wedding inside it has its own title (the first is "KaLi's era") and monogram; see decision 48. Every colour, font size and corner radius in the app comes from this page. The tokens live in `src/app/globals.css` (Tailwind `@theme`), which removes Tailwind's default colours, font sizes and radii. Anything not listed here isn't available until it's added here first.

## Colour

| Token           | Value     | Tailwind example           | Use                                                     |
| --------------- | --------- | -------------------------- | ------------------------------------------------------- |
| `bg`            | `#FAF7F2` | `bg-bg`                    | Ivory page background                                   |
| `surface`       | `#FFFFFF` | `bg-surface`               | Cards, sidebar, top bar, menus; text on accent buttons  |
| `text`          | `#2D2423` | `text-text`                | Primary text                                            |
| `text-muted`    | `#776B68` | `text-text-muted`          | Secondary text, hints, unavailable items                |
| `border`        | `#E8DFD9` | `border-border`            | Card, input and divider borders                         |
| `accent`        | `#7A263A` | `bg-accent`, `text-accent` | Brand maroon: primary buttons, links, active nav, focus |
| `accent-hover`  | `#642033` | `hover:bg-accent-hover`    | Hovered primary buttons and links                       |
| `accent-tint`   | `#F4E9EC` | `bg-accent-tint`           | Active nav item, hovered secondary buttons and rows     |
| `success`       | `#386A50` | `text-success`             | Positive status (Completed, Paid, Attending)            |
| `warning`       | `#98651B` | `text-warning`             | Caution status (Pending, due soon)                      |
| `danger`        | `#A23A3A` | `text-danger`              | Errors, Overdue, destructive actions                    |
| `marigold`      | `#E8A838` | `fill-marigold`            | Illustrations only: diya flames, the kalash             |
| `marigold-deep` | `#C9761E` | `fill-marigold-deep`       | Illustrations only: diya bowls, shine lines             |

**Contrast (WCAG 2.2, measured).**

- `text` (12.8–15.1:1) and `accent` (8.2–9.7:1) pass AAA on `bg`, `surface` and `accent-tint`. White on `accent` is 9.7:1 (AAA).
- `text-muted` passes AA on `bg` (4.8:1) and `surface` (5.1:1), but **not on `accent-tint` (4.3:1)**, so don't put muted text on a tinted background.
- `success`, `warning` and `danger` pass AA on `bg` and `surface`. `warning` falls short on `accent-tint` (4.2:1).
- Status colours are for text, icons and borders; don't use them as large background fills.
- `marigold` and `marigold-deep` are for illustrations only (the drawings on log in and sign up). They don't meet text contrast, so never use them for text, icons that carry meaning, or status.

## Typography

| Font     | Role                                                   | Tailwind       |
| -------- | ------------------------------------------------------ | -------------- |
| Fraunces | Display and brand: the monogram, page titles, headings | `font-display` |
| Inter    | Interface: everything else (the default)               | `font-sans`    |

Both are self-hosted through `next/font`, so browsers make no requests to Google.

| Token     | Size / line height | Tailwind       | Use                                    |
| --------- | ------------------ | -------------- | -------------------------------------- |
| `display` | 48px / 1.1         | `text-display` | Landing hero (desktop)                 |
| `title`   | 32px / 1.2         | `text-title`   | Page hero on mobile, empty-state title |
| `heading` | 24px / 1.3         | `text-heading` | Top bar title, card and section titles |
| `body`    | 16px / 1.5         | `text-body`    | Default text, inputs, buttons          |
| `small`   | 14px / 1.5         | `text-small`   | Navigation, table cells, helper text   |
| `caption` | 12px / 1.4         | `text-caption` | Badges, timestamps, "Soon" labels      |

Weights: regular (400) for text, medium (500) for buttons, links, active nav and the brand name.

## Shape and spacing

- Cards: 14px radius (`rounded-card`), 1px `border` border, `surface` background, no shadow.
- Controls (buttons, inputs, nav items): 10px radius (`rounded-control`).
- Circles (monogram, avatars): `rounded-full`.
- Spacing uses Tailwind's default 4px scale. Page padding is 16px on mobile and 32px from 768px up.

## Components

- **Primary button:** `accent` background, `surface` text, 44px tall, `accent-hover` on hover. Use one per view.
- **Secondary button:** `surface` background, 1px `accent` border, `accent` text, `accent-tint` on hover.
- **Text link:** `accent`, medium weight, `accent-hover` on hover.
- **Wordmark (product):** the logo, then "Make My Marriage" in Fraunces, medium, `accent`. The logo is two linked oval rings with five short shine lines fanned above them, drawn as a 1.75px `surface` line inside a filled 36px `accent` circle. Inline SVG, no image file. Used on public pages: landing, sign up, log in.
- **Monogram (wedding):** the couple's initials ("LK" for KaLi's era) in Fraunces inside a thin (1px) `accent` circle. Text and CSS only, no image.
- **Navigation item:** `small` text, 44px tall. Active: `accent-tint` background with `accent` text. Unavailable: `text-muted` with a "Soon" caption, not a link.
- **Card** (`components/ui/Card.tsx`): the card style above with 24px padding, a Fraunces `heading` title, an optional muted note on the right, and an optional footer row above a `border` rule. The footer's **card link** is a text link with a → arrow, or `text-muted` with "Soon" when its page doesn't exist yet.
- **Stat:** `small` muted label, value in Fraunces `title`, optional `small` muted detail.
- **Progress bar:** 8px tall, fully rounded, `border` track with an `accent` fill (or a status colour). Announced to screen readers as a percentage with a label.
- **Badge:** pill (`rounded-full`), `caption` medium text, 1px border. Neutral is `text-muted` on `border`; accent is `accent` on `accent-tint`; status badges use `success`, `warning` or `danger` text with a 30% border of the same colour and no fill.
- **Empty state (in a card):** centred medium title, optional `small` muted line, optional action.
- **Text field** (`components/ui/TextField.tsx`): `small` medium label above, 44px input with `rounded-control` and a 1px `border` (`danger` when invalid), `accent` focus ring, and a `small` hint (`text-muted`) or error (`danger`) below, linked for screen readers. Password fields add a 44px show/hide button.
- **Form alert:** a `rounded-control` box with a 30% `danger` border, a `danger` icon and title, and a muted line of help. No fill.
- **Focus:** every interactive element shows a 2px `accent` outline on keyboard focus (`focus-visible`).

## Layout

- Mobile first: every screen works from 360px wide, and touch targets are at least 44px.
- From 768px: a 240px `surface` sidebar on the left and a 64px top bar with the page title.
- Below 768px: no sidebar. The top bar has a menu button that opens the same navigation in a drawer (a native `<dialog>`).
