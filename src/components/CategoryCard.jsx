import { Link } from 'react-router-dom'

function CategoryCard({ id, name }) {
  return (
    <Link to={`/quiz?category=${id}`} className="category-card">
      <h3>{name}</h3>
    </Link>
  )
}

export default CategoryCard