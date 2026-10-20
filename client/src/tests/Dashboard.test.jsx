
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Create mock functions before vi.mock() uses them.
const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}))

// Replace the API service with mock functions to avoid real API requests.
vi.mock('../services/api', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}))

import DashboardPage from '../pages/DashboardPage'

// Creates a sample API response containing categories and pagination details.
const page = (items) => ({
  data: {
    items,
    pagination: { page: 1, pages: 1, total: items.length },
  },
})

describe('DashboardPage', () => {
  // Reset all mocks before each test to prevent results from affecting other tests.
  beforeEach(() => {
    [getMock, postMock, patchMock, deleteMock].forEach((m) => m.mockReset())
  })

  // Checks that the page loads the logged-in user's categories from the API.
  it('loads the logged-in user\'s categories from the API', async () => {
    getMock.mockResolvedValue(
      page([{ id: 1, name: 'Science', description: 'Atoms' }])
    )

    render(<DashboardPage />)

    expect(await screen.findByText('Science')).toBeTruthy()
    expect(getMock).toHaveBeenCalledWith('/categories', {
      params: { mine: true, per_page: 100 },
    })
  })

  // Checks that an API error is displayed when categories cannot be loaded.
  it('shows an error when the list cannot be loaded', async () => {
    getMock.mockRejectedValue({
      response: { data: { error: 'Authentication required' } },
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Authentication required')).toBeTruthy()
  })

  // Checks that a new category can be created and the list is refreshed.
  it('creates a category and reloads the list', async () => {
    getMock.mockResolvedValueOnce(page([]))
    postMock.mockResolvedValue({ data: { id: 5, name: 'History' } })
    getMock.mockResolvedValueOnce(page([
      { id: 5, name: 'History', description: '' },
    ]))

    render(<DashboardPage />)

    // Wait for the initial category request to finish.
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1))

    // Open the form, enter a category name, and submit it.
    fireEvent.click(await screen.findByRole('button', { name: /Add Resource/ }))
    fireEvent.change(screen.getByLabelText('Resource Name'), {
      target: { value: 'History' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /save|add|create|submit/i })
    )

    // Confirm the category appears and the API receives the submitted name.
    expect(await screen.findByText('History')).toBeTruthy()
    expect(postMock).toHaveBeenCalledWith(
      '/categories',
      expect.objectContaining({ name: 'History' })
    )
  })

  // Checks that a failed save displays the server error and keeps the form open.
  it('shows the server message when a save fails and keeps the form open', async () => {
    getMock.mockResolvedValue(page([]))
    postMock.mockRejectedValue({
      response: {
        data: { error: 'The operation conflicts with existing data.' },
      },
    })

    render(<DashboardPage />)

    // Open the form, enter a category name, and attempt to save it.
    fireEvent.click(await screen.findByRole('button', { name: /Add Resource/ }))
    fireEvent.change(screen.getByLabelText('Resource Name'), {
      target: { value: 'Dup' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /save|add|create|submit/i })
    )

    // Confirm the error is shown and the form remains available.
    expect(
      await screen.findByText('The operation conflicts with existing data.')
    ).toBeTruthy()
    expect(screen.getByLabelText('Resource Name')).toBeTruthy()
  })

  // Checks that deleting a category calls the API and refreshes the list.
  it('deletes a category and reloads the list', async () => {
    getMock.mockResolvedValueOnce(
      page([{ id: 1, name: 'Science', description: '' }])
    )
    deleteMock.mockResolvedValue({
      data: { message: 'Category deleted successfully.' },
    })
    getMock.mockResolvedValueOnce(page([]))

    render(<DashboardPage />)

    // Wait for the category to appear, then click its delete button.
    await screen.findByText('Science')
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    // Confirm the correct category is deleted and removed from the page.
    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith('/categories/1')
    )
    await waitFor(() =>
      expect(screen.queryByText('Science')).toBeNull()
    )
  })
})
