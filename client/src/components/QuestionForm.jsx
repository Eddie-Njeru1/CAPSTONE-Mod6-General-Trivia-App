// QuestionForm: add a new question to a category, or edit an existing one.
//
// Before sending, it checks the same rules as the backend's Question model
// (see utils/questionRules.js), so the user gets a clear message straight
// away instead of a server error. For true/false questions the wrong answer
// is always the opposite, so the form fills it in by itself.
//
// It does not call the API. The parent (QuestionManager) sends the data and
// passes back `submitting` and any `serverError`.
//
// Props:
//   categoryId       the category the question belongs to
//   initialQuestion  null to add, or a question (API shape) to edit
//   onSubmit         called with data ready for POST/PATCH /api/questions
//   onCancel         called when the user cancels
//   submitting       true while saving (disables the form)
//   serverError      message from the API, if saving failed

import { useState } from 'react'
import {
  ANSWER_MAX_LENGTH,
  DIFFICULTIES,
  TEXT_MAX_LENGTH,
  buildQuestionData,
  validateQuestion,
} from '../utils/questionRules'

// The starting values: empty for a new question, or the question being edited.
function startingFields(question) {
  if (!question) {
    return {
      text: '',
      questionType: 'multiple',
      difficulty: 'easy',
      correctAnswer: '',
      wrongAnswers: ['', '', ''],
      booleanAnswer: 'True',
    }
  }

  const isBoolean = question.question_type === 'boolean'
  const wrong = isBoolean ? [] : [...(question.incorrect_answers ?? [])]
  while (wrong.length < 3) wrong.push('')

  return {
    text: question.text ?? '',
    questionType: question.question_type ?? 'multiple',
    difficulty: question.difficulty ?? 'easy',
    correctAnswer: isBoolean ? '' : question.correct_answer ?? '',
    wrongAnswers: wrong.slice(0, 3),
    booleanAnswer: isBoolean ? question.correct_answer : 'True',
  }
}

function QuestionForm(props) {
  // A new key resets the form whenever a different question is being edited.
  const key = props.initialQuestion ? `edit-${props.initialQuestion.id}` : 'new'
  return <QuestionFormFields key={key} {...props} />
}

function QuestionFormFields({
  categoryId,
  initialQuestion = null,
  onSubmit,
  onCancel,
  submitting = false,
  serverError = '',
}) {
  const [fields, setFields] = useState(() => startingFields(initialQuestion))
  const [errors, setErrors] = useState([])

  const isEditing = Boolean(initialQuestion)
  const isBoolean = fields.questionType === 'boolean'

  function update(name, value) {
    setFields((previous) => ({ ...previous, [name]: value }))
  }

  function updateWrongAnswer(index, value) {
    setFields((previous) => {
      const wrongAnswers = [...previous.wrongAnswers]
      wrongAnswers[index] = value
      return { ...previous, wrongAnswers }
    })
  }

  function handleSubmit(event) {
    event.preventDefault() // stay on the page
    const data = buildQuestionData(fields, categoryId)
    const problems = validateQuestion(data)
    setErrors(problems)
    if (problems.length === 0) onSubmit?.(data)
  }

  return (
    <form className="resource-form question-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditing ? 'Edit Question' : 'Add Question'}</h2>

      {/* Problems found by the form itself, then any message from the server. */}
      {errors.length > 0 && (
        <ul className="question-form__errors" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {serverError && (
        <p className="question-form__errors" role="alert">
          {serverError}
        </p>
      )}

      <fieldset disabled={submitting} className="question-form__fieldset">
        <div className="resource-form__field">
          <label htmlFor="question-text">Question</label>
          <textarea
            id="question-text"
            value={fields.text}
            onChange={(event) => update('text', event.target.value)}
            maxLength={TEXT_MAX_LENGTH}
            rows="3"
            placeholder="e.g. What is the capital city of Kenya?"
          />
        </div>

        <div className="resource-form__field">
          <label htmlFor="question-type">Type</label>
          <select
            id="question-type"
            value={fields.questionType}
            onChange={(event) => update('questionType', event.target.value)}
          >
            <option value="multiple">Multiple choice</option>
            <option value="boolean">True / False</option>
          </select>
        </div>

        <div className="resource-form__field">
          <label htmlFor="question-difficulty">Difficulty</label>
          <select
            id="question-difficulty"
            value={fields.difficulty}
            onChange={(event) => update('difficulty', event.target.value)}
          >
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {level[0].toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {isBoolean ? (
          <fieldset className="resource-form__field question-form__boolean">
            <legend>The answer is</legend>
            {['True', 'False'].map((value) => (
              <label key={value} className="question-form__radio">
                <input
                  type="radio"
                  name="boolean-answer"
                  value={value}
                  checked={fields.booleanAnswer === value}
                  onChange={() => update('booleanAnswer', value)}
                />
                {value}
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <div className="resource-form__field">
              <label htmlFor="question-correct">Correct answer</label>
              <input
                id="question-correct"
                type="text"
                value={fields.correctAnswer}
                onChange={(event) => update('correctAnswer', event.target.value)}
                maxLength={ANSWER_MAX_LENGTH}
              />
            </div>

            {fields.wrongAnswers.map((answer, index) => (
              <div className="resource-form__field" key={index}>
                <label htmlFor={`question-wrong-${index}`}>Wrong answer {index + 1}</label>
                <input
                  id={`question-wrong-${index}`}
                  type="text"
                  value={answer}
                  onChange={(event) => updateWrongAnswer(index, event.target.value)}
                  maxLength={ANSWER_MAX_LENGTH}
                />
              </div>
            ))}
          </>
        )}

        <div className="resource-form__actions">
          <button type="submit">
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Question'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </fieldset>
    </form>
  )
}

export default QuestionForm
