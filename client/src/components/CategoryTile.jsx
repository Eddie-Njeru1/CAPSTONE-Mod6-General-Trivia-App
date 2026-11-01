// Displays one clickable trivia category.

import { Link } from 'react-router-dom'
import categoryIcons from '../utils/categoryIcons'

function CategoryTile({ id, name, color }) {
  const category = categoryIcons[id] || categoryIcons.default
  const categoryColor = color || category.color

  return (
    <Link
      to={`/quiz?category=${id}`}
      className="category-tile"
      style={{ '--category-color': categoryColor }}
    >
      <span className="category-tile__name">{name}</span>
    </Link>
  )
}

export default CategoryTile