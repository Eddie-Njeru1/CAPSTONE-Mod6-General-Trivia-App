// NotFoundPage.jsx
// Shown for any URL that does not match a route (the "*" route in App.jsx).
// Tells the user the page does not exist and offers a way back: logged-in users
// are sent to their home page, logged-out users to the public landing page.
//
// Used by: the "*" route in App.jsx.
// Depends on: useAuth() (isAuthenticated) and React Router.

import { Link } from 'react-router-dom' // link back to a valid page
import { useAuth } from '../context/AuthContext' // tells us whether a user is logged in

function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  // Logged-in users have a home page at /home; everyone else starts at /.
  const homePath = isAuthenticated ? '/home' : '/'

  return (
    <section className="not-found-page">
      <p className="not-found-page__code">404</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has been moved.</p>

      <Link to={homePath} className="not-found-page__link">
        {isAuthenticated ? 'Back to home' : 'Back to the start'}
      </Link>
    </section>
  )
}

export default NotFoundPage