// Mirrors docs/api-contract.md.

export type ErrorCode =
  | 'not_authenticated'
  | 'invalid_credentials'
  | 'validation_error'
  | 'not_found'
  | 'forbidden_origin'
  | 'internal_error'
  | 'network_error'

export interface ErrorDetail {
  loc?: Array<string | number>
  msg?: string
  [key: string]: unknown
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: ErrorDetail[] }
}

export interface LoginRequest {
  username: string
  password: string
}

export interface Session {
  username: string
  expires_at: string
}

export type Category =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Healthcare'
  | 'Other'

export interface Expense {
  id: number
  amount: string
  category: Category
  description: string | null
  expense_date: string
  created_at: string
  updated_at: string
}

export type ExpenseSort = 'date_desc' | 'date_asc'

export interface ExpenseListQuery {
  category?: Category
  date_from?: string
  date_to?: string
  sort?: ExpenseSort
  limit?: number
  offset?: number
}

export interface ExpenseList {
  items: Expense[]
  total: number
  limit: number
  offset: number
}
