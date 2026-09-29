import { Link } from 'react-router-dom'

function ResultsPage() {
  // Placeholder values — will be replaced with real data from ScoreContext (Austin's file)
  const score = 0
  const totalQuestions = 0

  return (
    <section>
      <h1>Results</h1>
      <p>
        You scored {score} out of {totalQuestions}
      </p>

      <div>
        <Link to="/">Play Again</Link>
        <Link to="/scoreboard">View Scoreboard</Link>
      </div>
    </section>
  )
}

export default ResultsPage