// UserMenu.jsx
// The avatar button in the top corner. Clicking it opens a dropdown with the user's
// name and the Log out button, so logout is hidden until the user asks for it.
// The dropdown closes when the user clicks outside it or presses Escape.
//
// Used by: AppLayout.jsx.
// Depends on: useAuth() (user, logout) and React Router's useNavigate.

import { useEffect, useRef, useState } from 'react' // open/closed state and a reference to the menu element
import { useNavigate } from 'react-router-dom' // go to the landing page after logging out
import { useAuth } from '../../context/AuthContext' // user details and the logout action

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null) // the wrapper element, used to detect clicks outside it

  // While the dropdown is open, close it on an outside click or the Escape key.
  // The listeners are removed again when it closes, so nothing is left running.
  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // The avatar shows the first letter of the username.
  const initial = user?.username?.charAt(0).toUpperCase() || '?'

  async function handleLogout() {
    setOpen(false)
    await logout() // revokes the token on the server, then clears the session
    navigate('/', { replace: true }) // back to the public landing page
  }

  return (
    <div className="user-menu" ref={menuRef}>
      {/* aria-haspopup and aria-expanded tell screen readers this button opens a menu */}
      <button
        type="button"
        className="user-menu__avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        onClick={() => setOpen((current) => !current)}
      >
        {initial}
      </button>

      {open && (
        <div className="user-menu__dropdown" role="menu">
          <p className="user-menu__name">{user?.username}</p>
          {user?.role === 'admin' && <p className="user-menu__role">Administrator</p>}
          <button
            type="button"
            className="user-menu__logout"
            role="menuitem"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu