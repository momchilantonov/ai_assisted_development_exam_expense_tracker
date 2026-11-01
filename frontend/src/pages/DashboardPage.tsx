import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/client";
import { getSummary } from "../api/expenses";
import type { Summary } from "../api/types";
import { PageHeader } from "../components/PageHeader";
import { Tag } from "../components/Tag";
import { CATEGORY_ICON, categoryClass } from "../lib/categories";
import { formatMoney, toCents } from "../lib/money";

const BAR_HEIGHT = 22;
const BAR_GAP = 10;
const LABEL_WIDTH = 110;
const BAR_AREA = 300;
const VALUE_WIDTH = 90;

function CategoryChart({ items }: { items: Summary["by_category"] }) {
  const max = items.reduce((m, i) => {
    const cents = toCents(i.total);
    return cents > m ? cents : m;
  }, 0n);
  const height = items.length * (BAR_HEIGHT + BAR_GAP);
  const width = LABEL_WIDTH + BAR_AREA + VALUE_WIDTH;
  const summary = items
    .map((i) => `${i.category} ${formatMoney(i.total)}`)
    .join(", ");

  return (
    <svg
      role="img"
      aria-label={`Spending by category: ${summary}`}
      viewBox={`0 0 ${width} ${height}`}
      className="category-chart"
    >
      {items.map((item, index) => {
        const y = index * (BAR_HEIGHT + BAR_GAP);
        // Ratio is only used for bar length; displayed amounts stay decimal strings.
        const ratio =
          max === 0n ? 0 : Number((toCents(item.total) * 1000n) / max) / 1000;
        return (
          <g key={item.category}>
            <text x={0} y={y + BAR_HEIGHT * 0.7} className="chart-label">
              {item.category}
            </text>
            <rect
              x={LABEL_WIDTH}
              y={y}
              width={BAR_AREA * ratio}
              height={BAR_HEIGHT}
              className={`chart-bar ${categoryClass(item.category)}`}
            />
            <text
              x={LABEL_WIDTH + BAR_AREA * ratio + 6}
              y={y + BAR_HEIGHT * 0.7}
              className="chart-value"
            >
              {formatMoney(item.total)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getSummary()
      .then((result) => {
        if (!active) return;
        setSummary(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load the dashboard.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <main>
      <PageHeader icon="📊" title="Dashboard" />

      {loading && (
        <p role="status" className="page-message">
          Loading dashboard…
        </p>
      )}

      {!loading && error && (
        <div role="alert" className="form-error">
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && summary && summary.expense_count === 0 && (
        <p className="page-message">
          No expenses yet.{" "}
          <Link to="/expenses/new">Add your first expense</Link> to see
          statistics.
        </p>
      )}

      {!loading && !error && summary && summary.expense_count > 0 && (
        <>
          <dl className="stats">
            <div className="stat">
              <dt>Total spent</dt>
              <dd>{formatMoney(summary.total_amount)}</dd>
            </div>
            <div className="stat">
              <dt>This month</dt>
              <dd>{formatMoney(summary.current_month_amount)}</dd>
            </div>
            <div className="stat">
              <dt>Expenses</dt>
              <dd>{summary.expense_count}</dd>
            </div>
          </dl>

          <section aria-labelledby="by-category-heading">
            <h2 id="by-category-heading">Spending by category</h2>
            <CategoryChart items={summary.by_category} />
            <div className="table-wrap">
              <table>
                <caption className="visually-hidden">
                  Spending by category
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col" className="num">
                      Expenses
                    </th>
                    <th scope="col" className="num">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_category.map((c) => (
                    <tr key={c.category}>
                      <th scope="row">
                        <Tag category={c.category} />
                      </th>
                      <td className="num">{c.count}</td>
                      <td className="num">{formatMoney(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="recent-heading" className="recent-expenses">
            <h2 id="recent-heading">Recent expenses</h2>
            <div className="table-wrap">
              <table>
                <caption className="visually-hidden">Recent expenses</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Category</th>
                    <th scope="col">Description</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap">{e.expense_date}</td>
                      <td>
                        <Tag category={e.category} />
                      </td>
                      <td>
                        <span className="row-icon" aria-hidden="true">
                          {CATEGORY_ICON[e.category]}
                        </span>
                        {e.description ?? ""}
                      </td>
                      <td className="num">{formatMoney(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
