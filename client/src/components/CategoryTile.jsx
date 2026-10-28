// Displays one clickable trivia category.

import { Link } from 'react-router-dom'
import categoryIcons from '../utils/categoryIcons'

function CategoryTile({ id, name }) {
  const category = categoryIcons[id] || categoryIcons.default

  return (
    <Link
      to={`/quiz?category=${id}`}
      className="category-tile"
      style={{ '--category-color': category.color }}
    >
      <span className="category-tile__name">{name}</span>
    </Link>
  )
}

export default CategoryTile