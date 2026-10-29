// SideMenu.jsx
// The vertical navigation bar shown on every logged-in page (Airbnb-style).
// Contains the main links. The Admin link only appears for admin accounts.
// On small screens layout.css turns it into a bar along the bottom of the screen.
//
// Used by: AppLayout.jsx.
// Depends on: useAuth() (isAdmin) and React Router's NavLink.

import { NavLink } from 'react-router-dom' // link that knows whether it is the current page
import { useAuth } from '../../context/AuthContext' // tells us whether the user is an admin

// NavLink passes { isActive }. We use it to add an "active" class to the current page's link.
function linkClass({ isActive }) {
  return isActive ? 'side-menu__link side-menu__link--active' : 'side-menu__link'
}

function SideMenu() {
  const { isAdmin } = useAuth()

  return (
    <nav className="side-menu" aria-label="Main navigation">
      <NavLink to="/home" className={linkClass}>
        Home
      </NavLink>
      <NavLink to="/scoreboard" className={linkClass}>
        Scoreboard
      </NavLink>
      <NavLink to="/dashboard" className={linkClass}>
        Dashboard
      </NavLink>

      {/* Only admins see this link. The /admin route itself is also guarded by AdminRoute. */}
      {isAdmin && (
        <NavLink to="/admin" className={linkClass}>
          Admin
        </NavLink>
      )}
    </nav>
  )
}

export default SideMenu