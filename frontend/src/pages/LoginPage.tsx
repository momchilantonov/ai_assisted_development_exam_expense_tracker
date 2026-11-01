import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { safeNext } from "../lib/redirect";

interface FieldErrors {
  username?: string;
  password?: string;
}

export function LoginPage() {
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === "authenticated") return <Navigate to={next} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (username.trim() === "") errors.username = "Username is required.";
    if (password === "") errors.password = "Password is required.";
    setFieldErrors(errors);
    setFormError(null);
    if (errors.username || errors.password) return;

    setPending(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Sign in failed. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <h1>Sign in</h1>
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
          {fieldErrors.username && (
            <p id="username-error" className="field-error">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
          />
          {fieldErrors.password && (
            <p id="password-error" className="field-error">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p>
        No account yet?{" "}
        <Link
          to={
            params.get("next")
              ? `/signup?next=${encodeURIComponent(next)}`
              : "/signup"
          }
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}
