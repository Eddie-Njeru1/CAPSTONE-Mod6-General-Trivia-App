import { Link } from 'react-router-dom'
import { useScore } from '../context/useScore'

function ResultsPage() {
  const { history } = useScore()
  const lastRound = history[0]

  const score = lastRound ? lastRound.score : 0
  const totalQuestions = lastRound ? lastRound.total : 0
  const points = lastRound ? lastRound.points : 0

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