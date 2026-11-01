// Navigation.test.jsx
// Tests for the logged-in app shell: SideMenu, UserMenu, AppLayout and NotFoundPage.
// useAuth() is mocked, so the tests control who is "logged in" and whether they are an
// admin. No backend and no real AuthProvider are involved.
//
// Covers: side menu links and the admin-only link, the active link, the avatar menu
// (hidden logout, open and close, logout and redirect), the 404 page links, and the
// layout shell drawing the current page.

import { describe, it, expect, vi, beforeEach } from 'vitest' // test tools
import { render, screen, fireEvent, waitFor } from '@testing-library/react' // render components and interact
import { MemoryRouter, Routes, Route } from 'react-router-dom' // fake in-memory router for tests

// The fake auth state the components read. Tests change its values as needed.
// vi.hoisted creates it before the vi.mock call below runs.
const { authState } = vi.hoisted(() => ({
  authState: {
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    logout: vi.fn(),
  },
}))

// Replace useAuth so the components read our fake state.
vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}))

import SideMenu from '../components/layout/SideMenu'
import UserMenu from '../components/layout/UserMenu'
import AppLayout from '../components/layout/AppLayout'
import NotFoundPage from '../pages/NotFoundPage'

// Puts the fake auth state back to "a normal logged-in user" before every test.
function resetAuth(overrides = {}) {
  Object.assign(authState, {
    user: { username: 'gloria', role: 'user' },
    isAuthenticated: true,
    isAdmin: false,
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

// Renders a component at a given URL inside a fake router.
function renderAt(path, element) {
  return render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>)
}

describe('SideMenu', () => {
  beforeEach(() => resetAuth())

  it('shows the main links for a normal user', () => {
    renderAt('/home', <SideMenu />)
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Scoreboard' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
  })

  it('hides the Admin link from normal users', () => {
    renderAt('/home', <SideMenu />)
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull()
  })

  it('shows the Admin link to admins', () => {
    resetAuth({ isAdmin: true, user: { username: 'eddie', role: 'admin' } })
    renderAt('/home', <SideMenu />)
    expect(screen.getByRole('link', { name: 'Admin' })).toBeTruthy()
  })

  it('marks the link of the current page as active', () => {
    renderAt('/scoreboard', <SideMenu />)
    expect(screen.getByRole('link', { name: 'Scoreboard' }).className).toContain(
      'side-menu__link--active'
    )
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain(
      'side-menu__link--active'
    )
  })
})

describe('UserMenu', () => {
  beforeEach(() => resetAuth())

  // The avatar button is the only way to open the menu.
  const getAvatar = () => screen.getByRole('button', { name: /open user menu/i })

  it('shows the first letter of the username on the avatar', () => {
    renderAt('/home', <UserMenu />)
    expect(getAvatar().textContent).toBe('G')
  })

  it('keeps Log out hidden until the avatar is clicked', () => {
    renderAt('/home', <UserMenu />)
    expect(screen.queryByText('Log out')).toBeNull()

    fireEvent.click(getAvatar())

    expect(screen.getByText('Log out')).toBeTruthy()
    expect(screen.getByText('gloria')).toBeTruthy()
  })

  it('shows the Administrator label for admins only', () => {
    renderAt('/home', <UserMenu />)
    fireEvent.click(getAvatar())
    expect(screen.queryByText('Administrator')).toBeNull()
  })

  it('shows the Administrator label when the user is an admin', () => {
    resetAuth({ isAdmin: true, user: { username: 'eddie', role: 'admin' } })
    renderAt('/home', <UserMenu />)
    fireEvent.click(getAvatar())
    expect(screen.getByText('Administrator')).toBeTruthy()
  })

  it('closes when the Escape key is pressed', () => {
    renderAt('/home', <UserMenu />)
    fireEvent.click(getAvatar())
    expect(screen.getByText('Log out')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText('Log out')).toBeNull()
  })

  it('closes when the user clicks outside it', () => {
    renderAt('/home', <UserMenu />)
    fireEvent.click(getAvatar())

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('Log out')).toBeNull()
  })

  it('logs out and returns to the landing page', async () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<UserMenu />} />
          <Route path="/" element={<p>landing-page</p>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.click(getAvatar())
    fireEvent.click(screen.getByText('Log out'))

    await waitFor(() => expect(screen.getByText('landing-page')).toBeTruthy())
    expect(authState.logout).toHaveBeenCalledTimes(1)
  })
})

describe('NotFoundPage', () => {
  it('shows the 404 message', () => {
    resetAuth({ isAuthenticated: false, user: null })
    renderAt('/nowhere', <NotFoundPage />)
    expect(screen.getByText('404')).toBeTruthy()
    expect(screen.getByText('Page not found')).toBeTruthy()
  })

  it('sends logged-out visitors back to the landing page', () => {
    resetAuth({ isAuthenticated: false, user: null })
    renderAt('/nowhere', <NotFoundPage />)
    const link = screen.getByRole('link', { name: /back to the start/i })
    expect(link.getAttribute('href')).toBe('/')
  })

  it('sends logged-in users back to /home', () => {
    resetAuth()
    renderAt('/nowhere', <NotFoundPage />)
    const link = screen.getByRole('link', { name: /back to home/i })
    expect(link.getAttribute('href')).toBe('/home')
  })
})

describe('AppLayout', () => {
  beforeEach(() => resetAuth())

  it('draws the side menu, the avatar and the current page', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<p>home-content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /open user menu/i })).toBeTruthy()
    expect(screen.getByText('home-content')).toBeTruthy()
  })
})