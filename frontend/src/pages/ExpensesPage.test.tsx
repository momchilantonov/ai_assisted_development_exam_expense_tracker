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
import { PAGE_SIZE } from "./ExpensesPage";

function bodyRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("expenses page", () => {
  it("shows a loading status, then expenses with decimal-string amounts", async () => {
    setMockLoggedIn();
    setMockExpenses([
      makeExpense(1, { amount: "1234.5", description: "Groceries" }),
    ]);
    renderApp("/expenses");
    expect(await screen.findByText("Loading expenses…")).toBeInTheDocument();
    const row = (await screen.findByText("Groceries")).closest("tr")!;
    expect(within(row).getByText("1,234.50")).toBeInTheDocument();
    expect(within(row).getByText("Food")).toBeInTheDocument();
  });

  it("shows an empty state without filters", async () => {
    setMockLoggedIn();
    renderApp("/expenses");
    expect(await screen.findByText("No expenses yet.")).toBeInTheDocument();
  });

  it("shows an error with retry that recovers", async () => {
    setMockLoggedIn();
    setMockExpenses([makeExpense(1, { description: "Lunch" })]);
    server.use(
      http.get(
        "/api/expenses",
        () =>
          HttpResponse.json(errorBody("internal_error", "Server broke."), {
            status: 500,
          }),
        {
          once: true,
        },
      ),
    );
    renderApp("/expenses");
    expect(await screen.findByRole("alert")).toHaveTextContent("Server broke.");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
  });

  it("filters by category and shows a filtered empty state", async () => {
    setMockLoggedIn();
    setMockExpenses([
      makeExpense(1, { category: "Food", description: "Pizza" }),
      makeExpense(2, { category: "Bills", description: "Rent" }),
    ]);
    renderApp("/expenses");
    await screen.findByText("Pizza");
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Category"), "Bills");
    expect(await screen.findByText("Rent")).toBeInTheDocument();
    expect(screen.queryByText("Pizza")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category"), "Transport");
    expect(
      await screen.findByText("No expenses match the current filters."),
    ).toBeInTheDocument();
  });

  it("filters by date range and rejects an inverted range without calling the API", async () => {
    setMockLoggedIn();
    setMockExpenses([
      makeExpense(1, { expense_date: "2026-01-10", description: "Early" }),
      makeExpense(2, { expense_date: "2026-03-10", description: "Late" }),
    ]);
    renderApp("/expenses");
    await screen.findByText("Early");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("From"), "2026-02-01");
    expect(await screen.findByText("Late")).toBeInTheDocument();
    expect(screen.queryByText("Early")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("To"), "2026-01-01");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "must not be after",
    );
    expect(screen.queryByText("Late")).not.toBeInTheDocument();
  });

  it("sorts oldest first when requested", async () => {
    setMockLoggedIn();
    setMockExpenses([
      makeExpense(1, { expense_date: "2026-01-10", description: "Older" }),
      makeExpense(2, { expense_date: "2026-03-10", description: "Newer" }),
    ]);
    renderApp("/expenses");
    await screen.findByText("Older");
    expect(bodyRows()[0]).toHaveTextContent("Newer");
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText("Sort by"), "date_asc");
    await screen.findByText("Older");
    expect(bodyRows()[0]).toHaveTextContent("Older");
  });

  it("paginates with previous and next", async () => {
    setMockLoggedIn();
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) =>
      makeExpense(i + 1, {
        expense_date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
        description: `Item ${i + 1}`,
      }),
    );
    setMockExpenses(many);
    renderApp("/expenses");
    await screen.findAllByRole("row");
    const pager = await screen.findByRole("navigation", { name: "Pagination" });
    expect(pager).toHaveTextContent(`1–${PAGE_SIZE} of ${PAGE_SIZE + 5}`);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(bodyRows()).toHaveLength(PAGE_SIZE);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText(
        `${PAGE_SIZE + 1}–${PAGE_SIZE + 5} of ${PAGE_SIZE + 5}`,
      ),
    ).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
