---
name: Frontend conventions
description: React/TypeScript/Vite conventions for the expense tracker frontend, including auth state, forms, accessibility and component tests.
applyTo: 'frontend/**'
---
# Frontend conventions

Layout: `frontend/src/{api,auth,pages,components,lib,test}`; routes `/login`, `/`, `/expenses`, `/expenses/new`, `/expenses/:id/edit`. Vite dev server on port 5173 with a proxy of `/api` to `http://127.0.0.1:8000` (same-origin, no CORS). `package.json` must define scripts `dev`, `build`, `lint`, `typecheck` (`tsc -b`), `test` (`vitest`) because the Makefile calls them.

## Code
- TypeScript `strict: true`; no `any`; function components and hooks only. Plain CSS with CSS variables; no UI or chart library (the category chart is hand-written SVG).
- All HTTP goes through `src/api/client.ts` (`fetch` with `credentials: 'include'`); typed endpoint modules mirror `docs/api-contract.md`. Do not invent endpoints, fields or auth behaviour; if the contract is missing something, record it in your handoff.
- Local state with hooks and context; no global state library.

## Authentication
- The session is an HttpOnly cookie: never store tokens, passwords or user data in `localStorage` / `sessionStorage`, and never read the cookie.
- `AuthContext` calls `GET /api/auth/me` on boot. `ProtectedRoute` redirects unauthenticated users to `/login?next=<path>`. The API client treats any 401 (except from login) as "logged out" and redirects. This supplements, never replaces, backend enforcement.
- Show a generic message for failed login (use the server message; do not distinguish username vs password).

## Money and dates
- Amounts are strings. Validate with `^\d{1,6}(\.\d{1,2})?$` and range 0.01..999999.99 in `lib/money.ts`; format with `Intl.NumberFormat`; never add amounts as floats. Dates are `YYYY-MM-DD`.

## UX
- Visual design (tokens, tags, layout, motion limits) follows `docs/design/ui-style-guide.md` (ADR-012); do not add animation, icon or UI libraries.
- Every data view has loading, empty and error states; actions give success feedback (toast); delete requires confirmation.
- Accessibility: semantic elements, labels bound to inputs, `aria-live` for errors/toasts, keyboard-operable dialogs with focus management, visible focus. Responsive layout (usable at 360 px width).
- Form validation mirrors backend rules and shows field-level messages.

## Tests (own `src/**/*.test.tsx`)
- Vitest + React Testing Library + jsdom; MSW in `src/test/` mocks the network following the contract. Test behaviour through the DOM (roles, labels), not implementation. Cover: login success/failure, protected redirect, logout, 401 handling, dashboard and list rendering, form validation, create/edit, delete confirmation, loading and error states. Flow-level tests in `frontend/tests/` belong to the `testing` agent.
