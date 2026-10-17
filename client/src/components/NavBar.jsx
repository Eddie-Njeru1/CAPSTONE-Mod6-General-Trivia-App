// Import NavLink for navigation between pages.
import { NavLink } from 'react-router-dom'

// Create the navigation bar component.
function NavBar() {
  return (
    // Wrap the navigation links.
    <nav className="navbar">
      <div className="navbar__inner">

        {/* Navigate to the home page. */}
        <NavLink to="/" end className="navbar__link">
          Home
        </NavLink>

        {/* Navigate to the scoreboard page. */}
        <NavLink to="/scoreboard" className="navbar__link">
          Scoreboard
        </NavLink>

      </div>
    </nav>
  )
}

// Export the component for use in other files.
export default NavBar