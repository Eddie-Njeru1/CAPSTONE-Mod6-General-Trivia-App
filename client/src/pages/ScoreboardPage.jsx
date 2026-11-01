// ScoreboardPage.jsx
// The scoreboard page at /scoreboard. It has two sections:
//   1. Top players: the public leaderboard from GET /api/leaderboard, loaded by
//      useLeaderboard (Emmanuel). Ranked by total points across all rounds.
//   2. Your rounds: the player's own round history from useScore() (ScoreContext).
//
// The leaderboard section has its own loading, error (with a retry button) and empty
// states, so a failed request never hides the player's own rounds.
//
// Used by: the /scoreboard route in App.jsx.
// Depends on: useLeaderboard, useScore, useAuth (to highlight the current player).

import { Link } from 'react-router-dom' // links back to the home page
import { useScore } from '../context/useScore' // the player's own round history
import { useAuth } from '../context/AuthContext' // who is logged in (to highlight their row)
import useLeaderboard from '../hooks/useLeaderboard' // public ranking: { players, loading, error, refresh }

function ScoreboardPage() {
  const { history } = useScore()
  const { user } = useAuth()
  const { players, loading, error, refresh } = useLeaderboard()

  return (
    <section className="scoreboard-page">
      <div className="scoreboard-header">
        <p className="scoreboard-header__eyebrow">Your progress</p>
        <h1 className="scoreboard-header__title">Scoreboard</h1>
        <p className="scoreboard-header__description">
          See the top players and keep track of your own rounds and scores.
        </p>
      </div>

      {/* ---------- Section 1: Top players (public leaderboard) ---------- */}
      <div className="scoreboard-leaders">
        <h2 className="scoreboard-leaders__title">Top players</h2>

        {loading && (
          <p className="scoreboard-leaders__status" role="status">
            Loading the leaderboard...
          </p>
        )}

        {/* The hook gives a readable message. The button asks it to load again. */}
        {!loading && error && (
          <div className="scoreboard-leaders__error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && players.length === 0 && (
          <p className="scoreboard-leaders__status">
            No one is on the leaderboard yet. Finish a round to be the first.
          </p>
        )}

        {!loading && !error && players.length > 0 && (
          <div className="scoreboard-card">
            <div className="scoreboard-leaders__header">
              <span>Rank</span>
              <span>Player</span>
              <span>Points</span>
              <span>Games</span>
              <span>Best streak</span>
            </div>

            <ol className="scoreboard-leaders__list">
              {players.map((player) => {
                // Highlight the logged-in player's own row.
                const isMe = user?.username === player.username
                return (
                  <li
                    key={player.username}
                    className={
                      isMe
                        ? 'scoreboard-leaders__row scoreboard-leaders__row--me'
                        : 'scoreboard-leaders__row'
                    }
                  >
                    <span>{player.rank}</span>
                    <span>
                      {player.username}
                      {isMe && ' (you)'}
                    </span>
                    <span>{player.total_points}</span>
                    <span>{player.games_played}</span>
                    <span>{player.best_streak}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      {/* ---------- Section 2: Your rounds (unchanged from before) ---------- */}
      <h2 className="scoreboard-leaders__title">Your rounds</h2>

      {history.length === 0 ? (
        <div className="scoreboard-empty">
          <h2>No scores yet</h2>
          <p>
            Play a round of trivia to start building your score history.
          </p>

          <Link to="/home" className="scoreboard-action scoreboard-action--primary">
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
        <Link to="/home" className="scoreboard-action scoreboard-action--secondary">
          Back to Home
        </Link>
      </div>
    </section>
  )
}

export default ScoreboardPage