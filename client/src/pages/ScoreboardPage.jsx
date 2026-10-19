import { Link } from 'react-router-dom'
import { useScore } from '../context/useScore'

function ScoreboardPage() {
  const { history } = useScore()

  return (
    <section className="scoreboard-page">
      <div className="scoreboard-header">
        <p className="scoreboard-header__eyebrow">Your progress</p>
        <h1 className="scoreboard-header__title">Scoreboard</h1>
        <p className="scoreboard-header__description">
          Keep track of your previous trivia rounds and scores.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="scoreboard-empty">
          <h2>No scores yet</h2>
          <p>
            Play a round of trivia to start building your score history.
          </p>

          <Link to="/" className="scoreboard-action scoreboard-action--primary">
            Play a Quiz
          </Link>
        </div>
      ) : (
        <div className="scoreboard-card">
          <div className="scoreboard-card__header">
            <span>Category</span>
            <span>Score</span>
          </div>

          <ul className="scoreboard-list">
            {history.map((entry) => (
              <li className="scoreboard-item" key={entry.id}>
                <span className="scoreboard-item__category">
                  {entry.category}
                </span>

                <span className="scoreboard-item__score">
                  {entry.score}/{entry.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="scoreboard-footer">
        <Link to="/" className="scoreboard-action scoreboard-action--secondary">
          Back to Home
        </Link>
      </div>
    </section>
  )
}

export default ScoreboardPage