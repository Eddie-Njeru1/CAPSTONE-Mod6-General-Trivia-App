import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the API module so no real network calls happen.
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('../services/api', () => ({
  default: { post: postMock },
  getToken: () => localStorage.getItem('trivia-token'),
  setToken: (token) => {
    if (token) localStorage.setItem('trivia-token', token)
    else localStorage.removeItem('trivia-token')
  },
}))

import { AuthProvider } from '../context/AuthProvider'
import { useAuth } from '../context/AuthContext'

function Consumer() {
  const { user, isAuthenticated, error, login, logout } = useAuth()
  return (
    <div>
      <p>{isAuthenticated ? 'logged-in' : 'logged-out'}</p>
      <p>{user ? `user:${user.username}` : 'no-user'}</p>
      <p>{error ? `error:${error}` : 'no-error'}</p>
      <button onClick={() => login({ email: 'a@b.com', password: 'secret123' })}>
        do-login
      </button>
      <button onClick={logout}>do-logout</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    postMock.mockReset()
  })

  it('starts logged out when nothing is saved', () => {
    renderWithProvider()
    expect(screen.getByText('logged-out')).toBeTruthy()
    expect(screen.getByText('no-user')).toBeTruthy()
  })

  it('logs in, then stores the token and user', async () => {
    postMock.mockResolvedValue({
      data: { access_token: 'abc123', user: { username: 'gloria' } },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))

    await waitFor(() => expect(screen.getByText('logged-in')).toBeTruthy())
    expect(screen.getByText('user:gloria')).toBeTruthy()
    expect(localStorage.getItem('trivia-token')).toBe('abc123')
    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'secret123',
    })
  })

  it('shows the server error when login fails', async () => {
    postMock.mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))

    await waitFor(() =>
      expect(screen.getByText('error:Invalid credentials')).toBeTruthy()
    )
    expect(screen.getByText('logged-out')).toBeTruthy()
  })

  it('logout clears the token and user', async () => {
    postMock.mockResolvedValue({
      data: { access_token: 'abc123', user: { username: 'gloria' } },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))
    await waitFor(() => expect(screen.getByText('logged-in')).toBeTruthy())

    fireEvent.click(screen.getByText('do-logout'))

    // logout() is async (it calls the server first), so wait for the session to be cleared.
    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy())
    expect(screen.getByText('no-user')).toBeTruthy()
    expect(localStorage.getItem('trivia-token')).toBeNull()
  })

  it('logout asks the server to revoke the token', async () => {
    postMock.mockResolvedValue({
      data: { access_token: 'abc123', user: { username: 'gloria' } },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))
    await waitFor(() => expect(screen.getByText('logged-in')).toBeTruthy())

    fireEvent.click(screen.getByText('do-logout'))
    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy())

    // POST /api/auth/logout tells the backend to stop accepting this token.
    expect(postMock).toHaveBeenCalledWith('/auth/logout')
  })

  it('logout still clears the session when the server call fails', async () => {
    postMock.mockResolvedValueOnce({
      data: { access_token: 'abc123', user: { username: 'gloria' } },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))
    await waitFor(() => expect(screen.getByText('logged-in')).toBeTruthy())

    // The logout request fails (e.g. the token already expired or the server is down).
    postMock.mockRejectedValueOnce({ response: { status: 401 } })
    fireEvent.click(screen.getByText('do-logout'))

    // The user is logged out locally anyway.
    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy())
    expect(localStorage.getItem('trivia-token')).toBeNull()
  })

  it('restores a saved session after a refresh', () => {
    localStorage.setItem('trivia-token', 'saved-token')
    localStorage.setItem('trivia-user', JSON.stringify({ username: 'gloria' }))
    renderWithProvider()

    expect(screen.getByText('logged-in')).toBeTruthy()
    expect(screen.getByText('user:gloria')).toBeTruthy()
  })

  it('useAuth throws outside an AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(/AuthProvider/)
    spy.mockRestore()
  })
})