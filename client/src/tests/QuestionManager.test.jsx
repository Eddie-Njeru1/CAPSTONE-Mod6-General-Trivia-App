// Tests for QuestionManager, including loading, adding, editing and deleting questions.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import api from '../services/api'
import QuestionManager from '../components/QuestionManager'

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../components/QuestionForm', () => ({
  default: ({ onSubmit, onCancel, initialQuestion, submitting }) => (
    <div>
      <p>{initialQuestion ? 'Editing question' : 'Adding question'}</p>
      <button
        type="button"
        disabled={submitting}
        onClick={() =>
          onSubmit({
            text: 'What is 2 + 2?',
            question_type: 'multiple',
            difficulty: 'easy',
            correct_answer: '4',
            incorrect_answers: ['3', '5', '6'],
            category_id: 7,
          })
        }
      >
        Submit question
      </button>
      <button type="button" onClick={onCancel}>
        Cancel form
      </button>
    </div>
  ),
}))

vi.mock('../components/QuestionList', () => ({
  default: ({ questions, loading, error, onEdit, onDelete, onPageChange }) => (
    <div>
      {loading && <p role="status">Loading questions</p>}
      {error && <p role="alert">{error}</p>}

      {questions.map((question) => (
        <div key={question.id}>
          <p>{question.text}</p>
          <button onClick={() => onEdit(question)}>Edit question</button>
          <button onClick={() => onDelete(question)}>Delete question</button>
        </div>
      ))}

      <button onClick={() => onPageChange(2)}>Next page</button>
    </div>
  ),
}))

const question = {
  id: 1,
  text: 'What is the capital city of Kenya?',
  question_type: 'multiple',
  difficulty: 'easy',
  correct_answer: 'Nairobi',
  incorrect_answers: ['Mombasa', 'Kisumu', 'Nakuru'],
  category_id: 7,
}

const response = {
  data: {
    items: [question],
    pagination: { pages: 1 },
  },
}

describe('QuestionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
    api.get.mockResolvedValue(response)
  })

  it('asks the user to select a category when none is provided', () => {
    render(<QuestionManager />)

    expect(
      screen.getByText('Select a category to manage its questions.')
    ).toBeInTheDocument()

    expect(api.get).not.toHaveBeenCalled()
  })

  it('loads questions for the selected category', async () => {
    render(<QuestionManager categoryId={7} />)

    expect(await screen.findByText(question.text)).toBeInTheDocument()

    expect(api.get).toHaveBeenCalledWith('/questions', {
      params: {
        category_id: 7,
        page: 1,
        per_page: 10,
      },
    })
  })

  it('shows an error when questions cannot be loaded', async () => {
    api.get.mockRejectedValueOnce({
      response: { data: { error: 'Loading failed.' } },
    })

    render(<QuestionManager categoryId={7} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Loading failed.'
    )
  })

  it('opens and cancels the add question form', async () => {
    render(<QuestionManager categoryId={7} />)

    await screen.findByText(question.text)

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    expect(screen.getByText('Adding question')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel form' }))

    expect(screen.queryByText('Adding question')).not.toBeInTheDocument()
  })

  it('creates a question and reloads the list', async () => {
    render(<QuestionManager categoryId={7} />)

    await screen.findByText(question.text)

    api.post.mockResolvedValueOnce({ data: question })

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit question' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions', {
        text: 'What is 2 + 2?',
        question_type: 'multiple',
        difficulty: 'easy',
        correct_answer: '4',
        incorrect_answers: ['3', '5', '6'],
        category_id: 7,
      })
    })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2)
    })
  })

  it('edits an existing question', async () => {
    render(<QuestionManager categoryId={7} />)

    await screen.findByText(question.text)

    fireEvent.click(screen.getByRole('button', { name: 'Edit question' }))

    expect(screen.getByText('Editing question')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Submit question' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/questions/1',
        expect.objectContaining({ text: 'What is 2 + 2?' })
      )
    })
  })

  it('deletes a question after confirmation', async () => {
    render(<QuestionManager categoryId={7} />)

    await screen.findByText(question.text)

    fireEvent.click(screen.getByRole('button', { name: 'Delete question' }))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/questions/1')
    })

    expect(window.confirm).toHaveBeenCalled()
  })

  it('does not delete a question when confirmation is cancelled', async () => {
    window.confirm = vi.fn(() => false)

    render(<QuestionManager categoryId={7} />)

    await screen.findByText(question.text)

    fireEvent.click(screen.getByRole('button', { name: 'Delete question' }))

    expect(api.delete).not.toHaveBeenCalled()
  })
})