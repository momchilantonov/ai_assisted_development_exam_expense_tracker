import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { errorBody, makeExpense, setMockExpenses, setMockLoggedIn } from '../test/handlers'
import { renderApp } from '../test/renderApp'
import { server } from '../test/server'

async function fill(user: ReturnType<typeof userEvent.setup>, amount: string, category = 'Food') {
  await user.clear(screen.getByLabelText('Amount'))
  if (amount) await user.type(screen.getByLabelText('Amount'), amount)
  await user.selectOptions(screen.getByLabelText('Category'), category)
}

describe('new expense form', () => {
  it('shows field-level errors and sends nothing when invalid', async () => {
    setMockLoggedIn()
    let posted = false
    server.use(
      http.post('/api/expenses', () => {
        posted = true
        return new HttpResponse(null, { status: 500 })
      }),
    )
    renderApp('/expenses/new')
    await screen.findByLabelText('Amount')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText('Amount is required.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Amount')).toHaveFocus()

    await user.type(screen.getByLabelText('Amount'), '1.234')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText(/at most 6 digits and 2 decimals/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '0.00')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText('Amount must be at least 0.01.')).toBeInTheDocument()
    expect(posted).toBe(false)
  })

  it('rejects amounts above the maximum', async () => {
    setMockLoggedIn()
    renderApp('/expenses/new')
    await screen.findByLabelText('Amount')
    const user = userEvent.setup()
    await fill(user, '1000000')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText(/at most 6 digits/)).toBeInTheDocument()
  })

  it('rejects a description over 500 characters', async () => {
    setMockLoggedIn()
    renderApp('/expenses/new')
    await screen.findByLabelText('Amount')
    const user = userEvent.setup()
    await fill(user, '5')
    await user.click(screen.getByLabelText('Description (optional)'))
    await user.paste('x'.repeat(501))
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText('Description must be at most 500 characters.')).toBeInTheDocument()
  })

  it('creates an expense with a decimal-string amount, shows a toast and returns to the list', async () => {
    setMockLoggedIn()
    let sent: unknown
    server.use(
      http.post('/api/expenses', async ({ request }) => {
        sent = await request.clone().json()
        return undefined
      }),
    )
    renderApp('/expenses/new')
    await screen.findByLabelText('Amount')
    const user = userEvent.setup()
    await fill(user, '12.5', 'Transport')
    await user.clear(screen.getByLabelText('Date'))
    await user.type(screen.getByLabelText('Date'), '2026-02-03')
    await user.type(screen.getByLabelText('Description (optional)'), '  Bus pass ')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument()
    expect(sent).toEqual({ amount: '12.5', category: 'Transport', expense_date: '2026-02-03', description: 'Bus pass' })
    expect(await screen.findByText('Expense added.')).toBeInTheDocument()
    expect(await screen.findByText('Bus pass')).toBeInTheDocument()
  })

  it('shows server validation errors next to the field', async () => {
    setMockLoggedIn()
    server.use(
      http.post('/api/expenses', () =>
        HttpResponse.json(errorBody('validation_error', 'Invalid request.', [{ loc: ['body', 'amount'], msg: 'Too big' }]), {
          status: 422,
        }),
      ),
    )
    renderApp('/expenses/new')
    await screen.findByLabelText('Amount')
    const user = userEvent.setup()
    await fill(user, '5')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(await screen.findByText('Too big')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows an error toast and keeps the form when saving fails', async () => {
    setMockLoggedIn()
    server.use(
      http.post('/api/expenses', () => HttpResponse.json(errorBody('internal_error', 'Server broke.'), { status: 500 })),
    )
    renderApp('/expenses/new')
    await screen.findByLabelText('Amount')
    const user = userEvent.setup()
    await fill(user, '5')
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(await screen.findAllByText('Server broke.')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeEnabled()
    expect(screen.getByLabelText('Amount')).toHaveValue('5')
  })
})

describe('edit expense form', () => {
  it('loads the expense, saves changes and shows a toast', async () => {
    setMockLoggedIn()
    setMockExpenses([makeExpense(7, { amount: '20.00', category: 'Bills', description: 'Water' })])
    renderApp('/expenses')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: /Edit expense Water/ }))

    expect(await screen.findByRole('heading', { name: 'Edit expense' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Amount')).toHaveValue('20.00')
    expect(screen.getByLabelText('Category')).toHaveValue('Bills')
    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '21.75')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Expense updated.')).toBeInTheDocument()
    expect(await screen.findByText('21.75')).toBeInTheDocument()
  })

  it('shows an error for an unknown expense', async () => {
    setMockLoggedIn()
    renderApp('/expenses/99/edit')
    expect(await screen.findByRole('alert')).toHaveTextContent('Expense not found.')
  })

  it('shows not found for a non-numeric id without calling the API', async () => {
    setMockLoggedIn()
    renderApp('/expenses/abc/edit')
    expect(await screen.findByRole('alert')).toHaveTextContent('Expense not found.')
  })
})

describe('delete expense', () => {
  async function openDialog() {
    setMockLoggedIn()
    setMockExpenses([makeExpense(1, { description: 'Pizza' }), makeExpense(2, { description: 'Rent', category: 'Bills' })])
    renderApp('/expenses')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Delete expense Pizza/ }))
    return { user, dialog: await screen.findByRole('dialog', { name: 'Delete expense?' }) }
  }

  it('asks for confirmation, focuses Cancel, and cancel keeps the expense', async () => {
    const { user, dialog } = await openDialog()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete expense Pizza/ })).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const { user } = await openDialog()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('deletes after confirmation and shows a toast', async () => {
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Expense deleted.')).toBeInTheDocument()
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument()
    expect(screen.getByText('Rent')).toBeInTheDocument()
  })

  it('shows an error toast when deletion fails', async () => {
    server.use(
      http.delete('/api/expenses/:id', () => HttpResponse.json(errorBody('internal_error', 'Server broke.'), { status: 500 })),
    )
    const { user, dialog } = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Server broke.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('new expense control', () => {
  it('links to the new expense form from the list', async () => {
    setMockLoggedIn()
    renderApp('/expenses')
    await userEvent.setup().click(await screen.findByRole('link', { name: 'New expense' }))
    expect(await screen.findByRole('heading', { name: 'New expense' })).toBeInTheDocument()
  })
})
