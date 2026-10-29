// AppLayout.jsx
// The page shell for logged-in pages: side menu on the left, the avatar menu at the
// top right, and the current page in the middle. React Router's <Outlet /> is the
// place where the matching child route (Home, Quiz, Dashboard...) is drawn.
//
// Used by: App.jsx, as a layout route wrapping the logged-in routes.
// Depends on: SideMenu, UserMenu and layout.css.

import { Outlet } from 'react-router-dom' // placeholder where the child page is rendered
import SideMenu from './SideMenu'
import UserMenu from './UserMenu'
import '../../styles/layout.css' // layout styles are loaded here so main.jsx does not need to change

function AppLayout() {
  return (
    <div className="app-layout">
      <SideMenu />

      <div className="app-layout__main">
        <header className="app-layout__header">
          <UserMenu />
        </header>

        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout