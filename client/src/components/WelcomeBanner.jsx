// Personal greeting and score streak for the home page.

import { useAuth } from '../context/AuthContext'
import { useScore } from '../context/useScore'

function WelcomeBanner() {
  const { user } = useAuth()
  const { bestStreak } = useScore()

  const name = user?.username || user?.email || 'Player'

  return (
    <section className="welcome-banner">
      <div className="welcome-banner__content">
        <p className="welcome-banner__eyebrow">Welcome back</p>

        <h2 className="welcome-banner__title">
          Hello, {name}!
        </h2>

        <p className="welcome-banner__message">
          Ready to test your knowledge?
        </p>
      </div>

      <div className="welcome-banner__streak">
        <span className="welcome-banner__streak-label">Best streak</span>
        <strong className="welcome-banner__streak-value">
          {bestStreak}
        </strong>
        <span className="welcome-banner__streak-unit">
          {bestStreak === 1 ? 'answer' : 'answers'}
        </span>
      </div>
    </section>
  )
}

export default WelcomeBanner