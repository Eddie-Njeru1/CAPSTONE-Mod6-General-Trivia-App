import { Link } from 'react-router-dom'

function ScoreboardPage() {
  // Placeholder data — real scoreboard history/rewards logic isn't owned by this role yet.
  // Likely candidates: local storage history, or a future backend/leaderboard feature.
  const pastScores = []

  return (
    <section>
      <h1>Scoreboard</h1>

      {pastScores.length === 0 ? (
        <p>No past scores yet. Play a round to see your history here.</p>
      ) : (
        <ul>
          {pastScores.map((entry, index) => (
            <li key={index}>
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