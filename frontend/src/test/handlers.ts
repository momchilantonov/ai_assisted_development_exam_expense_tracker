import { http, HttpResponse } from "msw";

// Fake, test-only credentials.
export const TEST_USERNAME = "owner";
export const TEST_PASSWORD = "test-password";

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Healthcare",
  "Other",
];
const EXPIRES_AT = "2030-01-01T00:00:00Z";

interface MockExpense {
  id: number;
  amount: string;
  category: string;
  description: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export function makeExpense(
  id: number,
  overrides: Partial<MockExpense> = {},
): MockExpense {
  return {
    id,
    amount: "12.50",
    category: "Food",
    description: null,
    expense_date: "2026-01-15",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

const state = {
  loggedIn: false,
  username: TEST_USERNAME,
  expenses: [] as MockExpense[],
  nextId: 1000,
};

export function resetMockState(): void {
  state.loggedIn = false;
  state.username = TEST_USERNAME;
  state.expenses = [];
  state.nextId = 1000;
}

export function setMockExpenses(expenses: MockExpense[]): void {
  state.expenses = expenses;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validationError(field: string) {
  return HttpResponse.json(
    errorBody("validation_error", "Invalid request.", [
      { loc: ["query", field], msg: "Invalid value" },
    ]),
    { status: 422 },
  );
}

/** Starts the mock backend with a valid session, as if the cookie were already set. */
export function setMockLoggedIn(value = true): void {
  state.loggedIn = value;
}

export function errorBody(code: string, message: string, details?: unknown[]) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

const notAuthenticated = () =>
  HttpResponse.json(
    errorBody("not_authenticated", "Authentication required."),
    { status: 401 },
  );

const AMOUNT_BODY = /^\d{1,8}(\.\d{1,2})?$/;

function bodyError(field: string, msg: string) {
  return HttpResponse.json(
    errorBody("validation_error", "Invalid request.", [
      { loc: ["body", field], msg },
    ]),
    {
      status: 422,
    },
  );
}

interface ParsedInput {
  amount: string;
  category: string;
  description: string | null;
  expense_date: string;
}

/** Validates an ExpenseInput per the contract; returns the normalised input or a 422 response. */
function parseExpenseInput(
  raw: Record<string, unknown>,
): ParsedInput | Response {
  const amount =
    typeof raw.amount === "number" ? String(raw.amount) : raw.amount;
  if (typeof amount !== "string" || !AMOUNT_BODY.test(amount))
    return bodyError("amount", "Invalid amount");
  const cents = toCentsMock(amount);
  if (cents < 1 || cents > 99999999)
    return bodyError("amount", "Amount out of range");
  if (typeof raw.category !== "string" || !CATEGORIES.includes(raw.category)) {
    return bodyError("category", "Invalid category");
  }
  if (
    typeof raw.expense_date !== "string" ||
    !ISO_DATE.test(raw.expense_date)
  ) {
    return bodyError("expense_date", "Invalid date");
  }
  let description: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string")
      return bodyError("description", "Invalid description");
    const trimmed = raw.description.trim();
    if (trimmed.length > 500)
      return bodyError("description", "Description too long");
    description = trimmed === "" ? null : trimmed;
  }
  return {
    amount: formatCents(cents),
    category: raw.category,
    description,
    expense_date: raw.expense_date,
  };
}

function toCentsMock(amount: string): number {
  const [whole = "0", fraction = ""] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function formatCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

const notFound = () =>
  HttpResponse.json(errorBody("not_found", "Expense not found."), {
    status: 404,
  });

function parseId(raw: string | readonly string[] | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

function buildSummary() {
  const now = new Date().toISOString().slice(0, 7);
  let total = 0;
  let month = 0;
  const byCategory = CATEGORIES.map((category) => ({
    category,
    cents: 0,
    count: 0,
  }));
  for (const e of state.expenses) {
    const cents = toCentsMock(e.amount);
    total += cents;
    if (e.expense_date.startsWith(now)) month += cents;
    const row = byCategory.find((c) => c.category === e.category);
    if (row) {
      row.cents += cents;
      row.count += 1;
    }
  }
  const recent = [...state.expenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.id - a.id)
    .slice(0, 5);
  return {
    total_amount: formatCents(total),
    current_month_amount: formatCents(month),
    expense_count: state.expenses.length,
    by_category: byCategory.map((c) => ({
      category: c.category,
      total: formatCents(c.cents),
      count: c.count,
    })),
    recent,
  };
}

// Handlers follow docs/api-contract.md; expense endpoints are added with the features that use them.
export const handlers = [
  http.get("/api/health", () => HttpResponse.json({ status: "ok" })),

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    if (!body.username || !body.password) {
      return HttpResponse.json(
        errorBody("validation_error", "Invalid request.", [
          { loc: ["body"], msg: "Field required" },
        ]),
        { status: 422 },
      );
    }
    if (body.username !== TEST_USERNAME || body.password !== TEST_PASSWORD) {
      return HttpResponse.json(
        errorBody("invalid_credentials", "Invalid username or password."),
        {
          status: 401,
        },
      );
    }
    state.loggedIn = true;
    return HttpResponse.json({
      username: TEST_USERNAME,
      expires_at: EXPIRES_AT,
    });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    const body = (await request.json()) as {
      username?: unknown;
      password?: unknown;
    };
    const name = typeof body.username === "string" ? body.username.trim() : "";
    const pw = typeof body.password === "string" ? body.password : "";
    if (
      name.length < 3 ||
      name.length > 64 ||
      pw.length < 8 ||
      pw.length > 128
    ) {
      return HttpResponse.json(
        errorBody("validation_error", "Invalid request.", [
          { loc: ["body"], msg: "Invalid value" },
        ]),
        { status: 422 },
      );
    }
    if (name.toLowerCase() === TEST_USERNAME) {
      return HttpResponse.json(
        errorBody("username_taken", "Username is already taken."),
        { status: 409 },
      );
    }
    state.loggedIn = true;
    state.username = name;
    return HttpResponse.json(
      { username: name, expires_at: EXPIRES_AT },
      { status: 201 },
    );
  }),

  http.post("/api/auth/logout", () => {
    state.loggedIn = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/auth/me", () =>
    state.loggedIn
      ? HttpResponse.json({ username: state.username, expires_at: EXPIRES_AT })
      : notAuthenticated(),
  ),

  http.get("/api/categories", () =>
    state.loggedIn ? HttpResponse.json(CATEGORIES) : notAuthenticated(),
  ),

  http.get("/api/expenses", ({ request }) => {
    if (!state.loggedIn) return notAuthenticated();
    const q = new URL(request.url).searchParams;
    const category = q.get("category");
    const dateFrom = q.get("date_from");
    const dateTo = q.get("date_to");
    const sort = q.get("sort") ?? "date_desc";
    const limit = Number(q.get("limit") ?? 50);
    const offset = Number(q.get("offset") ?? 0);

    if (category !== null && !CATEGORIES.includes(category))
      return validationError("category");
    if (dateFrom !== null && !ISO_DATE.test(dateFrom))
      return validationError("date_from");
    if (dateTo !== null && !ISO_DATE.test(dateTo))
      return validationError("date_to");
    if (dateFrom && dateTo && dateFrom > dateTo)
      return validationError("date_from");
    if (sort !== "date_desc" && sort !== "date_asc")
      return validationError("sort");
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      return validationError("limit");
    if (!Number.isInteger(offset) || offset < 0)
      return validationError("offset");

    const direction = sort === "date_asc" ? 1 : -1;
    const matches = state.expenses
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => (dateFrom ? e.expense_date >= dateFrom : true))
      .filter((e) => (dateTo ? e.expense_date <= dateTo : true))
      .sort(
        (a, b) =>
          direction *
          (a.expense_date.localeCompare(b.expense_date) || a.id - b.id),
      );
    return HttpResponse.json({
      items: matches.slice(offset, offset + limit),
      total: matches.length,
      limit,
      offset,
    });
  }),

  http.post("/api/expenses", async ({ request }) => {
    if (!state.loggedIn) return notAuthenticated();
    const parsed = parseExpenseInput(
      (await request.json()) as Record<string, unknown>,
    );
    if (parsed instanceof Response) return parsed;
    const now = new Date().toISOString();
    const expense = {
      id: state.nextId++,
      ...parsed,
      created_at: now,
      updated_at: now,
    };
    state.expenses.push(expense);
    return HttpResponse.json(expense, {
      status: 201,
      headers: { Location: `/api/expenses/${expense.id}` },
    });
  }),

  http.get("/api/expenses/:id", ({ params }) => {
    if (!state.loggedIn) return notAuthenticated();
    const id = parseId(params.id);
    if (id === null) return validationError("id");
    const found = state.expenses.find((e) => e.id === id);
    return found ? HttpResponse.json(found) : notFound();
  }),

  http.put("/api/expenses/:id", async ({ params, request }) => {
    if (!state.loggedIn) return notAuthenticated();
    const id = parseId(params.id);
    if (id === null) return validationError("id");
    const index = state.expenses.findIndex((e) => e.id === id);
    if (index === -1) return notFound();
    const parsed = parseExpenseInput(
      (await request.json()) as Record<string, unknown>,
    );
    if (parsed instanceof Response) return parsed;
    const updated = {
      ...state.expenses[index]!,
      ...parsed,
      updated_at: new Date().toISOString(),
    };
    state.expenses[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete("/api/expenses/:id", ({ params }) => {
    if (!state.loggedIn) return notAuthenticated();
    const id = parseId(params.id);
    if (id === null) return validationError("id");
    const index = state.expenses.findIndex((e) => e.id === id);
    if (index === -1) return notFound();
    state.expenses.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/dashboard/summary", () =>
    state.loggedIn ? HttpResponse.json(buildSummary()) : notAuthenticated(),
  ),
];
