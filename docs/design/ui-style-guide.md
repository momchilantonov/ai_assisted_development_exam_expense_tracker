# UI style guide (Notion-style expenses tracker)

Status: planned (task UI-01..UI-05). Updated by the documentation agent after the redesign with what was actually implemented.
Owner of the implementation: `frontend` agent. Behaviour, API and accessibility must not change.

## 1. Target look and source of truth

Primary reference (viewed, not just described): `docs/design/reference/image.png`, a screenshot of the Notion template "Expenses Tracker" by Nic Rafael (https://nicrafael.notion.site/Expenses-Tracker-5fcdff4afd1641859bc4301739ab6844). The frontend agent must open it and compare its own screenshots against it.

What the screenshot shows (verified by looking at it):
- **Dark theme**: near-black page background (about `#191919`), slightly lighter card and tab surfaces (about `#252525` to `#2f2f2f`), near-white text, thin top bar with a bottom border.
- **Cover banner** across the top (a photo in the template), a **large icon** overlapping it, a bold title "Expenses Tracker" (about 40 px), and a full-width **ochre callout** bar below the title.
- **Two columns on desktop**: the expenses table on the left (about 70 %), a narrow panel on the right with a "Total Expenses" card (about 30 %).
- **View tabs** above the table ("Expenses", "This Month", "Past Month", "Past Year"); the active tab is a rounded dark-gray pill with a small icon; filter, sort and search icons on the right of the tab row; a ghost-style "Add New Expense" button above the tabs.
- **Table**: muted header row with a small icon per column (Name, Description, Expense, Type of Expense, Frequency, Date Added), thin 1px row and column rules, a small emoji-like icon before each name, right-aligned money, coloured rounded **tag pills** (red/brown, green, ochre, blue, gray) with light text, and a footer row ("VALUES 4", "SUM $1,065.00").
- A blue primary button ("Start with this template", about `#2383e2`) in the top bar.

Fonts: Notion's system sans-serif stack (no web font is needed to match it). Exact hex values below are approximated by eye from the screenshot and from Notion's dark palette; adjust them by comparing screenshots side by side. Reproduce the look only: do not copy the photo, icons or text of the template.

Decisions that follow from the screenshot:
- **Dark theme is the default.** A light theme is optional (`prefers-color-scheme: light`) and must not block delivery.
- **Cover banner without the photo**: a 200 to 240 px tall CSS gradient/pattern banner (dark teal to dark blue, no image file) at the top of the Dashboard and Expenses pages, hidden on small screens (below 600 px). It is part of the layout, not a full-screen hero.
- **Columns mapped to our data model** (we have no "Frequency" and no separate "Name"): Name column = the description (or the category name when the description is empty) with the category icon in front; Expense = amount; Type of Expense = category tag; Date Added = date. Do not add a Frequency field or any API field.
- **View tabs** "Expenses (all)", "This month", "Past month", "Past year" only set the existing `date_from` and `date_to` filters in the frontend.
- **Right-hand panel**: "Total Expenses" and "This month" cards from `GET /api/dashboard/summary`; on mobile it stacks below the table.
- Table footer: "VALUES n" with the `total` count from the list response. No client-side SUM of a partial page (it would mislead); the right panel shows the real totals.

## 2. Design tokens (dark default)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#191919` | page background |
| `--color-surface` | `#252525` | cards, right panel, dialogs |
| `--color-surface-raised` | `#2f2f2f` | active tab pill, hovered controls |
| `--color-text` | `rgba(255, 255, 255, 0.81)` | body text; titles use `rgba(255, 255, 255, 0.92)` |
| `--color-muted` | `rgba(255, 255, 255, 0.46)` | column headers, secondary text |
| `--color-border` | `rgba(255, 255, 255, 0.13)` | inputs, buttons, top bar and table rules |
| `--color-hover` | `rgba(255, 255, 255, 0.055)` | row and button hover |
| `--color-primary` | `#2383e2` (hover `#0f6fcc`) | primary button, links, focus ring |
| `--color-callout` | `#5b4a1c` | callout bar |
| `--color-danger` | `#ff7369` | errors and delete (text on dark) |
| `--color-success` | `#4dab9a` | success toast |
| `--radius` | `4px` (cards `6px`, tabs `6px`) | all controls |
| `--shadow-popover` | `0 8px 24px rgba(0, 0, 0, 0.5)` | dialogs and toasts only |

Font stack: `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji"`.
Scale: page title `clamp(2rem, 5vw, 2.5rem)` weight 700; section titles `1.25rem` weight 600; body `0.9375rem` to `1rem`; table text `0.875rem`; column headers `0.8125rem` muted. Line height 1.5. No extra font downloads.

Optional light theme through `prefers-color-scheme: light`: background `#ffffff`, text `#37352f`, surface `#f7f6f3`, border `rgba(55, 53, 47, 0.16)`.

## 3. Category tags and icons (one fixed mapping, dark palette)

| Category | Icon | Tag background | Tag text |
|---|---|---|---|
| Food | 🍽️ | `#7d5f1d` | `rgba(255, 255, 255, 0.92)` |
| Transport | 🚌 | `#2a5a85` | `rgba(255, 255, 255, 0.92)` |
| Shopping | 🛍️ | `#7a3a5c` | `rgba(255, 255, 255, 0.92)` |
| Bills | 🧾 | `#8a3b3b` | `rgba(255, 255, 255, 0.92)` |
| Entertainment | 🎬 | `#5b3f86` | `rgba(255, 255, 255, 0.92)` |
| Healthcare | 🩺 | `#2d6a4a` | `rgba(255, 255, 255, 0.92)` |
| Other | 📦 | `#4a4a4a` | `rgba(255, 255, 255, 0.92)` |

Tags are small rounded pills (radius 3px, padding `0 6px`, text 0.8125rem), like the template. The icon is decorative (`aria-hidden`); the category name stays as text so screen readers and tests still read it.

## 4. Layout and components

- Page shell: slim top bar with a bottom border (icon and app name on the left, navigation links, username and "Log out" on the right), content area max-width about 78 rem on desktop, generous whitespace, 1px borders instead of heavy shadows.
- Page header: cover banner (see section 1), large emoji icon overlapping its bottom edge, bold title, optional ochre callout bar with one useful hint (for example how the view tabs work); the primary action "Add New Expense" above the tabs.
- Expenses page: two columns on desktop (table about 70 %, right panel about 30 %). View tabs with an active pill, toolbar icons on the right of the tab row for the existing category filter, date range and sort controls (they must stay keyboard-accessible with labels, for example as a compact filter bar or popover). Database-style table as described in section 1, row hover, footer "VALUES n".
- Dashboard: same page header; three summary cards ("Total Expenses", "This month", "Number of expenses") in the template's card style (`--color-surface`, 6px radius), category breakdown as horizontal bars in the tag colours, "Recent expenses" in the same table style.
- Forms (login, sign-up, expense): centred card on the dark background, labels above inputs, 1px border, 4px radius, blue focus ring, clear inline errors, full-width primary button on mobile.
- Delete confirmation dialog and toasts: popover shadow, short copy, keyboard and focus behaviour unchanged.
- Empty, loading and error states: muted text plus an icon, same wording as before unless a test needs it changed.
- Responsive: usable at 360 px wide with no horizontal page scroll; the banner is hidden below 600 px, the right panel stacks under the table, and the table scrolls inside its own container or becomes stacked rows.

## 5. Motion and interaction rules

Allowed: short transitions (120 to 200 ms, `ease`) on `opacity` and `transform` only; colour and background changes on hover and focus.
Required: respect `prefers-reduced-motion: reduce` (no transitions), wrap hover-only effects in `@media (hover: hover)`, keep visible `:focus-visible` outlines.
Not allowed: preloader, full-screen (100vh) hero, scroll hijacking or smooth-scroll libraries, custom cursor, magnetic buttons, parallax, noise overlays, glassmorphism, animation of layout properties (width, height, margin, top). The fixed-height cover banner from section 1 is allowed.

## 6. Accessibility and quality gates

- Text contrast at least 4.5:1 on the dark surfaces (check tag text and muted text; raise the muted alpha if needed); interactive controls keep accessible names; do not remove labels, roles or `aria-*` used by tests.
- Dependencies: none added (no animation, icon or UI libraries). Plain CSS in `frontend/src/index.css` or CSS files imported by components; emoji are text.
- `make check` and `make test-e2e` must pass; screenshots `login.png`, `signup.png`, `expenses.png`, `dashboard.png` are regenerated; add `expenses-mobile.png` at 360 px width.
- Behaviour, routes, API calls and validation rules are unchanged; tests change only where markup was deliberately restructured.

## 7. Evaluation of the `premium-frontend-ui` skill (ADR-012)

Source: github/awesome-copilot `skills/premium-frontend-ui/SKILL.md`, author Utkarsh Patrikar (a community contribution). Not installed.

- Stack fit: technically compatible with React and Vite. It targets Framer Motion, GSAP ScrollTrigger and Lenis for React, none of which we use or need.
- Purpose fit: poor. It describes Awwwards-style immersive landing pages (preloaders, 100vh hero, scroll-driven narratives, custom cursor, noise and glass effects, headlines up to 12vw). A data-entry expense app needs the opposite: calm, dense, readable and accessible.
- Style fit: the requested reference is a minimal Notion page, which conflicts with the skill's "brutalism / cinematic / cyber" directions.
- Reused ideas (adapted, no skill installed): animate only `transform` and `opacity`, respect `prefers-reduced-motion`, guard hover effects with `@media (hover: hover)`, a clear type hierarchy, crisp 16px body text.
- Security audit results for this skill were not checked; it contains no scripts.
