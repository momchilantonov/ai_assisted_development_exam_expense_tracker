import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { ToastProvider } from "./ToastProvider";

export function Layout() {
  const { username, logout } = useAuth();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    // AuthProvider clears state even if the request fails; ProtectedRoute then redirects to login.
    await logout().catch(() => undefined);
  }

  return (
    <ToastProvider>
      <header className="app-header">
        <span className="app-title">
          <span aria-hidden="true">💸</span> Expense Tracker
        </span>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/expenses">Expenses</NavLink>
        </nav>
        <div className="app-user">
          <span>{username}</span>
          <button type="button" onClick={handleLogout} disabled={pending}>
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </ToastProvider>
  );
}
