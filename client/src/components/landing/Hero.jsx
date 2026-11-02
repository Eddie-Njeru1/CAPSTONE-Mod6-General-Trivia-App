// Main introduction section for the landing page.

import { Link } from 'react-router-dom'

function Hero() {
  return (
    <section className="landing-hero">
      <div className="landing-hero__content">
        <p className="landing-hero__eyebrow">Welcome to General Trivia</p>

        <h1 className="landing-hero__title">
          Challenge Your Mind.
          <span> Discover What You Know.</span>
        </h1>

        <p className="landing-hero__description">
          Test your knowledge across different categories, challenge yourself,
          and see how far you can go.
        </p>

        <div className="landing-hero__actions">
          <Link to="/signup" className="btn btn-primary">
            Get Started
          </Link>

          <Link to="/login" className="landing-hero__secondary-link">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero