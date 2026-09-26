import { Link } from 'react-router-dom'
import CategoryCard from '../components/CategoryCard'

// Temporary fake data — replace with real data from useCategories() once Emmanuel's hook is ready.
// Real hook usage will likely look like:
// const { data: categories, loading, error } = useCategories()
const fakeCategories = [
  { id: 9, name: 'General Knowledge' },
  { id: 21, name: 'Sports' },
  { id: 23, name: 'History' },
  { id: 17, name: 'Science & Nature' },
]

function HomePage() {
  const categories = fakeCategories

  return (
    <section>
      <h1>Choose a Category</h1>

      <Link to="/quiz?category=mixed">
        Mixed / Random
      </Link>

      <div>
        {categories.map((category) => (
          <CategoryCard key={category.id} id={category.id} name={category.name} />
        ))}
      </div>
    </section>
  )
}

export default HomePage