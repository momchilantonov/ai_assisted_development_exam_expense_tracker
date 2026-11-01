import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { deleteExpense, listCategories, listExpenses } from "../api/expenses";
import type { Category, Expense, ExpenseList, ExpenseSort } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/useToast";
import { formatMoney } from "../lib/money";

export const PAGE_SIZE = 20;

interface Filters {
  category: Category | "";
  dateFrom: string;
  dateTo: string;
  sort: ExpenseSort;
}

function describe(e: Expense): string {
  return `${e.description ?? e.category} on ${e.expense_date}`;
}

const initialFilters: Filters = {
  category: "",
  dateFrom: "",
  dateTo: "",
  sort: "date_desc",
};

export function ExpensesPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [offset, setOffset] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<ExpenseList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useToast();

  const rangeInvalid =
    filters.dateFrom !== "" &&
    filters.dateTo !== "" &&
    filters.dateFrom > filters.dateTo;

  useEffect(() => {
    let active = true;
    listCategories()
      .then((list) => active && setCategories(list))
      .catch(() => undefined); // The filter then only offers "All categories".
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (rangeInvalid) return;
    let active = true;
    setLoading(true);
    setError(null);
    listExpenses({
      category: filters.category || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset,
    })
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Could not load expenses.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, offset, rangeInvalid, reloadKey]);

  function updateFilters(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setOffset(0);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteExpense(toDelete.id);
      notify("Expense deleted.");
      // Step back a page when the last item of a later page was removed.
      if (data && data.items.length === 1 && offset > 0)
        setOffset(Math.max(0, offset - PAGE_SIZE));
      else setReloadKey((k) => k + 1);
    } catch (err) {
      // A 404 means it is already gone; refresh the list in both cases.
      notify(
        err instanceof ApiError ? err.message : "Could not delete the expense.",
        "error",
      );
      setReloadKey((k) => k + 1);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  const total = data?.total ?? 0;
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(offset + PAGE_SIZE, total);
  const filtered =
    filters.category !== "" || filters.dateFrom !== "" || filters.dateTo !== "";

  return (
    <main>
      <div className="page-heading">
        <h1>Expenses</h1>
        <Link to="/expenses/new" className="button-link primary">
          New expense
        </Link>
      </div>

      <form
        className="filters"
        aria-label="Filter expenses"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="field">
          <label htmlFor="filter-category">Category</label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={(e) =>
              updateFilters({ category: e.target.value as Category | "" })
            }
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-from">From</label>
          <input
            id="filter-from"
            type="date"
            value={filters.dateFrom}
            aria-invalid={rangeInvalid}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-to">To</label>
          <input
            id="filter-to"
            type="date"
            value={filters.dateTo}
            aria-invalid={rangeInvalid}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-sort">Sort by</label>
          <select
            id="filter-sort"
            value={filters.sort}
            onChange={(e) =>
              updateFilters({ sort: e.target.value as ExpenseSort })
            }
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() =>
            updateFilters({ ...initialFilters, sort: filters.sort })
          }
        >
          Clear filters
        </button>
      </form>

      {rangeInvalid && (
        <p role="alert" className="form-error">
          "From" date must not be after "To" date.
        </p>
      )}

      {!rangeInvalid && loading && (
        <p role="status" className="page-message">
          Loading expenses…
        </p>
      )}

      {!rangeInvalid && error && (
        <div role="alert" className="form-error">
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {!rangeInvalid &&
        !loading &&
        !error &&
        data &&
        data.items.length === 0 && (
          <p className="page-message">
            {filtered
              ? "No expenses match the current filters."
              : "No expenses yet."}
          </p>
        )}

      {!rangeInvalid && !loading && !error && data && data.items.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">Expenses</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Category</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td>{e.category}</td>
                    <td>{e.description ?? ""}</td>
                    <td className="num">{formatMoney(e.amount)}</td>
                    <td className="row-actions">
                      <Link
                        to={`/expenses/${e.id}/edit`}
                        aria-label={`Edit expense ${describe(e)}`}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="danger"
                        aria-label={`Delete expense ${describe(e)}`}
                        onClick={() => setToDelete(e)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Previous
            </button>
            <span aria-live="polite">
              {first}–{last} of {total}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
            >
              Next
            </button>
          </nav>
        </>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete expense?"
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          pending={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        >
          <p>
            This permanently deletes {describe(toDelete)} (
            {formatMoney(toDelete.amount)}). This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
}
