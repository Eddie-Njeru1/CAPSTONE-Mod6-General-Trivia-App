// App.jsx
// The route map for the whole app. It decides which page appears at which URL,
// and who is allowed to see it.
//
//   Public (anyone):        /  (landing page), /login, /signup
//   Logged-in users:        /home, /quiz, /results, /scoreboard, /dashboard
//   Admins only:            /admin
//   Anything else:          * (NotFoundPage)
//
// Logged-in pages are drawn inside AppLayout (side menu and avatar menu).
// AuthProvider is the outermost wrapper so every page can call useAuth();
// ScoreProvider shares the quiz score with the quiz, results and scoreboard pages.

import { Routes, Route } from 'react-router-dom' // routing components
import { AuthProvider } from './context/AuthProvider' // login state: user, token, isAdmin, login, logout
import { ScoreProvider } from './context/ScoreContext' // quiz score state
import ProtectedRoute from './components/ProtectedRoute' // only lets logged-in users through
import AdminRoute from './components/AdminRoute' // only lets admins through (built by Eddie)
import AppLayout from './components/layout/AppLayout' // side menu + avatar menu shell

// Public pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'

// Logged-in pages
import HomePage from './pages/HomePage'
import QuizPage from './pages/QuizPage'
import ResultsPage from './pages/ResultsPage'
import ScoreboardPage from './pages/ScoreboardPage'
import DashboardPage from './pages/DashboardPage'

// Admin page
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <AuthProvider>
      <ScoreProvider>
        <Routes>
          {/* Public routes: anyone can open these. The landing page sends
              logged-in users on to /home by itself. */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Logged-in routes. ProtectedRoute redirects logged-out users to /login
              (and brings them back afterwards). AppLayout adds the side menu. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/scoreboard" element={<ScoreboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Admin-only route: AdminRoute sends everyone who is not an admin to /home. */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          {/* Any URL that matches nothing above */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ScoreProvider>
    </AuthProvider>
  )
}

export default App