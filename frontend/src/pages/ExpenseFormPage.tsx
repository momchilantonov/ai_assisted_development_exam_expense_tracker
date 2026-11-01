import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  createExpense,
  getExpense,
  listCategories,
  updateExpense,
} from "../api/expenses";
import type { Category, ExpenseInput } from "../api/types";
import { useToast } from "../components/useToast";
import { validateAmount } from "../lib/money";

const MAX_DESCRIPTION = 500;

type Field = "amount" | "category" | "expense_date" | "description";
type FieldErrors = Partial<Record<Field, string>>;

interface Values {
  amount: string;
  category: Category | "";
  expense_date: string;
  description: string;
}

const FIELDS: Field[] = ["amount", "category", "expense_date", "description"];

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validate(values: Values, categories: Category[]): FieldErrors {
  const errors: FieldErrors = {};
  const amountError = validateAmount(values.amount);
  if (amountError) errors.amount = amountError;
  if (values.category === "" || !categories.includes(values.category))
    errors.category = "Choose a category.";
  if (values.expense_date === "") errors.expense_date = "Date is required.";
  else if (!isRealDate(values.expense_date))
    errors.expense_date = "Enter a valid date (YYYY-MM-DD).";
  if (values.description.trim().length > MAX_DESCRIPTION) {
    errors.description = `Description must be at most ${MAX_DESCRIPTION} characters.`;
  }
  return errors;
}

export function ExpenseFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const expenseId = editing ? Number(id) : null;
  const idValid =
    expenseId === null || (Number.isInteger(expenseId) && expenseId >= 1);

  const navigate = useNavigate();
  const { notify } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [values, setValues] = useState<Values>({
    amount: "",
    category: "",
    expense_date: editing ? "" : todayIso(),
    description: "",
  });
  const [loading, setLoading] = useState(idValid);
  const [loadError, setLoadError] = useState<string | null>(
    idValid ? null : "Expense not found.",
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!idValid) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    Promise.all([
      listCategories(),
      expenseId === null ? Promise.resolve(null) : getExpense(expenseId),
    ])
      .then(([list, expense]) => {
        if (!active) return;
        setCategories(list);
        if (expense) {
          setValues({
            amount: expense.amount,
            category: expense.category,
            expense_date: expense.expense_date,
            description: expense.description ?? "",
          });
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load the form.",
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [expenseId, idValid, reloadKey]);

  function setValue<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const errors = validate(values, categories);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstField = FIELDS.find((f) => errors[f]);
      if (firstField) document.getElementById(`expense-${firstField}`)?.focus();
      return;
    }

    const input: ExpenseInput = {
      amount: values.amount.trim(),
      category: values.category as Category,
      expense_date: values.expense_date,
      description:
        values.description.trim() === "" ? null : values.description.trim(),
    };
    setPending(true);
    try {
      if (expenseId === null) await createExpense(input);
      else await updateExpense(expenseId, input);
      notify(editing ? "Expense updated." : "Expense added.");
      navigate("/expenses");
    } catch (err) {
      setPending(false);
      if (err instanceof ApiError && err.code === "validation_error") {
        const serverErrors: FieldErrors = {};
        for (const detail of err.details) {
          const field = detail.loc?.[detail.loc.length - 1];
          if (
            typeof field === "string" &&
            (FIELDS as string[]).includes(field)
          ) {
            serverErrors[field as Field] = detail.msg ?? "Invalid value.";
          }
        }
        setFieldErrors(serverErrors);
        if (Object.keys(serverErrors).length === 0) setFormError(err.message);
        return;
      }
      const message =
        err instanceof ApiError ? err.message : "Could not save the expense.";
      setFormError(message);
      notify(message, "error");
    }
  }

  const heading = editing ? "Edit expense" : "New expense";

  if (loading) {
    return (
      <main>
        <h1>{heading}</h1>
        <p role="status" className="page-message">
          Loading…
        </p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main>
        <h1>{heading}</h1>
        <div role="alert" className="form-error">
          <p>{loadError}</p>
          {idValid && (
            <button type="button" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          )}
        </div>
        <p>
          <Link to="/expenses">Back to expenses</Link>
        </p>
      </main>
    );
  }

  const describedBy = (field: Field) =>
    fieldErrors[field] ? `expense-${field}-error` : undefined;

  return (
    <main>
      <h1>{heading}</h1>
      <form
        className="expense-form"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={pending}
      >
        <div role="alert" className="form-error">
          {formError}
        </div>

        <div className="field">
          <label htmlFor="expense-amount">Amount</label>
          <input
            id="expense-amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={values.amount}
            aria-invalid={fieldErrors.amount ? true : undefined}
            aria-describedby={describedBy("amount")}
            onChange={(e) => setValue("amount", e.target.value)}
          />
          {fieldErrors.amount && (
            <p id="expense-amount-error" className="field-error">
              {fieldErrors.amount}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="expense-category">Category</label>
          <select
            id="expense-category"
            name="category"
            value={values.category}
            aria-invalid={fieldErrors.category ? true : undefined}
            aria-describedby={describedBy("category")}
            onChange={(e) =>
              setValue("category", e.target.value as Category | "")
            }
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p id="expense-category-error" className="field-error">
              {fieldErrors.category}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="expense-expense_date">Date</label>
          <input
            id="expense-expense_date"
            name="expense_date"
            type="date"
            value={values.expense_date}
            aria-invalid={fieldErrors.expense_date ? true : undefined}
            aria-describedby={describedBy("expense_date")}
            onChange={(e) => setValue("expense_date", e.target.value)}
          />
          {fieldErrors.expense_date && (
            <p id="expense-expense_date-error" className="field-error">
              {fieldErrors.expense_date}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="expense-description">Description (optional)</label>
          <textarea
            id="expense-description"
            name="description"
            rows={3}
            value={values.description}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby={describedBy("description")}
            onChange={(e) => setValue("description", e.target.value)}
          />
          {fieldErrors.description && (
            <p id="expense-description-error" className="field-error">
              {fieldErrors.description}
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </button>
          <Link to="/expenses" className="button-link">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
