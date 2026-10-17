// ProtectedRoute.jsx
// Route guard. Only logged-in users can see the page it wraps. Logged-out users
// are redirected to /login, and the page they wanted is remembered so LoginPage
// can send them back after they log in.
//
// Used by: App.jsx, around pages that need an account (e.g. /dashboard).
// Depends on: useAuth() (isAuthenticated) and React Router.

import { Navigate, Outlet, useLocation } from 'react-router-dom' // redirect, nested routes, current location
import { useAuth } from '../context/AuthContext' // tells us whether a user is logged in

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // replace: the Back button will not return the user to the protected page.
    // state.from: remembers the page they were trying to reach (read by LoginPage).
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Works two ways:
  // 1. Wrapping a page:   <ProtectedRoute><DashboardPage /></ProtectedRoute>
  // 2. As a layout route: <Route element={<ProtectedRoute />}> ...child routes... </Route>
  return children ?? <Outlet />
}

export default ProtectedRoute