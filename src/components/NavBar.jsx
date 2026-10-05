import { NavLink } from 'react-router-dom'

function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" end className="navbar__link">
          Home
        </NavLink>

        <NavLink to="/results" className="navbar__link">
          Results
        </NavLink>

        <NavLink to="/scoreboard" className="navbar__link">
          Scoreboard
        </NavLink>
      </div>
    </nav>
  )
}

export default NavBar