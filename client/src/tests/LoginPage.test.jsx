import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Replace useAuth so we control what the page sees.
const { authState } = vi.hoisted(() => ({
  authState: {
    login: vi.fn(),
    loading: false,
    error: null,
    clearError: vi.fn(),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}))

import LoginPage from '../pages/LoginPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>home-page</p>} />
        <Route path="/signup" element={<p>signup-page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function fillAndSubmit(email, password) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: password },
  })
  fireEvent.click(screen.getByRole('button', { name: /log in/i }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    authState.login = vi.fn()
    authState.clearError = vi.fn()
    authState.loading = false
    authState.error = null
  })

  it('renders the email and password fields and a submit button', () => {
    renderPage()
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Password')).toBeTruthy()
    expect(screen.getByRole('button', { name: /log in/i })).toBeTruthy()
  })

  it('shows a message and does not call login when fields are empty', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(screen.getByRole('alert').textContent).toMatch(/enter your email/i)
    expect(authState.login).not.toHaveBeenCalled()
  })

  it('calls login with the trimmed email and the password', async () => {
    authState.login.mockResolvedValue(false)
    renderPage()
    fillAndSubmit('  a@b.com  ', 'secret123')

    await waitFor(() =>
      expect(authState.login).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'secret123',
      })
    )
  })

  it('redirects home after a successful login', async () => {
    authState.login.mockResolvedValue(true)
    renderPage()
    fillAndSubmit('a@b.com', 'secret123')

    await waitFor(() => expect(screen.getByText('home-page')).toBeTruthy())
  })

  it('stays on the page when login fails', async () => {
    authState.login.mockResolvedValue(false)
    renderPage()
    fillAndSubmit('a@b.com', 'wrongpass')

    await waitFor(() => expect(authState.login).toHaveBeenCalled())
    expect(screen.queryByText('home-page')).toBeNull()
  })

  it('shows the server error message', () => {
    authState.error = 'Invalid credentials'
    renderPage()
    expect(screen.getByRole('alert').textContent).toBe('Invalid credentials')
  })

  it('disables the button and shows progress while loading', () => {
    authState.loading = true
    renderPage()
    const button = screen.getByRole('button', { name: /logging in/i })
    expect(button.disabled).toBe(true)
  })

  it('links to the signup page', () => {
    renderPage()
    fireEvent.click(screen.getByText('Create an account'))
    expect(screen.getByText('signup-page')).toBeTruthy()
  })
})