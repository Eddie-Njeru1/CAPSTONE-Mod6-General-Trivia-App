// Displays trivia categories in pages so the grid stays compact.

import { useState } from 'react'
import CategoryTile from './CategoryTile'

const CATEGORIES_PER_PAGE = 8

function CategoryGrid({ categories = [] }) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(categories.length / CATEGORIES_PER_PAGE)

  const startIndex = page * CATEGORIES_PER_PAGE
  const visibleCategories = categories.slice(
    startIndex,
    startIndex + CATEGORIES_PER_PAGE,
  )

  if (categories.length === 0) {
    return <p className="category-grid__empty">No categories available.</p>
  }

  return (
    <div className="category-grid-wrapper">
      <div className="category-grid">
        {visibleCategories.map((category) => (
          <CategoryTile
            key={category.id}
            id={category.id}
            name={category.name}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="category-pagination">
          <button
            type="button"
            className="category-pagination__button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page === 0}
          >
            Previous
          </button>

          <span className="category-pagination__status">
            Page {page + 1} of {totalPages}
          </span>

          <button
            type="button"
            className="category-pagination__button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page === totalPages - 1}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default CategoryGrid