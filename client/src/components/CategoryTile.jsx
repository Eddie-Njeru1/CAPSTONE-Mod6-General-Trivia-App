// Displays one clickable trivia category.

import { Link } from 'react-router-dom'
import categoryIcons from '../utils/categoryIcons'

const iconPaths = {
  flask: 'M9 3h6m-5 0v7l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  landmark: 'M3 21h18M5 21V10m14 11V10M3 10h18L12 3 3 10Zm3 0v11m6-11v11m6-11v11',
  laptop: 'M4 5h16v12H4zM2 21h20l-2-4H4l-2 4Z',
  lightbulb: 'M9 18h6m-5 4h4m-5-8a7 7 0 1 1 6 0c-1 1-1 2-1 4h-4c0-2 0-3-1-4Z',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3Zm12-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z',
  trophy: 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4',
  utensils: 'M3 2v7a3 3 0 0 0 6 0V2M6 2v20m12-20v20m0-20a5 5 0 0 0-5 5v5h5',
}

function CategoryTile({ id, name, color, icon }) {
  const category = categoryIcons[id] || categoryIcons[icon] || categoryIcons.default
  const categoryColor = color || category.color
  const categoryIcon = icon || category.icon
  const iconPath = iconPaths[categoryIcon]

  return (
    <Link
      to={`/quiz?category=${id}`}
      className="category-tile"
      style={{ '--category-color': categoryColor }}
    >
      {iconPath && (
        <svg
          className="category-tile__icon"
          viewBox="0 0 24 24"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={iconPath} />
        </svg>
      )}
      <span className="category-tile__name">{name}</span>
    </Link>
  )
}

export default CategoryTile