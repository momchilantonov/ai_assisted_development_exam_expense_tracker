import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { getMe } from './auth'
import { ApiError, request, setUnauthorizedHandler } from './client'
import { server } from '../test/server'
import { errorBody } from '../test/handlers'

describe('api client', () => {
  it('sends credentials and parses JSON on success', async () => {
    let credentials: RequestCredentials | undefined
    server.use(
      http.get('/api/health', ({ request: req }) => {
        credentials = req.credentials
        return HttpResponse.json({ status: 'ok' })
      }),
    )
    const result = await request<{ status: string }>('/health')
    expect(result).toEqual({ status: 'ok' })
    expect(credentials).toBe('include')
  })

  it('normalises the error envelope into an ApiError', async () => {
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json(errorBody('not_found', 'Missing.', [{ msg: 'x' }]), { status: 404 }),
      ),
    )
    const err = await request('/health').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 404, code: 'not_found', message: 'Missing.', details: [{ msg: 'x' }] })
  })

  it('falls back to a generic error for non-JSON failures', async () => {
    server.use(http.get('/api/health', () => new HttpResponse('Bad gateway', { status: 502 })))
    const err = await request('/health').catch((e: unknown) => e)
    expect(err).toMatchObject({ status: 502, code: 'internal_error' })
    expect((err as ApiError).message).not.toContain('Bad gateway')
  })

  it('reports network failures as network_error', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()))
    await expect(request('/health')).rejects.toMatchObject({ status: 0, code: 'network_error' })
  })

  it('returns undefined for 204 responses', async () => {
    server.use(http.get('/api/health', () => new HttpResponse(null, { status: 204 })))
    await expect(request('/health')).resolves.toBeUndefined()
  })

  it('serialises query parameters and skips empty values', async () => {
    let search = ''
    server.use(
      http.get('/api/health', ({ request: req }) => {
        search = new URL(req.url).search
        return HttpResponse.json({})
      }),
    )
    await request('/health', { query: { category: 'Food', limit: 10, date_from: '', sort: undefined } })
    expect(search).toBe('?category=Food&limit=10')
  })

  it('calls the unauthorized handler on 401 except when skipped', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    server.use(
      http.get('/api/health', () =>
        HttpResponse.json(errorBody('not_authenticated', 'Authentication required.'), { status: 401 }),
      ),
    )
    await expect(request('/health')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledTimes(1)

    await expect(request('/health', { skipUnauthorizedHandler: true })).rejects.toBeInstanceOf(ApiError)
    await expect(getMe()).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledTimes(1)
    setUnauthorizedHandler(null)
  })

  it('does not log request bodies or errors to the console', async () => {
    const spies = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')]
    server.use(
      http.post('/api/health', () =>
        HttpResponse.json(errorBody('invalid_credentials', 'Nope.'), { status: 401 }),
      ),
    )
    await request('/health', { method: 'POST', body: { password: 'secret-value' } }).catch(() => undefined)
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
