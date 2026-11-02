// Highlights the main features of General Trivia.

function FeatureStrip() {
  const features = [
    {
      title: 'Explore Categories',
      description: 'Choose from a variety of trivia topics.',
    },
    {
      title: 'Test Your Knowledge',
      description: 'Challenge yourself with interesting questions.',
    },
    {
      title: 'Track Your Progress',
      description: 'Follow your scores and improve your performance.',
    },
  ]

  return (
    <section className="feature-strip">
      {features.map((feature) => (
        <article className="feature-strip__item" key={feature.title}>
          <h2>{feature.title}</h2>
          <p>{feature.description}</p>
        </article>
      ))}
    </section>
  )
}

export default FeatureStrip