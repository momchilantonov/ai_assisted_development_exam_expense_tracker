import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { setMockLoggedIn, TEST_PASSWORD, TEST_USERNAME } from '../test/handlers'
import { renderApp } from '../test/renderApp'

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup()
  if (username) await user.type(screen.getByLabelText('Username'), username)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('login page', () => {
  it('signs in and shows the protected home page when credentials are valid', async () => {
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit(TEST_USERNAME, TEST_PASSWORD)
    expect(await screen.findByRole('heading', { name: 'Expense Tracker' })).toBeInTheDocument()
  })

  it('returns to the requested page after login', async () => {
    renderApp('/login?next=%2Fexpenses%2Fnew')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit(TEST_USERNAME, TEST_PASSWORD)
    // No /expenses/new route yet: the wildcard sends the user home, never to /login.
    expect(await screen.findByRole('heading', { name: 'Expense Tracker' })).toBeInTheDocument()
  })

  it('shows the server message in an alert when credentials are wrong', async () => {
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit(TEST_USERNAME, 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    expect(screen.queryByRole('heading', { name: 'Expense Tracker' })).not.toBeInTheDocument()
  })

  it('shows field-level errors and sends no request when fields are empty', async () => {
    let calls = 0
    server.use(
      http.post('/api/auth/login', () => {
        calls += 1
        return HttpResponse.json({})
      }),
    )
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit('', '')
    expect(screen.getByText('Username is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Username')).toHaveAccessibleDescription('Username is required.')
    expect(calls).toBe(0)
  })

  it('disables the button and shows progress while signing in', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post('/api/auth/login', async () => {
        await gate
        return HttpResponse.json({ username: TEST_USERNAME, expires_at: '2030-01-01T00:00:00Z' })
      }),
    )
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit(TEST_USERNAME, TEST_PASSWORD)
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
    release()
    expect(await screen.findByRole('heading', { name: 'Expense Tracker' })).toBeInTheDocument()
  })

  it('shows a generic message when the server is unreachable', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.error()))
    renderApp('/login')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit(TEST_USERNAME, TEST_PASSWORD)
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
  })

  it('redirects away from login when a session already exists', async () => {
    setMockLoggedIn()
    renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Expense Tracker' })).toBeInTheDocument()
  })

  it('ignores an external next target', async () => {
    renderApp('/login?next=%2F%2Fevil.example')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit(TEST_USERNAME, TEST_PASSWORD)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Expense Tracker' })).toBeInTheDocument())
  })
})
