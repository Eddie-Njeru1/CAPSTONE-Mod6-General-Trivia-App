// Route guard: only admins can open the page, everyone else is sent to /home.
// It waits for `initializing` before deciding. After a refresh, the saved user comes from localStorage and may be out of date (the role may have changed, or the account may have been deactivated). 
// AuthProvider checks it with the server first, so a stale "admin" never sees the admin page, even briefly.
// Used by: App.jsx, around /admin. It sits inside ProtectedRoute, which already sends logged-out users to /login. 
// The server still enforces admin access on every request.
// Depends on: useAuth() (isAdmin, initializing), Loader and React Router.

import { Navigate, Outlet } from 'react-router-dom' // redirect and nested routes
import { useAuth } from '../context/AuthContext' // tells whether the user is an admin
import Loader from './Loader' // shown while the saved session is being checked

function AdminRoute({ children }) {
  const { isAdmin, initializing } = useAuth()

  // saved session is still being checed with the server so no decision yet
  if (initializing) {
    return <Loader message="Checking access..." />
  }

  // Not an admin - send them to /home. replace the back button will not return the to admin
  if (!isAdmin) {
    return <Navigate to="home" replace />
  }

  // Works two ways, like ProtectedRoute:
    // 1. Wrapping a page:   <AdminRoute><AdminPage /></AdminRoute>
  // 2. As a layout route: <Route element={<AdminRoute />}> ...child routes... </Route>

  return children ?? <Outlet />
}

export default AdminRoute
