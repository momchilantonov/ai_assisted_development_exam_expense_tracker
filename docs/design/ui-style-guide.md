# UI style guide (Notion-style expenses tracker)

Status: planned (task UI-01..UI-05). Updated by the documentation agent after the redesign with what was actually implemented.
Owner of the implementation: `frontend` agent. Behaviour, API and accessibility must not change.

## 1. Target look and source of truth

Reference: the public Notion template "Expenses Tracker" by Nic Rafael
(https://nicrafael.notion.site/Expenses-Tracker-5fcdff4afd1641859bc4301739ab6844).

What could be verified from the template page text: a page with an emoji icon and the title "Expenses Tracker"; an "Add New Expense" button; an expenses database with the columns Name, Description, Expense, Type of Expense, Frequency, Date Added; one emoji icon per row; a "This Month" view next to the full list; a "Total Expenses" summary figure; a calm, text-first layout.

What could NOT be verified: exact colours, fonts and spacing (the page is rendered in the browser and only its text was readable). The tokens below are therefore Notion's well-known default light palette and type scale, used as an approximation. If the human adds screenshots of the template to `docs/design/reference/`, the frontend agent must view them and adjust the tokens to match. No template assets (icons, images, text) are copied; only the general look is reproduced.

## 2. Design tokens

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#ffffff` | page background |
| `--color-bg-soft` | `#f7f6f3` | hover rows, callouts, table header |
| `--color-text` | `#37352f` | body text |
| `--color-muted` | `rgba(55, 53, 47, 0.65)` | secondary text, column headers |
| `--color-border` | `rgba(55, 53, 47, 0.16)` | inputs, buttons |
| `--color-border-soft` | `rgba(55, 53, 47, 0.09)` | table rules, cards |
| `--color-hover` | `rgba(55, 53, 47, 0.06)` | row and button hover |
| `--color-primary` | `#2383e2` (hover `#0077d4`) | primary button, links, focus ring |
| `--color-danger` | `#e03e3e` | errors, delete |
| `--color-success` | `#0f7b6c` | success toast |
| `--radius` | `4px` (cards and dialogs `6px`) | all controls |
| `--shadow-popover` | `0 8px 24px rgba(15, 15, 15, 0.12)` | dialogs and toasts only |

Font stack: `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji"`.
Scale: page title `clamp(1.75rem, 4vw, 2.5rem)` weight 700; section titles `1.25rem` weight 600; body `1rem`; table text `0.875rem`; column headers `0.75rem` muted. Line height 1.5. No decorative or display fonts and no extra font downloads.

Optional: a dark theme through `prefers-color-scheme: dark` with background `#191919` and text `rgba(255, 255, 255, 0.81)`. Skip it if it adds risk.

## 3. Category tags and icons (one fixed mapping)

| Category | Icon | Tag background | Tag text |
|---|---|---|---|
| Food | 🍽️ | `#fadec9` | `#49290e` |
| Transport | 🚌 | `#d3e5ef` | `#183347` |
| Shopping | 🛍️ | `#f5e0e9` | `#4c2337` |
| Bills | 🧾 | `#fdecc8` | `#402c1b` |
| Entertainment | 🎬 | `#e8deee` | `#412454` |
| Healthcare | 🩺 | `#dbeddb` | `#1c3829` |
| Other | 📦 | `#e3e2e0` | `#32302c` |

Tags are small rounded pills (radius 3px, padding `0 6px`, text 0.8125rem). The icon is decorative (`aria-hidden`); the category name stays as text so screen readers and tests still read it.

## 4. Layout and components

- Page shell: slim top bar (app name on the left, navigation, username and "Log out" on the right), content centred at max-width about 60 to 68rem, generous vertical whitespace, 1px borders instead of heavy shadows.
- Page header: emoji icon, large title, one muted sentence below; the primary action "Add New Expense" on the right.
- Expenses page: a database-style table with muted column headers (Name/Description, Amount, Category, Date, actions), row hover, tag pills for categories, right-aligned tabular numbers. View tabs "All", "This month", "Past month" above the table. These are only shortcuts that set the existing `date_from`/`date_to` filters in the frontend; no API or backend change. Keep the existing category filter, date range and sort controls.
- Dashboard: three summary cards ("Total Expenses", "This month", "Number of expenses") in a callout/gallery style, category breakdown as horizontal bars using the tag colours, "Recent expenses" as the same table style.
- Forms (login, sign-up, expense): labels above inputs, 1px border, 4px radius, blue focus ring, clear inline errors, primary button full width on mobile.
- Delete confirmation dialog and toasts: popover shadow, short copy, keyboard and focus behaviour unchanged.
- Empty, loading and error states: muted text plus an icon, same wording as before unless a test needs it changed.
- Responsive: usable at 360 px wide with no horizontal page scroll; the table becomes stacked rows or scrolls inside its own container.

## 5. Motion and interaction rules

Allowed: short transitions (120 to 200 ms, `ease`) on `opacity` and `transform` only; colour and background changes on hover and focus.
Required: respect `prefers-reduced-motion: reduce` (no transitions), wrap hover-only effects in `@media (hover: hover)`, keep visible `:focus-visible` outlines.
Not allowed: preloader, full-screen hero, scroll hijacking or smooth-scroll libraries, custom cursor, magnetic buttons, parallax, noise overlays, glassmorphism, animation of layout properties (width, height, margin, top).

## 6. Accessibility and quality gates

- Text contrast at least 4.5:1 (the tag pairs above satisfy this); interactive controls keep accessible names; do not remove labels, roles or `aria-*` used by tests.
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
