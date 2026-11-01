import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  errorBody,
  makeExpense,
  setMockExpenses,
  setMockLoggedIn,
} from "../test/handlers";
import { renderApp } from "../test/renderApp";
import { server } from "../test/server";

describe("dashboard page", () => {
  it("shows a loading status, then statistics from decimal strings", async () => {
    setMockLoggedIn();
    const month = new Date().toISOString().slice(0, 7);
    setMockExpenses([
      makeExpense(1, {
        amount: "1000.10",
        category: "Bills",
        expense_date: `${month}-01`,
        description: "Rent",
      }),
      makeExpense(2, {
        amount: "0.20",
        category: "Food",
        expense_date: "2020-01-01",
      }),
      makeExpense(3, {
        amount: "0.10",
        category: "Food",
        expense_date: "2020-01-02",
      }),
    ]);
    renderApp("/");
    expect(await screen.findByText("Loading dashboard…")).toBeInTheDocument();
    const total = (await screen.findByText("Total spent")).closest("div")!;
    expect(within(total).getByText("1,000.40")).toBeInTheDocument();
    expect(
      within(screen.getByText("This month").closest("div")!).getByText(
        "1,000.10",
      ),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByText("Expenses", { selector: "dt" }).closest("div")!,
      ).getByText("3"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recent expenses" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("shows a long description in full", async () => {
    setMockLoggedIn();
    const long = "x".repeat(300);
    setMockExpenses([makeExpense(1, { description: long })]);
    renderApp("/");
    const recent = await screen.findByRole("table", {
      name: "Recent expenses",
    });
    expect(within(recent).getByText(long)).toBeInTheDocument();
  });

  it("renders an SVG chart with a text alternative and a table of category totals", async () => {
    setMockLoggedIn();
    setMockExpenses([
      makeExpense(1, { amount: "30.00", category: "Bills" }),
      makeExpense(2, { amount: "10.00", category: "Food" }),
    ]);
    renderApp("/");
    const chart = await screen.findByRole("img", {
      name: /Spending by category: /,
    });
    expect(chart).toHaveAccessibleName(/Food 10\.00/);
    expect(chart).toHaveAccessibleName(/Bills 30\.00/);
    expect(chart.tagName.toLowerCase()).toBe("svg");
    expect(chart.querySelectorAll("rect")).toHaveLength(7);

    const table = screen.getByRole("table", { name: "Spending by category" });
    const bills = within(table).getByRole("row", { name: /Bills/ });
    expect(within(bills).getByText("30.00")).toBeInTheDocument();
    expect(
      within(table).getByRole("row", { name: /Transport/ }),
    ).toHaveTextContent("0.00");
  });

  it("shows an empty state with a link to add an expense", async () => {
    setMockLoggedIn();
    renderApp("/");
    expect(await screen.findByText(/No expenses yet\./)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add your first expense" }),
    ).toHaveAttribute("href", "/expenses/new");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows an error with retry that recovers", async () => {
    setMockLoggedIn();
    setMockExpenses([makeExpense(1)]);
    server.use(
      http.get(
        "/api/dashboard/summary",
        () =>
          HttpResponse.json(errorBody("internal_error", "Server broke."), {
            status: 500,
          }),
        {
          once: true,
        },
      ),
    );
    renderApp("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("Server broke.");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Total spent")).toBeInTheDocument();
  });

  it("redirects to login on 401", async () => {
    setMockLoggedIn();
    server.use(
      http.get("/api/dashboard/summary", () =>
        HttpResponse.json(
          errorBody("not_authenticated", "Authentication required."),
          { status: 401 },
        ),
      ),
    );
    renderApp("/");
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });
});
