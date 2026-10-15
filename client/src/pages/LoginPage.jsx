import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const { login, loading, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  // Where to go after login: the page they were trying to reach, or the home page.
  const redirectTo = location.state?.from?.pathname || '/'

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    clearError()

    if (!email.trim() || !password) {
      setFormError('Please enter your email and password.')
      return
    }

    const success = await login({ email: email.trim(), password })
    if (success) {
      navigate(redirectTo, { replace: true })
    }
  }

  return (
    <section className="auth-page">
      <h1>Log in</h1>

      <form onSubmit={handleSubmit} noValidate>
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

        {(formError || error) && (
          <p role="alert" className="auth-page__error">
            {formError || error}
          </p>
        )}

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