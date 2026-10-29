// Tests for QuestionList, QuestionForm and the question rules they share.

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import QuestionList from '../components/QuestionList'
import QuestionForm from '../components/QuestionForm'
import { buildQuestionData, validateQuestion } from '../utils/questionRules'

const multiple = {
  id: 1,
  text: 'What is the capital city of Kenya?',
  question_type: 'multiple',
  difficulty: 'easy',
  correct_answer: 'Nairobi',
  incorrect_answers: ['Mombasa', 'Kisumu', 'Nakuru'],
  category_id: 7,
}

const boolean = {
  id: 2,
  text: 'Mount Kilimanjaro is located in Kenya.',
  question_type: 'boolean',
  difficulty: 'medium',
  correct_answer: 'False',
  incorrect_answers: ['True'],
  category_id: 7,
}

// ---------- QuestionList ----------

describe('QuestionList', () => {
  it('shows each question with its type, difficulty and answer', () => {
    render(<QuestionList questions={[multiple, boolean]} />)

    expect(screen.getByText(multiple.text)).toBeInTheDocument()
    expect(screen.getByText(boolean.text)).toBeInTheDocument()
    expect(screen.getByText('Multiple choice')).toBeInTheDocument()
    expect(screen.getByText('True / False')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('Nairobi')).toBeInTheDocument()
  })

  it('shows a loading message', () => {
    render(<QuestionList loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading questions')
  })

  it('shows an error message', () => {
    render(<QuestionList error="Could not load the questions." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the questions.')
  })

  it('shows a helpful message when the category has no questions', () => {
    render(<QuestionList questions={[]} />)
    expect(screen.getByText('No questions in this category yet.')).toBeInTheDocument()
  })

  it('reports which question to edit or delete', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<QuestionList questions={[multiple, boolean]} onEdit={onEdit} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: `Edit: ${boolean.text}` }))
    fireEvent.click(screen.getByRole('button', { name: `Delete: ${multiple.text}` }))

    expect(onEdit).toHaveBeenCalledWith(boolean)
    expect(onDelete).toHaveBeenCalledWith(multiple)
  })

  it('hides the buttons when no handler is given', () => {
    render(<QuestionList questions={[multiple]} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('pages through the results', () => {
    const onPageChange = vi.fn()
    render(<QuestionList questions={[multiple]} page={2} pages={3} onPageChange={onPageChange} />)

    const paging = screen.getByRole('navigation', { name: 'Question pages' })
    expect(within(paging).getByText('Page 2 of 3')).toBeInTheDocument()

    fireEvent.click(within(paging).getByRole('button', { name: 'Next' }))
    fireEvent.click(within(paging).getByRole('button', { name: 'Previous' }))
    expect(onPageChange.mock.calls).toEqual([[3], [1]])
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(<QuestionList questions={[multiple]} page={1} pages={2} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    rerender(<QuestionList questions={[multiple]} page={2} pages={2} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('shows no paging when everything fits on one page', () => {
    render(<QuestionList questions={[multiple]} page={1} pages={1} />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})

// ---------- the rules (questionRules.js) ----------

describe('validateQuestion', () => {
  const valid = {
    text: 'Q?',
    question_type: 'multiple',
    difficulty: 'easy',
    correct_answer: 'A',
    incorrect_answers: ['B', 'C', 'D'],
    category_id: 1,
  }

  it('accepts a valid multiple-choice question', () => {
    expect(validateQuestion(valid)).toEqual([])
  })

  it('accepts a valid true/false question', () => {
    expect(
      validateQuestion({ ...valid, question_type: 'boolean', correct_answer: 'True', incorrect_answers: ['False'] })
    ).toEqual([])
  })

  it.each([
    [{ text: '' }, 'Question text is required.'],
    [{ text: 'x'.repeat(501) }, 'Question text must be 500 characters or fewer.'],
    [{ difficulty: 'expert' }, 'Choose a difficulty: easy, medium or hard.'],
    [{ correct_answer: '' }, 'The correct answer is required.'],
    [{ incorrect_answers: ['B', '', 'D'] }, 'Fill in all 3 wrong answers.'],
    [{ incorrect_answers: ['B', 'C'] }, 'Fill in all 3 wrong answers.'],
    [{ incorrect_answers: ['B', 'B', 'D'] }, 'The wrong answers must all be different.'],
    [{ incorrect_answers: ['A', 'C', 'D'] }, "The correct answer can't also be a wrong answer."],
    [{ correct_answer: 'x'.repeat(256) }, 'The correct answer must be 255 characters or fewer.'],
  ])('rejects %o', (change, message) => {
    expect(validateQuestion({ ...valid, ...change })).toContain(message)
  })

  it('rejects a true/false answer that is not True or False', () => {
    expect(validateQuestion({ ...valid, question_type: 'boolean', correct_answer: 'Yes' })).toContain(
      'Choose whether the answer is True or False.'
    )
  })
})

describe('buildQuestionData', () => {
  it('trims the text and answers', () => {
    const data = buildQuestionData(
      {
        text: '  Q?  ',
        questionType: 'multiple',
        difficulty: 'hard',
        correctAnswer: ' A ',
        wrongAnswers: [' B', 'C ', ' D '],
        booleanAnswer: 'True',
      },
      5
    )
    expect(data).toEqual({
      text: 'Q?',
      question_type: 'multiple',
      difficulty: 'hard',
      correct_answer: 'A',
      incorrect_answers: ['B', 'C', 'D'],
      category_id: 5,
    })
  })

  it('fills in the opposite as the wrong answer for true/false', () => {
    const data = buildQuestionData(
      { text: 'Q?', questionType: 'boolean', difficulty: 'easy', correctAnswer: '', wrongAnswers: ['', '', ''], booleanAnswer: 'False' },
      5
    )
    expect(data.correct_answer).toBe('False')
    expect(data.incorrect_answers).toEqual(['True'])
  })
})

// ---------- QuestionForm ----------

function fillMultipleChoice() {
  fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'What is 2 + 2?' } })
  fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'medium' } })
  fireEvent.change(screen.getByLabelText('Correct answer'), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText('Wrong answer 1'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Wrong answer 2'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('Wrong answer 3'), { target: { value: '22' } })
}

describe('QuestionForm', () => {
  it('sends a new multiple-choice question in the API shape', () => {
    const onSubmit = vi.fn()
    render(<QuestionForm categoryId={7} onSubmit={onSubmit} />)

    expect(screen.getByRole('heading', { name: 'Add Question' })).toBeInTheDocument()
    fillMultipleChoice()
    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    expect(onSubmit).toHaveBeenCalledWith({
      text: 'What is 2 + 2?',
      question_type: 'multiple',
      difficulty: 'medium',
      correct_answer: '4',
      incorrect_answers: ['3', '5', '22'],
      category_id: 7,
    })
  })

  it('shows what is wrong and does not send an invalid question', () => {
    const onSubmit = vi.fn()
    render(<QuestionForm categoryId={7} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Question text is required.')
    expect(alert).toHaveTextContent('Fill in all 3 wrong answers.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('switches to True/False and fills in the wrong answer by itself', () => {
    const onSubmit = vi.fn()
    render(<QuestionForm categoryId={7} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'boolean' } })
    expect(screen.queryByLabelText('Wrong answer 1')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'The Sun is a star.' } })
    fireEvent.click(screen.getByLabelText('True'))
    fireEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ question_type: 'boolean', correct_answer: 'True', incorrect_answers: ['False'] })
    )
  })

  it('opens with the question filled in when editing', () => {
    const onSubmit = vi.fn()
    render(<QuestionForm categoryId={7} initialQuestion={multiple} onSubmit={onSubmit} />)

    expect(screen.getByRole('heading', { name: 'Edit Question' })).toBeInTheDocument()
    expect(screen.getByLabelText('Question')).toHaveValue(multiple.text)
    expect(screen.getByLabelText('Correct answer')).toHaveValue('Nairobi')
    expect(screen.getByLabelText('Wrong answer 3')).toHaveValue('Nakuru')

    fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'hard' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ difficulty: 'hard', correct_answer: 'Nairobi' }))
  })

  it('opens a true/false question with its answer selected', () => {
    render(<QuestionForm categoryId={7} initialQuestion={boolean} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Type')).toHaveValue('boolean')
    expect(screen.getByLabelText('False')).toBeChecked()
  })

  it('resets when a different question is opened', () => {
    const { rerender } = render(<QuestionForm categoryId={7} initialQuestion={multiple} onSubmit={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'half-typed' } })

    rerender(<QuestionForm categoryId={7} initialQuestion={boolean} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Question')).toHaveValue(boolean.text)
  })

  it('shows the error from the server', () => {
    render(<QuestionForm categoryId={7} onSubmit={vi.fn()} serverError="Validation failed." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Validation failed.')
  })

  it('locks the form while saving', () => {
    render(<QuestionForm categoryId={7} onSubmit={vi.fn()} submitting />)

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    expect(screen.getByLabelText('Question')).toBeDisabled()
  })

  it('calls onCancel', () => {
    const onCancel = vi.fn()
    render(<QuestionForm categoryId={7} onSubmit={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
