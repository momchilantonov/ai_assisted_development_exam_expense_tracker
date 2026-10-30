# API contract v1 (frozen at Phase 2; backend maintains it)

Status: design-time contract. Nothing is implemented yet. The backend agent updates the status column and records any deviation in its handoff. Frontend and testing agents rely on this file only.

Base path `/api`. JSON bodies. Session cookie `expense_session` (HttpOnly, SameSite=Strict, Path=/). Unsafe methods (POST, PUT, DELETE): if an `Origin` header is present it must be in `ALLOWED_ORIGINS`, otherwise 403 `forbidden_origin`. No CORS.

## Error envelope (all errors)

`{"error": {"code": "<code>", "message": "<text>", "details": [...optional...]}}`
Codes: `not_authenticated` (401), `invalid_credentials` (401), `validation_error` (422), `not_found` (404), `forbidden_origin` (403), `internal_error` (500). No stack traces or internals.

## Types

- `Category`: one of `Food`, `Transport`, `Shopping`, `Bills`, `Entertainment`, `Healthcare`, `Other`.
- `Expense`: `{id: int, amount: string "12.34", category: Category, description: string|null, expense_date: "YYYY-MM-DD", created_at: ISO-8601 UTC, updated_at: ISO-8601 UTC}`.
- `ExpenseInput`: `{amount: string|number (max 2 decimals, 0.01..999999.99), category: Category, description?: string|null (trimmed, <= 500), expense_date: "YYYY-MM-DD"}`.
- Money is never sent as a binary float in responses; request numbers are parsed as decimals and rejected if they carry more than 2 decimals.

## Endpoints

| Method and path | Purpose | Auth | Request | Success | Errors | Status |
|---|---|---|---|---|---|---|
| GET `/api/health` | Liveness | No | - | 200 `{status:"ok"}` | - | implemented |
| POST `/api/auth/login` | Start session | No | `{username, password}` (both non-empty) | 200 `{username, expires_at}` + Set-Cookie | 401 `invalid_credentials` (same for unknown user and bad password), 422, 403 | implemented |
| POST `/api/auth/logout` | Delete session row, clear cookie | No (idempotent) | - | 204 | 403 | implemented |
| GET `/api/auth/me` | Auth status | Yes | - | 200 `{username, expires_at}` | 401 | implemented |
| GET `/api/categories` | Category list | Yes | - | 200 `Category[]` | 401 | planned |
| POST `/api/expenses` | Create | Yes | `ExpenseInput` | 201 `Expense` + `Location` header | 401, 422, 403 | planned |
| GET `/api/expenses` | List and filter | Yes | query below | 200 `{items: Expense[], total, limit, offset}` | 401, 422 | planned |
| GET `/api/expenses/{id}` | Read one | Yes | - | 200 `Expense` | 401, 404 | planned |
| PUT `/api/expenses/{id}` | Full replace | Yes | `ExpenseInput` | 200 `Expense` | 401, 404, 422, 403 | planned |
| DELETE `/api/expenses/{id}` | Delete | Yes | - | 204 | 401, 404, 403 | planned |
| GET `/api/dashboard/summary` | Statistics | Yes | - | 200 `Summary` | 401 | planned |

OpenAPI UI at `/api/docs`.

### List query parameters

`category` (single `Category`), `date_from` and `date_to` (ISO dates, both inclusive; `date_from > date_to` -> 422), `sort` = `date_desc` (default) or `date_asc` (ties broken by `id` in the same direction), `limit` (default 50, max 200), `offset` (default 0). Invalid values -> 422.

### Summary

`{total_amount: string, current_month_amount: string, expense_count: int, by_category: [{category, total: string, count: int}] (all 7 categories, zero-filled), recent: Expense[] (latest 5 by date, then id)}`. Dashboard ignores list filters. "Current month" uses `APP_TIMEZONE` (default UTC).

## Validation rules

- Login: `username` and `password` non-empty strings.
- Expense: amount > 0, <= 999999.99, at most 2 decimals; category in enum; description optional, trimmed, <= 500 characters; `expense_date` a valid ISO date.
- Path `id` must be a positive integer; unknown id -> 404 `not_found`.

## Authentication behaviour

- Every endpoint except `health`, `login`, `logout` and the docs requires a valid, unexpired session cookie, otherwise 401 `not_authenticated`.
- Session lifetime is absolute (`SESSION_TTL_MINUTES`, default 480). After logout the old cookie value yields 401.
- A page reload keeps the user logged in until expiry; the frontend checks `GET /api/auth/me` at start.
