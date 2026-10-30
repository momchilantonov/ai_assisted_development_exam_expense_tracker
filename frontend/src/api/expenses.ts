import { request } from './client'
import type { Category, ExpenseList, ExpenseListQuery } from './types'

export function listExpenses(query: ExpenseListQuery): Promise<ExpenseList> {
  return request<ExpenseList>('/expenses', { query: { ...query } })
}

export function listCategories(): Promise<Category[]> {
  return request<Category[]>('/categories')
}
