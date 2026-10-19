// AuthContext.js
// Creates the shared "auth board" and the useAuth() hook for reading it.
// Contains no logic and no JSX. The state and actions that fill it live in
// AuthProvider.jsx. They are separate files because the provider needs JSX,
// which Vite only accepts in .jsx files (the same split as useScore.js and
// ScoreContext.jsx in Phase 1).
//
// Used by: LoginPage, SignupPage, ProtectedRoute, and NavBar (via useAuth()).

import { createContext, useContext } from 'react' // React tools for sharing data without props

// The shared container. It starts as null and is filled by <AuthProvider>.
export const AuthContext = createContext(null)

// Lets any component read auth data in one line:
//   const { user, isAuthenticated, login, logout } = useAuth()
export function useAuth() {
  const context = useContext(AuthContext)
  // If the context is null, the component is outside <AuthProvider>.
  // Fail with a clear message instead of a confusing crash later.
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}