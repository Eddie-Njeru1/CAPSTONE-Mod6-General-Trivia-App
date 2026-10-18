// NavBar.jsx
// Navigation bar shown on every page. The links change with the login state:
// logged out -> Log in and Sign up; logged in -> Home, Scoreboard, Dashboard,
// the user's name and a Log out button.
//
// Used by: App.jsx (inside AuthProvider, so useAuth() works here).
// Depends on: useAuth() (AuthContext.js) for the login state and logout().

// Import NavLink for navigation between pages, and useNavigate to redirect after logout.
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext' // isAuthenticated, user and logout

// Create the navigation bar component.
function NavBar() {
  // isAuthenticated: true when a user is logged in.
  // user: the logged-in user's details (null when logged out).
  // logout: clears the saved session.
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  // Log out (this also revokes the token on the server), then send the user to the login page.
  // await: wait for logout() to finish so the page does not change while the session is still active.
  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    // Wrap the navigation links.
    <nav className="navbar">
      <div className="navbar__inner">

        {isAuthenticated ? (
          <>
            {/* Navigate to the home page. */}
            <NavLink to="/" end className="navbar__link">
              Home
            </NavLink>

            {/* Navigate to the scoreboard page. */}
            <NavLink to="/scoreboard" className="navbar__link">
              Scoreboard
            </NavLink>

            {/* Navigate to the dashboard where the user manages their own data. */}
            <NavLink to="/dashboard" className="navbar__link">
              Dashboard
            </NavLink>

            {/* Show who is logged in (user is null until the details are loaded). */}
            {user && <span className="navbar__user">{user.username}</span>}

            {/* Log the user out. A button, not a link, because it performs an action. */}
            <button type="button" className="navbar__link navbar__logout" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            {/* Navigate to the login page. */}
            <NavLink to="/login" className="navbar__link">
              Log in
            </NavLink>

            {/* Navigate to the signup page. */}
            <NavLink to="/signup" className="navbar__link">
              Sign up
            </NavLink>
          </>
        )}

      </div>
    </nav>
  )
}

// Export the component for use in other files.
export default NavBar