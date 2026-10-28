// Tests for category colors and fallback mappings.

import { describe, it, expect } from 'vitest'
import categoryIcons from '../utils/categoryIcons'

describe('categoryIcons', () => {
  it('contains a color for each numbered category', () => {
    for (let id = 9; id <= 32; id++) {
      expect(categoryIcons[id]).toBeDefined()
      expect(categoryIcons[id].color).toBeDefined()
    }
  })

  it('uses valid hexadecimal color values', () => {
    Object.values(categoryIcons).forEach((category) => {
      expect(category.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  it('contains a color for the mixed category', () => {
    expect(categoryIcons.mixed).toBeDefined()
    expect(categoryIcons.mixed.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('provides a default color for unknown categories', () => {
    expect(categoryIcons.default).toBeDefined()
    expect(categoryIcons.default.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
})