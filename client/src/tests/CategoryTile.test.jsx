// Tests for the category tile.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CategoryTile from '../components/CategoryTile'
import categoryIcons from '../utils/categoryIcons'

describe('CategoryTile', () => {
  it('renders the category name', () => {
    render(
      <MemoryRouter>
        <CategoryTile id={9} name="General Knowledge" />
      </MemoryRouter>
    )

    expect(screen.getByText('General Knowledge')).toBeInTheDocument()
  })

  it('links to the correct quiz category', () => {
    render(
      <MemoryRouter>
        <CategoryTile id={9} name="General Knowledge" />
      </MemoryRouter>
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/quiz?category=9'
    )
  })

  it('applies the category color', () => {
    render(
      <MemoryRouter>
        <CategoryTile id={9} name="General Knowledge" />
      </MemoryRouter>
    )

    expect(screen.getByRole('link')).toHaveStyle({
      '--category-color': categoryIcons[9].color,
    })
  })

  it('uses the default color for an unknown category', () => {
    render(
      <MemoryRouter>
        <CategoryTile id={999} name="Unknown Category" />
      </MemoryRouter>
    )

    expect(screen.getByRole('link')).toHaveStyle({
      '--category-color': categoryIcons.default.color,
    })
  })
})