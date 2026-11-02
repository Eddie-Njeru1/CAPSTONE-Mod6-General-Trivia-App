// Tests for the admin route guard.
// It runs inside the real AuthProvider. Only the API module is mocked, so no real network calls happen and no backend is needed.
// Covers: admins get in, normal users and logged-out visitors go to /home, the guard waits while the saved session is checked, a stale "admin" role is never shown, a deactivated account is sent away, and both ways of using the component.

import { describe, it, expect, vi, beforeEach } from 'vitest' // test tools
import { render, screen, waitFor } from '@testing-library/react' // render components and wait for updates
import { MemoryRouter, Routes, Route } from 'react-router-dom' // a router that needs no browser

// vi.hoisted creates the mock functions before the vi.mock call below runs.
const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

// Replace the real api.js. get is a controllable mock (the /auth/me check), and the
// token helpers read and write localStorage directly, like the real ones.
vi.mock('../services/api', () => ({
  default: { get: getMock, post: vi.fn() },
  getToken: () => localStorage.getItem('trivia-token'),
  setToken: (token) => {
    if (token) localStorage.setItem('trivia-token', token)
    else localStorage.removeItem('trivia-token')
  },
}))

import { AuthProvider } from '../context/AuthProvider'
import AdminRoute from '../components/AdminRoute'
import ProtectedRoute from '../components/ProtectedRoute'

// Pretends a previous visit saved a token and user in the browser.
function saveSession(role) {
  localStorage.setItem('trivia-token', 'saved-token')
  localStorage.setItem('trivia-user', JSON.stringify({ username: 'gloria', role }))
}

// What the server says about the saved token (GET /api/auth/me).
function serverSays(role) {
  getMock.mockResolvedValue({ data: { user: { username: 'gloria', role } } })
}

// AdminRoute on its own, used as a layout route (the same way App.jsx uses it).
function renderAdminRoute(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<p>admin-page</p>} />
          </Route>
          <Route path="/home" element={<p>home-page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

// The same nesting as App.jsx: ProtectedRoute first, then AdminRoute inside it.
function renderLikeApp(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login-page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<p>home-page</p>} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<p>admin-page</p>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('AdminRoute', () => {
  // Start every test clean so one test cannot affect another.
  beforeEach(() => {
    localStorage.clear()
    getMock.mockReset()
  })

  it('lets an admin open the admin page', async () => {
    saveSession('admin')
    serverSays('admin')
    renderAdminRoute()

    await waitFor(() => expect(screen.getByText('admin-page')).toBeTruthy())
    expect(screen.queryByText('home-page')).toBeNull()
  })

  it('sends a normal user to /home', async () => {
    saveSession('user')
    serverSays('user')
    renderAdminRoute()

    await waitFor(() => expect(screen.getByText('home-page')).toBeTruthy())
    expect(screen.queryByText('admin-page')).toBeNull()
  })

  it('sends a logged-out visitor to /home without calling the server', async () => {
    renderAdminRoute()

    await waitFor(() => expect(screen.getByText('home-page')).toBeTruthy())
    expect(screen.queryByText('admin-page')).toBeNull()
    expect(getMock).not.toHaveBeenCalled() // no saved token, nothing to check
  })

  it('shows a loader and hides the admin page while the saved session is checked', async () => {
    saveSession('admin') // the saved role says admin, but it has not been confirmed yet
    let finishCheck
    getMock.mockReturnValue(new Promise((resolve) => (finishCheck = resolve))) // /auth/me is still pending
    renderAdminRoute()

    expect(screen.getByRole('status').textContent).toMatch(/checking access/i)
    expect(screen.queryByText('admin-page')).toBeNull() // the stale role is not trusted yet
    expect(screen.queryByText('home-page')).toBeNull() // and nobody is redirected early

    finishCheck({ data: { user: { username: 'gloria', role: 'admin' } } }) // the server confirms
    await waitFor(() => expect(screen.getByText('admin-page')).toBeTruthy())
  })

  it('never shows the admin page to someone who was demoted since their last visit', async () => {
    saveSession('admin') // saved as admin on the last visit
    serverSays('user') // but the server now says they are a normal user
    renderAdminRoute()

    await waitFor(() => expect(screen.getByText('home-page')).toBeTruthy())
    expect(screen.queryByText('admin-page')).toBeNull()
  })

  it('sends a deactivated account away and clears its saved session', async () => {
    saveSession('admin')
    getMock.mockRejectedValue({ response: { status: 403 } }) // account deactivated
    renderLikeApp()

    // ProtectedRoute (outside) sees the cleared session and sends the user to /login.
    await waitFor(() => expect(screen.getByText('login-page')).toBeTruthy())
    expect(screen.queryByText('admin-page')).toBeNull()
    expect(localStorage.getItem('trivia-token')).toBeNull()
  })

  it('works when it wraps a page directly', async () => {
    saveSession('admin')
    serverSays('admin')
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <p>admin-page</p>
                </AdminRoute>
              }
            />
            <Route path="/home" element={<p>home-page</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText('admin-page')).toBeTruthy())
  })
})
