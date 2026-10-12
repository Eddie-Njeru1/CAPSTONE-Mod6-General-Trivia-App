import { createContext, useContext } from 'react'

// The shared container for auth data. AuthProvider fills it.
export const AuthContext = createContext(null)

// Lets any component read auth state in one line:
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}