// AuthContext.test.jsx
// Tests for AuthProvider and the useAuth() hook.
// The API module is mocked, so no real network calls happen and no backend is needed.
//
// Covers: starting logged out, login, failed login, logout (including the server call),
// restoring a saved session, validating it with /auth/me, isAdmin, clearing an
// invalid session, keeping the session when offline, and useAuth() outside a provider.

import { describe, it, expect, vi, beforeEach } from 'vitest' // test tools
import { render, screen, fireEvent, waitFor } from '@testing-library/react' // render components and interact

// vi.hoisted creates the mock functions before the vi.mock call below runs.
const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}))

// Replace the real api.js with a fake. post and get are controllable mocks, and the
// token helpers read and write localStorage directly, like the real ones.
vi.mock('../services/api', () => ({
  default: { post: postMock, get: getMock },
  getToken: () => localStorage.getItem('trivia-token'),
  setToken: (token) => {
    if (token) localStorage.setItem('trivia-token', token)
    else localStorage.removeItem('trivia-token')
  },
}))

import { AuthProvider } from '../context/AuthProvider'
import { useAuth } from '../context/AuthContext'

// A tiny component that shows the auth state as text, so tests can read it.
function Consumer() {
  const { user, isAuthenticated, isAdmin, initializing, error, login, logout } =
    useAuth()
  return (
    <div>
      <p>{isAuthenticated ? 'logged-in' : 'logged-out'}</p>
      <p>{isAdmin ? 'admin' : 'not-admin'}</p>
      <p>{initializing ? 'checking' : 'ready'}</p>
      <p>{user ? `user:${user.username}` : 'no-user'}</p>
      <p>{error ? `error:${error}` : 'no-error'}</p>
      <button onClick={() => login({ email: 'a@b.com', password: 'secret123' })}>
        do-login
      </button>
      <button onClick={logout}>do-logout</button>
    </div>
  )
}

// Renders the Consumer inside a real AuthProvider.
function renderWithProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  )
}

// Pretends a previous visit saved a token and user in the browser.
function saveSession(user = { username: 'gloria', role: 'user' }) {
  localStorage.setItem('trivia-token', 'saved-token')
  localStorage.setItem('trivia-user', JSON.stringify(user))
}

describe('AuthContext', () => {
  // Start every test clean so one test cannot affect another.
  beforeEach(() => {
    localStorage.clear()
    postMock.mockReset()
    getMock.mockReset()
  })

  it('starts logged out when nothing is saved', () => {
    renderWithProvider()
    expect(screen.getByText('logged-out')).toBeTruthy()
    expect(screen.getByText('no-user')).toBeTruthy()
    expect(screen.getByText('ready')).toBeTruthy()
    // With no saved token there is nothing to validate.
    expect(getMock).not.toHaveBeenCalled()
  })

  it('logs in, then stores the token and user', async () => {
    postMock.mockResolvedValue({
      data: { access_token: 'abc123', user: { username: 'gloria' } },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))

    // waitFor: login is async, so wait until the screen updates.
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

  it('isAdmin is true after logging in as an admin', async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: 'abc123',
        user: { username: 'eddie', role: 'admin' },
      },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))

    await waitFor(() => expect(screen.getByText('admin')).toBeTruthy())
  })

  it('isAdmin is false for a normal user', async () => {
    postMock.mockResolvedValue({
      data: {
        access_token: 'abc123',
        user: { username: 'gloria', role: 'user' },
      },
    })
    renderWithProvider()

    fireEvent.click(screen.getByText('do-login'))

    await waitFor(() => expect(screen.getByText('logged-in')).toBeTruthy())
    expect(screen.getByText('not-admin')).toBeTruthy()
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

  it('restores a saved session and checks it with /auth/me', async () => {
    saveSession()
    getMock.mockResolvedValue({
      data: { user: { username: 'gloria', role: 'user' } },
    })
    renderWithProvider()

    // The saved session shows immediately, before the server has answered.
    expect(screen.getByText('logged-in')).toBeTruthy()
    expect(screen.getByText('user:gloria')).toBeTruthy()

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy())
    expect(getMock).toHaveBeenCalledWith('/auth/me')
  })

  it('refreshes the saved user from /auth/me (e.g. a changed role)', async () => {
    // The browser remembers a normal user, but the server says they are now an admin.
    saveSession({ username: 'gloria', role: 'user' })
    getMock.mockResolvedValue({
      data: { user: { username: 'gloria', role: 'admin' } },
    })
    renderWithProvider()

    await waitFor(() => expect(screen.getByText('admin')).toBeTruthy())
  })

  it('accepts /auth/me returning a bare user object', async () => {
    saveSession({ username: 'gloria', role: 'user' })
    getMock.mockResolvedValue({ data: { username: 'gloria', role: 'admin' } })
    renderWithProvider()

    await waitFor(() => expect(screen.getByText('admin')).toBeTruthy())
  })

  it('clears the session when the server rejects the token (401)', async () => {
    saveSession()
    getMock.mockRejectedValue({ response: { status: 401 } })
    renderWithProvider()

    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy())
    expect(screen.getByText('ready')).toBeTruthy()
    expect(localStorage.getItem('trivia-token')).toBeNull()
  })

  it('clears the session when the account is deactivated (403)', async () => {
    saveSession()
    getMock.mockRejectedValue({ response: { status: 403 } })
    renderWithProvider()

    await waitFor(() => expect(screen.getByText('logged-out')).toBeTruthy())
    expect(localStorage.getItem('trivia-token')).toBeNull()
  })

  it('keeps the session when the server cannot be reached (offline)', async () => {
    saveSession()
    getMock.mockRejectedValue(new Error('Network Error'))
    renderWithProvider()

    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy())
    expect(screen.getByText('logged-in')).toBeTruthy()
    expect(localStorage.getItem('trivia-token')).toBe('saved-token')
  })

  it('useAuth throws outside an AuthProvider', () => {
    // Silence React's expected error log so the test output stays clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow(/AuthProvider/)
    spy.mockRestore()
  })
})