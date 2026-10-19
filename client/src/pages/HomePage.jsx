import { Link } from 'react-router-dom'
import CategoryCard from '../components/CategoryCard'
import { useCategories } from '../hooks/useCategories'
import Loader from '../components/Loader'
import ErrorMessage from '../components/ErrorMessage'

function HomePage() {
  const { categories, loading, error } = useCategories()

  // UI change: show the reusable loader while categories are loading.
  if (loading) {
    return <Loader message="Loading categories..." />
  }

  // UI change: show the reusable error message if categories fail to load.
  if (error) {
    return <ErrorMessage message={error} />
  }

  return (
    <section className="home-page">
      {/* UI change: hero section gives the homepage a clear introduction. */}
      <div className="home-page__hero">
        <p className="home-page__eyebrow">Test your knowledge</p>

        <h1 className="home-page__title">General Trivia</h1>

        <p className="home-page__description">
          Choose a category and see how many questions you can get right.
        </p>

        {/* UI change: styled call-to-action for a mixed trivia round. */}
        <Link to="/quiz?category=mixed" className="mixed-quiz">
          <span className="mixed-quiz__title">Mixed / Random</span>

          <span className="mixed-quiz__description">
            A little bit of everything
          </span>
        </Link>
      </div>

      {/* Existing dynamic categories are preserved. */}
      <div className="category-section">
        <h2 className="category-section__title">Choose a Category</h2>

        <div className="category-grid">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              name={category.name}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default HomePage