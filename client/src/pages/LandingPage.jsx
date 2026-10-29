// LandingPage.jsx
// The public front page at "/". Visitors who are not logged in see a header with
// Log in and Sign up links, followed by Sandra's landing sections (Hero, FeatureStrip,
// TryItQuestion). Visitors who are already logged in are sent straight to /home.
//
// The header links live here, not in Hero, so a logged-out visitor can always
// reach /login and /signup, even while the landing sections are still being built.
//
// Used by: the "/" route in App.jsx.
// Depends on: useAuth() (isAuthenticated), React Router, and the components in components/landing/.

import { Link, Navigate } from 'react-router-dom' // links to login/signup, redirect for logged-in users
import { useAuth } from '../context/AuthContext' // tells us whether a user is logged in
import Hero from '../components/landing/Hero' // main banner (Sandra)
import FeatureStrip from '../components/landing/FeatureStrip' // short list of features (Sandra)
import TryItQuestion from '../components/landing/TryItQuestion' // sample question demo (Sandra)

function LandingPage() {
  const { isAuthenticated } = useAuth()

  // Logged-in users do not need the sales page. replace: true keeps "/" out of the Back button history.
  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="landing-page">
      <header className="landing-page__header">
        <span className="landing-page__brand">General Trivia</span>

        <nav className="landing-page__actions" aria-label="Account">
          <Link to="/login" className="landing-page__link">
            Log in
          </Link>
          <Link to="/signup" className="landing-page__link landing-page__link--primary">
            Sign up
          </Link>
        </nav>
      </header>

      <main className="landing-page__main">
        <Hero />
        <FeatureStrip />
        <TryItQuestion />
      </main>
    </div>
  )
}

export default LandingPage