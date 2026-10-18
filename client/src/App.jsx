// App.jsx manages page navigation, displays the Navigation bar and shares login state (AuthProvider) and quiz score data (ScoreProvider) with all routes.
// Public routes (/login, /signup) can be opened by anyone. Every other route is protected: ProtectedRoute redirects logged-out users to /login.

import { Routes, Route } from 'react-router-dom' // get routing components 
import { AuthProvider } from './context/AuthProvider' // manages login state (user, token, login, signup, logout)
import { ScoreProvider } from './context/ScoreContext' // manages quiz scores
import NavBar from './components/NavBar' // gets navigation bar component
import ProtectedRoute from './components/ProtectedRoute' // only lets logged-in users through

// Import page components
import HomePage from './pages/HomePage' 
import QuizPage from './pages/QuizPage'
import ResultsPage from './pages/ResultsPage'
import ScoreboardPage from './pages/ScoreboardPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'


// Define main App component that brings the navigation bar, page routes, shared login state and shared quiz score state 
function App() {
  return (
    // AuthProvider is the outermost wrapper so NavBar and every page can call useAuth().
    <AuthProvider>
      <ScoreProvider> 
        <NavBar /> {/* Display the navigation bar across all pages*/} 
        <div className="container">
          <Routes> {/* Map each URL path to its page component*/} 

            {/* Public routes: anyone can open these, logged in or not. */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected routes: ProtectedRoute wraps them all. Logged-out users are sent to /login,
                and after logging in they return to the page they asked for. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} /> 
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/scoreboard" element={<ScoreboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

          </Routes>
        </div>     
      </ScoreProvider>
    </AuthProvider>
  )
}

// Make the App component available to other files 
export default App