import { useState } from 'react'
import api, { getToken, setToken } from '../services/api'
import { AuthContext } from './AuthContext'

const USER_KEY = 'trivia-user'

// Reads the saved user from the browser. Returns null if missing or unreadable.
function loadUser() {
  try {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // Storage can fail (e.g. private browsing). The session still works.
  }
}

// Turns a failed request into a readable message for the forms.
function getErrorMessage(err) {
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    'Something went wrong. Please try again.'
  )
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken)
  const [user, setUser] = useState(loadUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Saves a successful login/signup response everywhere it is needed.
  function startSession(data) {
    const newToken = data.access_token
    const newUser = data.user || null
    setToken(newToken)
    saveUser(newUser)
    setTokenState(newToken)
    setUser(newUser)
  }

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
      setLoading(false)
    }
  }

  // Both return true on success, false on failure (the error is in `error`).
  const login = (credentials) => authenticate('/auth/login', credentials)
  const signup = (details) => authenticate('/auth/signup', details)

  function logout() {
    setToken(null)
    saveUser(null)
    setTokenState(null)
    setUser(null)
    setError(null)
  }

  function clearError() {
    setError(null)
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}