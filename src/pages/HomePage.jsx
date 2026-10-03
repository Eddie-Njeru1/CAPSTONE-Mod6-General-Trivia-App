import { Link } from 'react-router-dom'
import CategoryCard from '../components/CategoryCard'
import { useCategories } from '../hooks/useCategories'

function HomePage() {
  const { categories, loading, error } = useCategories()

  if (loading) {
    return <p>Loading categories...</p>
  }

  if (error) {
    return <p>Something went wrong: {error}</p>
  }

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