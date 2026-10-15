import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Route guard: only lets logged-in users through.
// Logged-out users are sent to /login, and we remember where they were
// trying to go so the login page can send them back afterwards.
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Works two ways:
  // 1. Wrapping a page:  <ProtectedRoute><DashboardPage /></ProtectedRoute>
  // 2. As a layout route: <Route element={<ProtectedRoute />}> ...child routes... </Route>
  return children ?? <Outlet />
}

export default ProtectedRoute