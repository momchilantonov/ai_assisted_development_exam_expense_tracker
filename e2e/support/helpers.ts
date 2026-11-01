import { expect, type Page } from "@playwright/test";

export function credentials(): { username: string; password: string } {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password)
    throw new Error("E2E credentials missing (global setup did not run)");
  return { username, password };
}

export async function login(page: Page): Promise<void> {
  const { username, password } = credentials();
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

/** Fills and submits the real /signup form; does not assert the outcome. */
export async function submitSignup(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

/** Password generated at run time; never committed or printed. */
export function randomPassword(): string {
  return `Pw-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uniqueText(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function toCents(text: string): number {
  const [whole, frac = ""] = text.replace(/[^0-9.]/g, "").split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export interface DashboardNumbers {
  total: number;
  month: number;
  count: number;
  byCategory: Record<string, { count: number; total: number }>;
}

/** Reads the dashboard; the empty state (no expenses) reads as all zeros. */
export async function readDashboard(page: Page): Promise<DashboardNumbers> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const empty = page.getByText("No expenses yet.");
  const stats = page.getByText("Total spent");
  await expect(empty.or(stats)).toBeVisible();
  if (await empty.isVisible())
    return { total: 0, month: 0, count: 0, byCategory: {} };

  const stat = async (label: string) =>
    (
      await page
        .getByText(label, { exact: true })
        .locator("xpath=following-sibling::dd")
        .innerText()
    ).trim();
  const byCategory: DashboardNumbers["byCategory"] = {};
  const rows = page
    .getByRole("table", { name: "Spending by category" })
    .locator("tbody tr");
  for (let i = 0; i < (await rows.count()); i++) {
    const cells = rows.nth(i).locator("th, td");
    byCategory[(await cells.nth(0).innerText()).trim()] = {
      count: Number((await cells.nth(1).innerText()).trim()),
      total: toCents(await cells.nth(2).innerText()),
    };
  }
  return {
    total: toCents(await stat("Total spent")),
    month: toCents(await stat("This month")),
    count: Number(await stat("Expenses")),
    byCategory,
  };
}

export async function createExpenseViaUi(
  page: Page,
  e: { amount: string; category: string; date: string; description: string },
): Promise<void> {
  await page.goto("/expenses/new");
  await page.getByLabel("Amount").fill(e.amount);
  await page.getByLabel("Category").selectOption(e.category);
  await page.getByLabel("Date").fill(e.date);
  await page.getByLabel("Description (optional)").fill(e.description);
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();
}
