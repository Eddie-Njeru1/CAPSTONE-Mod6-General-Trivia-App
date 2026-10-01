import { Link } from 'react-router-dom'
import { useScore } from '../context/useScore'

function ResultsPage() {
  const { score, totalQuestions, points } = useScore()

  return (
    <section>
      <h1>Results</h1>
      <p>
        You scored {score} out of {totalQuestions}
      </p>
      <p>Points earned: {points}</p>

      <div>
        <Link to="/">Play Again</Link>
        <Link to="/scoreboard">View Scoreboard</Link>
      </div>
    </section>
  )
}

export default ResultsPage