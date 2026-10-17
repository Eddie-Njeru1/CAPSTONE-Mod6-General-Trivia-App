// SignupPage.jsx
// Registration screen. Collects a username, email and password (with a
// confirmation), validates them, and calls signup() from AuthContext.
// On success the user is logged in automatically and sent to the home page.
// On failure it shows the error (e.g. "email already taken").
//
// Used by: the /signup route in App.jsx.
// Depends on: useAuth() (AuthContext.js), which talks to the backend through api.js.

import { useState } from 'react' // holds the form field values and local error message
import { Link, useNavigate } from 'react-router-dom' // link to login, navigate after signup
import { useAuth } from '../context/AuthContext' // signup function plus loading and error state

function SignupPage() {
  // signup: sends the new account details to the backend and stores the token on success.
  // loading: true while the request is in progress (used to disable the button).
  // error: message from the server.
  // clearError: resets the server error before a new attempt.
  const { signup, loading, error, clearError } = useAuth()
  const navigate = useNavigate()

  // Form field values (controlled inputs).
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Error found by the form itself, before any request is sent.
  const [formError, setFormError] = useState('')

  // Runs when the form is submitted.
  async function handleSubmit(event) {
    event.preventDefault() // stop the browser from reloading the page
    setFormError('')
    clearError()

    // Local validation, checked in order. Each failure stops the submit
    // and shows a message, so we never send bad data to the server.
    if (!username.trim() || !email.trim() || !password) {
      setFormError('Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    // signup() returns true on success and false on failure
    // (on failure the reason is available as `error`).
    // The confirmation password is not sent; it is only for the user's benefit.
    const success = await signup({
      username: username.trim(),
      email: email.trim(),
      password,
    })
    if (success) {
      // replace: true so the Back button does not return to the signup form.
      navigate('/', { replace: true })
    }
  }

  return (
    <section className="auth-page">
      <h1>Create an account</h1>

      {/* noValidate: we show our own messages instead of the browser's pop-ups */}
      <form onSubmit={handleSubmit} noValidate>
        {/* htmlFor/id link each label to its input for accessibility.
            autoComplete hints let password managers fill and save correctly. */}
        <label htmlFor="signup-username">Username</label>
        <input
          id="signup-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label htmlFor="signup-confirm">Confirm password</label>
        <input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}

export default SignupPage