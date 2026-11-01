import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { safeNext } from "../lib/redirect";

interface FieldErrors {
  username?: string;
  password?: string;
  confirm?: string;
}

function validate(
  username: string,
  password: string,
  confirm: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const name = username.trim();
  if (name.length < 3 || name.length > 64)
    errors.username = "Username must be 3 to 64 characters.";
  if (password.length < 8 || password.length > 128)
    errors.password = "Password must be 8 to 128 characters.";
  if (confirm !== password) errors.confirm = "Passwords do not match.";
  return errors;
}

export function SignupPage() {
  const { status, register } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === "authenticated") return <Navigate to={next} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(username, password, confirm);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      await register(username.trim(), password);
    } catch (err) {
      if (err instanceof ApiError && err.code === "username_taken") {
        setFieldErrors({ username: err.message });
      } else if (err instanceof ApiError && err.code === "validation_error") {
        setFormError("Please check the entered values and try again.");
      } else {
        setFormError(
          err instanceof ApiError
            ? err.message
            : "Sign up failed. Please try again.",
        );
      }
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <h1>Sign up</h1>
      <form onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <div role="alert" className="form-error">
          {formError}
        </div>

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={fieldErrors.username ? true : undefined}
            aria-describedby={
              fieldErrors.username ? "username-error" : undefined
            }
          />
          <div aria-live="polite">
            {fieldErrors.username && (
              <p id="username-error" className="field-error">
                {fieldErrors.username}
              </p>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
          />
          <div aria-live="polite">
            {fieldErrors.password && (
              <p id="password-error" className="field-error">
                {fieldErrors.password}
              </p>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={fieldErrors.confirm ? true : undefined}
            aria-describedby={fieldErrors.confirm ? "confirm-error" : undefined}
          />
          <div aria-live="polite">
            {fieldErrors.confirm && (
              <p id="confirm-error" className="field-error">
                {fieldErrors.confirm}
              </p>
            )}
          </div>
        </div>

        <button type="submit" disabled={pending}>
          {pending ? "Signing up…" : "Sign up"}
        </button>
      </form>
      <p>
        Already have an account?{" "}
        <Link
          to={
            params.get("next")
              ? `/login?next=${encodeURIComponent(next)}`
              : "/login"
          }
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
