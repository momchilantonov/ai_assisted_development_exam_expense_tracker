import { request } from "./client";
import type {
  Category,
  Expense,
  ExpenseInput,
  ExpenseList,
  ExpenseListQuery,
  Summary,
} from "./types";

export function getExpense(id: number): Promise<Expense> {
  return request<Expense>(`/expenses/${id}`);
}

export function createExpense(input: ExpenseInput): Promise<Expense> {
  return request<Expense>("/expenses", { method: "POST", body: input });
}

export function updateExpense(
  id: number,
  input: ExpenseInput,
): Promise<Expense> {
  return request<Expense>(`/expenses/${id}`, { method: "PUT", body: input });
}

export function deleteExpense(id: number): Promise<void> {
  return request<void>(`/expenses/${id}`, { method: "DELETE" });
}

export function getSummary(): Promise<Summary> {
  return request<Summary>("/dashboard/summary");
}

export function listExpenses(query: ExpenseListQuery): Promise<ExpenseList> {
  return request<ExpenseList>("/expenses", { query: { ...query } });
}

export function listCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}
