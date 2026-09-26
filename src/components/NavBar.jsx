import { NavLink } from 'react-router-dom'

function NavBar() {
  return (
    <nav>
      <NavLink to="/" end>
        Home
      </NavLink>
      <NavLink to="/results">
        Results
      </NavLink>
      <NavLink to="/scoreboard">
        Scoreboard
      </NavLink>
    </nav>
  )
}

export default NavBar