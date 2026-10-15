import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SignupPage() {
  const { signup, loading, error, clearError } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    clearError()

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

    const success = await signup({
      username: username.trim(),
      email: email.trim(),
      password,
    })
    if (success) {
      navigate('/', { replace: true })
    }
  }

  return (
    <section className="auth-page">
      <h1>Create an account</h1>

      <form onSubmit={handleSubmit} noValidate>
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

        {(formError || error) && (
          <p role="alert" className="auth-page__error">
            {formError || error}
          </p>
        )}

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