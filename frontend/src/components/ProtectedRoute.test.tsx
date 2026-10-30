import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { errorBody, setMockLoggedIn } from '../test/handlers'
import { renderApp } from '../test/renderApp'
import { server } from '../test/server'

describe('protected route', () => {
  it('redirects anonymous users to login with the requested path', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expense Tracker' })).not.toBeInTheDocument()
  })

  it('shows a loading status while the session is being checked', async () => {
    server.use(
      http.get('/api/auth/me', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json(errorBody('not_authenticated', 'Authentication required.'), { status: 401 })
      }),
    )
    renderApp('/')
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('renders the page when the session is valid', async () => {
    setMockLoggedIn()
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Expense Tracker' })).toBeInTheDocument()
  })

  it('treats a failing session check as logged out', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.error()))
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})
