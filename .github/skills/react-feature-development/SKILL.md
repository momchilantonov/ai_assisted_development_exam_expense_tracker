---
name: react-feature-development
description: Use when adding or changing a frontend feature in the React/TypeScript expense tracker - types, API module, component, state, form validation, accessibility states and component tests.
---
# React feature workflow

Follow `.github/instructions/frontend.instructions.md`; apply the external `vercel-react-best-practices` skill only for generic React rules (ignore Next.js/server-component rules).

## Steps
1. **Read** the relevant section of `docs/api-contract.md`; types in `src/api/types.ts` must mirror it.
2. **API module** in `src/api/` using the shared client; no ad-hoc `fetch` in components.
3. **Component/page** in `src/components` or `src/pages`; functional components and hooks; handle loading, empty, error and success states.
4. **Forms:** controlled inputs, labels, field-level validation matching backend rules (`lib/money.ts`), disabled submit while pending, server error display.
5. **Routing/auth:** protected pages sit under `ProtectedRoute`; 401 handling stays centralised in the client.
6. **Tests:** colocated `*.test.tsx` with React Testing Library + MSW; query by role/label; cover validation, success, failure and loading/empty states.
7. **Verify:** `make lint-frontend`, `make typecheck-frontend`, `make test-frontend`; check the page in the dev server at 360 px and desktop widths when practical.
8. **Hand off** with `agent-handoff`; log with `ai-dev-evidence`.

## Output
Components, API module, tests, handoff block with real output. Record any contract gap in the handoff instead of working around it.
