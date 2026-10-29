// AuthProvider.jsx
// Holds the app's login state and provides it to every component inside it.
//
// State: user, token, loading (a request is in progress), error (readable message),
// initializing (a saved token is being checked with the server on first load).
// Derived: isAuthenticated (a token exists) and isAdmin (the user's role is "admin").
// Actions: login(), signup(), logout() (also revokes the token on the server), clearError().
// The session is saved in localStorage so a page refresh does not log the user out.
//
// Used by: wraps the app in App.jsx so useAuth() works everywhere.
// Depends on: api.js (backend calls and token storage) and AuthContext.js.

import { useCallback, useEffect, useState } from 'react' // holds the auth state and runs the startup check
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
  // True only when there is a saved token that has not been checked with the server yet.
  // Guards such as AdminRoute can wait for this to become false before deciding.
  const [initializing, setInitializing] = useState(() => Boolean(getToken()))

  // Removes the session from the browser and from React state.
  const clearSession = useCallback(() => {
    setToken(null) // remove the token from localStorage
    saveUser(null) // remove the saved user from localStorage
    setTokenState(null) // update React state so the screen reflects the change
    setUser(null)
  }, [])

  // On first load, if a token is saved, ask the server who it belongs to (GET /api/auth/me).
  // This refreshes the user (e.g. the role may have changed since the last visit)
  // and catches tokens that expired, were revoked, or belong to a deactivated account.
  useEffect(() => {
    if (!getToken()) return undefined

    let cancelled = false // ignore the result if the component unmounts first

    async function validateSession() {
      try {
        const response = await api.get('/auth/me')
        if (cancelled) return
        // Accept both { user: {...} } and a bare user object.
        const freshUser = response.data?.user ?? response.data
        saveUser(freshUser)
        setUser(freshUser)
      } catch (err) {
        if (cancelled) return
        const status = err.response?.status
        // 401: token invalid, expired or revoked. 403: account deactivated.
        // Either way the saved session is no longer valid.
        if (status === 401 || status === 403) {
          clearSession()
        }
        // Any other failure (e.g. no network) keeps the session, so the app still
        // works offline as a PWA.
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    validateSession()

    return () => {
      cancelled = true
    }
  }, [clearSession])

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

  // Logs the user out. First asks the server to revoke the token (POST /api/auth/logout)
  // so it can no longer be used, then clears the session in the browser.
  // async: callers should await it so the page only changes once the session is cleared.
  async function logout() {
    try {
      // Must run BEFORE the token is cleared below: the request interceptor in
      // api.js reads the saved token to build the Authorization header.
      await api.post('/auth/logout') // revoke the token on the server
    } catch {
      // The server call can fail (e.g. the token already expired, or the server is
      // unreachable). The user still wants to be logged out, so carry on and clear
      // the session locally regardless.
    }
    clearSession()
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
    isAdmin: user?.role === 'admin', // true only for admin accounts (read by AdminRoute)
    initializing,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}