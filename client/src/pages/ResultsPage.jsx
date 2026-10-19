import { Link } from 'react-router-dom'
import { useScore } from '../context/useScore'

function ResultsPage() {
  const { history } = useScore()
  const lastRound = history[0]

  const score = lastRound ? lastRound.score : 0
  const totalQuestions = lastRound ? lastRound.total : 0
  const points = lastRound ? lastRound.points : 0

  return (
    <section className="results-page">
      <div className="results-card">
        <p className="results-page__eyebrow">Quiz complete!</p>

        <h1 className="results-page__title">Your Results</h1>

        <div className="results-score">
          <span className="results-score__number">{score}</span>
          <span className="results-score__total">
            / {totalQuestions}
          </span>
        </div>

        <p className="results-page__label">
          Questions answered correctly
        </p>

        <div className="results-points">
          <span className="results-points__label">Points earned</span>
          <strong className="results-points__value">{points}</strong>
        </div>

        <div className="results-actions">
          <Link to="/" className="results-actions__primary">
            Play Again
          </Link>

          <Link to="/scoreboard" className="results-actions__secondary">
            View Scoreboard
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ResultsPage