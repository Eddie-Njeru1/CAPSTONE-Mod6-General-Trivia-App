// App.jsx manages page navigation, displays the Navigation bar and provides shared quiz score data to all routes though ScoreProvider.

import { Routes, Route } from 'react-router-dom' // get routing components 
import { ScoreProvider } from './context/ScoreContext' // manages quiz scores
import NavBar from './components/NavBar' // gets navigation bar component

// Import page components
import HomePage from './pages/HomePage' 
import QuizPage from './pages/QuizPage'
import ResultsPage from './pages/ResultsPage'
import ScoreboardPage from './pages/ScoreboardPage'


// Define main App component that brings the navigation bar, page routes and shared quiz score state 
function App() {
  return (
    <ScoreProvider> 
      <NavBar /> {/* Display the naigation bar across all pages*/} 
      <div className="container">
        <Routes> {/* Map each URL path to its page component*/} 
        <Route path="/" element={<HomePage />} /> 
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
        </Routes>
      </div>     
    </ScoreProvider>
  )
}

// Make the App component available to other files 
export default App 
