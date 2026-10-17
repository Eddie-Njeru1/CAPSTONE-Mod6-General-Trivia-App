// api.js
// The single place the React app talks to the Flask backend.
// Creates one preconfigured Axios client, stores the login token (JWT), attaches
// the token to every request, and handles expired or invalid tokens.
//
// Used by: AuthProvider.jsx (login and signup), and any component that calls the API.
// Backend: Vite proxies every /api request to Flask on port 5555 (see vite.config.js).

import axios from 'axios' // HTTP client used for all backend requests

// Because of the Vite proxy we use a relative base URL, so api.post('/auth/login')
// is sent to /api/auth/login. No full server address and no CORS setup is needed.
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// The localStorage key where the JWT is saved. Kept in one place so it is easy to change.
export const TOKEN_KEY = 'trivia-token'

// Reads the saved token. Returns null if there is none or storage is unavailable.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

// Saves the token, or removes it when called with null (used on logout).
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can fail (e.g. private browsing). The app still works for this session.
  }
}

// Request interceptor: runs before every request leaves the browser.
// If we have a token, add it as "Authorization: Bearer <token>" so the backend
// knows which user is making the request.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: runs on every response that comes back.
// Successful responses pass through unchanged. A 401 means the token is missing,
// invalid, expired or revoked, so we clear it and send the user to the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    // A 401 from login or signup only means "wrong credentials". The form should
    // show that message, so we must not redirect in that case.
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/signup')

    if (status === 401 && !isAuthCall) {
      setToken(null)
      // Avoid redirecting if we are already on the login page.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    // Pass the error on so the calling code can still handle it.
    return Promise.reject(error)
  }
)

export default api