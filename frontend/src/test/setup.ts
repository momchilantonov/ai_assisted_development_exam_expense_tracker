import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetMockState } from './handlers'
import { server } from './server'

// Node's fetch rejects relative URLs; resolve them against the jsdom location.
const nativeFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return nativeFetch(new URL(input, window.location.href), init)
  }
  return nativeFetch(input, init)
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockState()
})
afterAll(() => server.close())
