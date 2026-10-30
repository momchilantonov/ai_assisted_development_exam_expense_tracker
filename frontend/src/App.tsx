import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ExpensesPage } from './pages/ExpensesPage'
import { LoginPage } from './pages/LoginPage'

// Placeholder until the dashboard.
function HomePage() {
  return (
    <main>
      <h1>Expense Tracker</h1>
    </main>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
