import { Link } from 'react-router-dom'
import { useScore } from '../context/useScore'

function ScoreboardPage() {
  const { history } = useScore()

  return (
    <section>
      <h1>Scoreboard</h1>

      {history.length === 0 ? (
        <p>No past scores yet. Play a round to see your history here.</p>
      ) : (
        <ul>
          {history.map((entry) => (
            <li key={entry.id}>
              {entry.category} — {entry.score}/{entry.total}
            </li>
          ))}
        </ul>
      )}

      <Link to="/">Back to Home</Link>
    </section>
  )
}

export default ScoreboardPage