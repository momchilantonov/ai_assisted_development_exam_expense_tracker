import { http, HttpResponse } from 'msw'

// Fake, test-only credentials.
export const TEST_USERNAME = 'owner'
export const TEST_PASSWORD = 'test-password'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other']
const EXPIRES_AT = '2030-01-01T00:00:00Z'

interface MockExpense {
  id: number
  amount: string
  category: string
  description: string | null
  expense_date: string
  created_at: string
  updated_at: string
}

export function makeExpense(id: number, overrides: Partial<MockExpense> = {}): MockExpense {
  return {
    id,
    amount: '12.50',
    category: 'Food',
    description: null,
    expense_date: '2026-01-15',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

const state = { loggedIn: false, expenses: [] as MockExpense[] }

export function resetMockState(): void {
  state.loggedIn = false
  state.expenses = []
}

export function setMockExpenses(expenses: MockExpense[]): void {
  state.expenses = expenses
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function validationError(field: string) {
  return HttpResponse.json(
    errorBody('validation_error', 'Invalid request.', [{ loc: ['query', field], msg: 'Invalid value' }]),
    { status: 422 },
  )
}

/** Starts the mock backend with a valid session, as if the cookie were already set. */
export function setMockLoggedIn(value = true): void {
  state.loggedIn = value
}

export function errorBody(code: string, message: string, details?: unknown[]) {
  return { error: { code, message, ...(details ? { details } : {}) } }
}

const notAuthenticated = () =>
  HttpResponse.json(errorBody('not_authenticated', 'Authentication required.'), { status: 401 })

// Handlers follow docs/api-contract.md; expense endpoints are added with the features that use them.
export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ status: 'ok' })),

  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }
    if (!body.username || !body.password) {
      return HttpResponse.json(
        errorBody('validation_error', 'Invalid request.', [{ loc: ['body'], msg: 'Field required' }]),
        { status: 422 },
      )
    }
    if (body.username !== TEST_USERNAME || body.password !== TEST_PASSWORD) {
      return HttpResponse.json(errorBody('invalid_credentials', 'Invalid username or password.'), {
        status: 401,
      })
    }
    state.loggedIn = true
    return HttpResponse.json({ username: TEST_USERNAME, expires_at: EXPIRES_AT })
  }),

  http.post('/api/auth/logout', () => {
    state.loggedIn = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/auth/me', () =>
    state.loggedIn
      ? HttpResponse.json({ username: TEST_USERNAME, expires_at: EXPIRES_AT })
      : notAuthenticated(),
  ),

  http.get('/api/categories', () => (state.loggedIn ? HttpResponse.json(CATEGORIES) : notAuthenticated())),

  http.get('/api/expenses', ({ request }) => {
    if (!state.loggedIn) return notAuthenticated()
    const q = new URL(request.url).searchParams
    const category = q.get('category')
    const dateFrom = q.get('date_from')
    const dateTo = q.get('date_to')
    const sort = q.get('sort') ?? 'date_desc'
    const limit = Number(q.get('limit') ?? 50)
    const offset = Number(q.get('offset') ?? 0)

    if (category !== null && !CATEGORIES.includes(category)) return validationError('category')
    if (dateFrom !== null && !ISO_DATE.test(dateFrom)) return validationError('date_from')
    if (dateTo !== null && !ISO_DATE.test(dateTo)) return validationError('date_to')
    if (dateFrom && dateTo && dateFrom > dateTo) return validationError('date_from')
    if (sort !== 'date_desc' && sort !== 'date_asc') return validationError('sort')
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) return validationError('limit')
    if (!Number.isInteger(offset) || offset < 0) return validationError('offset')

    const direction = sort === 'date_asc' ? 1 : -1
    const matches = state.expenses
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => (dateFrom ? e.expense_date >= dateFrom : true))
      .filter((e) => (dateTo ? e.expense_date <= dateTo : true))
      .sort((a, b) => direction * (a.expense_date.localeCompare(b.expense_date) || a.id - b.id))
    return HttpResponse.json({ items: matches.slice(offset, offset + limit), total: matches.length, limit, offset })
  }),
]
