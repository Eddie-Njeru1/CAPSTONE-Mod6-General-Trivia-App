// App.jsx manages page navigation, displays the Navigation bar and provides shared quiz score data to all routes though ScoreProvider.

import { Routes, Route } from 'react-router-dom' // get routing components 
import { ScoreProvider } from './context/ScoreContext' // manages quiz scores
import NavBar from './components/NavBar' // gets navigation bar component

// Import page components
import Homepage from './pages/HomePage' 
import QuizPage from './pages/QuizPage'
import ResultPage from './pages/ResultsPage'
import ScoreboardPage from './pages/ScoreboardPage'
import HomePage from './pages/HomePage'

// Define main App component that brings the navigation bar, page routes and shared quiz score state 
function App() {
  return (
    <ScoreProvider> 
      <NavBar /> {/* Display the naigation bar across all pages*/} 
      <Routes> {/* Map each URL path to its page component*/} 
        <Route path="/" element={<HomePage />} /> 
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/results" element={<ResultPage />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
      </Routes>
    </ScoreProvider>
  )
}

// Make the App component available to other files 
export default App // 