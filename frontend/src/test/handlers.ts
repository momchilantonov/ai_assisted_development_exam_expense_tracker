import { http, HttpResponse } from 'msw'

// Fake, test-only credentials.
export const TEST_USERNAME = 'owner'
export const TEST_PASSWORD = 'test-password'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Other']
const EXPIRES_AT = '2030-01-01T00:00:00Z'

const state = { loggedIn: false }

export function resetMockState(): void {
  state.loggedIn = false
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
]
