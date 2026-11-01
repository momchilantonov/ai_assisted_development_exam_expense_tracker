import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  TEST_PASSWORD,
  TEST_USERNAME,
  errorBody,
  makeExpense,
  setMockExpenses,
  setMockLoggedIn,
} from "../src/test/handlers";
import { renderApp } from "../src/test/renderApp";
import { server } from "../src/test/server";

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  password = TEST_PASSWORD,
) {
  await user.type(await screen.findByLabelText("Username"), TEST_USERNAME);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("authentication flow", () => {
  it("redirects an anonymous deep link to login and returns to it after signing in", async () => {
    const user = userEvent.setup();
    renderApp("/expenses/new");
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    await signIn(user);
    expect(
      await screen.findByRole("heading", { name: "New expense" }),
    ).toBeInTheDocument();
  });

  it("shows the server error for a wrong password and stays on login", async () => {
    const user = userEvent.setup();
    renderApp("/");
    await signIn(user, "wrong-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password.",
    );
    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("redirects to login when the session expires during use", async () => {
    setMockLoggedIn();
    setMockExpenses([makeExpense(1, { description: "Lunch" })]);
    const user = userEvent.setup();
    renderApp("/expenses");
    expect(await screen.findByText("Lunch")).toBeInTheDocument();

    server.use(
      http.get("/api/expenses", () =>
        HttpResponse.json(
          errorBody("not_authenticated", "Authentication required."),
          {
            status: 401,
          },
        ),
      ),
    );
    await user.selectOptions(screen.getByLabelText("Sort by"), "date_asc");
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });
});

describe("expense lifecycle flow", () => {
  it("creates, edits, summarises and deletes an expense, then logs out", async () => {
    setMockLoggedIn();
    const user = userEvent.setup();
    renderApp("/");

    expect(await screen.findByText(/No expenses yet/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("link", { name: "Add your first expense" }),
    );
    await user.type(await screen.findByLabelText("Amount"), "25.00");
    await user.selectOptions(screen.getByLabelText("Category"), "Healthcare");
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-03-15");
    await user.type(screen.getByLabelText("Description (optional)"), "Dentist");
    await user.click(screen.getByRole("button", { name: "Add expense" }));

    await screen.findByRole("heading", { name: "Expenses" });
    const row = (await screen.findByRole("cell", { name: "Dentist" })).closest(
      "tr",
    )!;
    expect(within(row).getByText("25.00")).toBeInTheDocument();

    await user.click(
      screen.getByRole("link", { name: /Edit expense Dentist/ }),
    );
    const amount = await screen.findByLabelText("Amount");
    await user.clear(amount);
    await user.type(amount, "40.50");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByRole("cell", { name: "40.50" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Dashboard" }));
    const total = (await screen.findByText("Total spent")).closest(".stat")!;
    expect(total).toHaveTextContent("40.50");

    await user.click(screen.getByRole("link", { name: "Expenses" }));
    await user.click(
      await screen.findByRole("button", { name: /Delete expense Dentist/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Delete expense?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("No expenses yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("keeps the expense when the delete confirmation is cancelled", async () => {
    setMockLoggedIn();
    setMockExpenses([makeExpense(1, { description: "Keep me" })]);
    const user = userEvent.setup();
    renderApp("/expenses");
    await user.click(
      await screen.findByRole("button", { name: /Delete expense Keep me/ }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Cancel",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Keep me")).toBeInTheDocument();
  });

  it("filters the list by category and date range", async () => {
    setMockLoggedIn();
    setMockExpenses([
      makeExpense(1, {
        description: "Bus",
        category: "Transport",
        expense_date: "2026-02-01",
      }),
      makeExpense(2, {
        description: "Pizza",
        category: "Food",
        expense_date: "2026-02-10",
      }),
      makeExpense(3, {
        description: "Old pizza",
        category: "Food",
        expense_date: "2025-12-01",
      }),
    ]);
    const user = userEvent.setup();
    renderApp("/expenses");
    expect(await screen.findByText("Bus")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await waitFor(() =>
      expect(screen.queryByText("Bus")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();

    await user.type(screen.getByLabelText("From"), "2026-01-01");
    await waitFor(() =>
      expect(screen.queryByText("Old pizza")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
  });
});

describe("expense form validation flow", () => {
  it("blocks an invalid amount client-side and maps a server 422 to the field", async () => {
    setMockLoggedIn();
    const user = userEvent.setup();
    renderApp("/expenses/new");
    await user.type(await screen.findByLabelText("Amount"), "abc");
    await user.selectOptions(screen.getByLabelText("Category"), "Food");
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), "2026-03-15");
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    expect(screen.getByLabelText("Amount")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    server.use(
      http.post("/api/expenses", () =>
        HttpResponse.json(
          errorBody("validation_error", "Invalid request.", [
            { loc: ["body", "description"], msg: "too long" },
          ]),
          { status: 422 },
        ),
      ),
    );
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "10.00");
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Description (optional)")).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
  });
});
