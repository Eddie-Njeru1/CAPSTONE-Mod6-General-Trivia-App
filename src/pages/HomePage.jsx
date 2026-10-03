import { Link } from 'react-router-dom'
import CategoryCard from '../components/CategoryCard'

// Temporary fake data — replace with real data from useCategories() once available.
const fakeCategories = [
  { id: 9, name: 'General Knowledge' },
  { id: 21, name: 'Sports' },
  { id: 23, name: 'History' },
  { id: 17, name: 'Science & Nature' },
]

function HomePage() {
  const categories = fakeCategories

  return (
    <section className="home-page">
      <div className="home-page__hero">
        <p className="home-page__eyebrow">Test your knowledge</p>

        <h1 className="home-page__title">General Trivia</h1>

        <p className="home-page__description">
          Choose a category and see how many questions you can get right.
        </p>

        <Link to="/quiz?category=mixed" className="mixed-quiz">
          <span className="mixed-quiz__title">Mixed / Random</span>
          <span className="mixed-quiz__description">
            A little bit of everything
          </span>
        </Link>
      </div>

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