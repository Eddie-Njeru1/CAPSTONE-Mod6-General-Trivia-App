// LoginPage.jsx
// Login screen. Collects an email and password, validates them, and calls login()
// from AuthContext. On success it sends the user to the page they were trying to
// reach (set by ProtectedRoute), or to the home page. On failure it shows the error.
//
// Used by: the /login route in App.jsx.
// Depends on: useAuth() (AuthContext.js), which talks to the backend through api.js.

import { useState } from 'react' // holds the form field values and local error message
import { Link, useLocation, useNavigate } from 'react-router-dom' // link to signup, read redirect info, navigate after login
import { useAuth } from '../context/AuthContext' // login function plus loading and error state

function LoginPage() {
  // login: sends credentials to the backend and stores the token on success.
  // loading: true while the request is in progress (used to disable the button).
  // error: message from the server (e.g. "Invalid credentials").
  // clearError: resets the server error before a new attempt.
  const { login, loading, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Form field values (controlled inputs).
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Error found by the form itself, before any request is sent (e.g. empty fields).
  const [formError, setFormError] = useState('')

  // ProtectedRoute stores the page the user tried to open in location.state.from.
  // After logging in we return them there; otherwise we go to the home page.
  const redirectTo = location.state?.from?.pathname || '/'

  // Runs when the form is submitted.
  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    setFormError('')
    clearError()

    // Local validation: do not call the server with empty fields.
    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.')
      return
    }

    // login() returns true on success and false on failure
    // (on failure the reason is available as `error`).
    const success = await login({ email: email.trim(), password })
    if (success) {
      // replace: true so the Back button does not return to the login form.
      navigate(redirectTo, { replace: true })
    }
  }

  return (
    <section className="auth-page">
      <h1>Log in</h1>

      {/* noValidate: we show our own messages instead of the browser's pop-ups */}
      <form onSubmit={handleSubmit} noValidate>
        {/* htmlFor/id link each label to its input for accessibility */}
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Shows either the local validation error or the server error.
            role="alert" makes screen readers announce it. */}
        {(formError || error) && (
          <p role="alert" className="auth-page__error">
            {formError || error}
          </p>
        )}

        {/* Disabled while loading so the form cannot be submitted twice */}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p>
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </section>
  )
}

export default LoginPage