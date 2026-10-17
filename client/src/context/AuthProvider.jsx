// AuthProvider.jsx
// Holds the app's login state and provides it to every component inside it.
//
// State: user, token, loading (a request is in progress), error (readable message).
// Actions: login(), signup(), logout(), clearError().
// The session is saved in localStorage so a page refresh does not log the user out.
//
// Used by: wraps the app in App.jsx so useAuth() works everywhere.
// Depends on: api.js (backend calls and token storage) and AuthContext.js.

import { useState } from 'react' // holds the auth state
import api, { getToken, setToken } from '../services/api' // backend client and token helpers
import { AuthContext } from './AuthContext' // the shared container this component fills

// localStorage key for the saved user object (the token key lives in api.js).
const USER_KEY = 'trivia-user'

// Reads the saved user from the browser. Returns null if missing or unreadable,
// so a corrupted value can never crash the app on load.
function loadUser() {
  try {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

// Saves the user, or removes it when called with null (used on logout).
function saveUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // Storage can fail (e.g. private browsing). The session still works.
  }
}

// Turns a failed request into a readable message for the forms.
// The backend sends errors as { "error": "..." }. The other options are fallbacks.
function getErrorMessage(err) {
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    'Something went wrong. Please try again.'
  )
}

export function AuthProvider({ children }) {
  // Passing a function (not a value) means the saved data is read only once, on first render.
  const [token, setTokenState] = useState(getToken)
  const [user, setUser] = useState(loadUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Saves a successful login or signup response everywhere it is needed:
  // localStorage (survives refresh) and React state (updates the screen).
  // The backend returns { access_token, user }.
  function startSession(data) {
    const newToken = data.access_token
    const newUser = data.user || null
    setToken(newToken)
    saveUser(newUser)
    setTokenState(newToken)
    setUser(newUser)
  }

  // Shared logic for login and signup: send the request, save the session on
  // success, or store a readable error on failure. Returns true or false so the
  // page knows whether to redirect.
  async function authenticate(path, payload) {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(path, payload)
      startSession(response.data)
      return true
    } catch (err) {
      setError(getErrorMessage(err))
      return false
    } finally {
      // Runs in both cases, so the loading state always resets.
      setLoading(false)
    }
  }

  // Both return true on success and false on failure (the message is in `error`).
  const login = (credentials) => authenticate('/auth/login', credentials) // POST /api/auth/login
  const signup = (details) => authenticate('/auth/signup', details) // POST /api/auth/signup

  // Clears the session in the browser. Note: this does not yet call the server's
  // /auth/logout route, so the token is removed locally but not revoked on the server.
  function logout() {
    setToken(null)
    saveUser(null)
    setTokenState(null)
    setUser(null)
    setError(null)
  }

  // Lets a page reset the error, e.g. before a new submit attempt.
  function clearError() {
    setError(null)
  }

  // Everything components can read through useAuth().
  const value = {
    user,
    token,
    isAuthenticated: Boolean(token), // true when a token exists
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}