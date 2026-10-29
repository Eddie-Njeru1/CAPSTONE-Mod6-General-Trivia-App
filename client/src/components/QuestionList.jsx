// QuestionList: shows the questions in one category, one page at a time,
// with Edit and Delete buttons on each.
//
// It only displays data and reports clicks. The parent (QuestionManager)
// loads the questions from GET /api/questions?category_id=...&page=...
// and decides what Edit and Delete do.
//
// Props:
//   questions     questions for the current page (shape from the API)
//   loading       true while the page is loading
//   error         message to show if loading failed
//   page, pages   current page number and how many pages there are
//   onPageChange  called with the new page number
//   onEdit        called with the question to edit
//   onDelete      called with the question to delete
//
// Styles reuse the dashboard's resource-list classes, so it matches the
// category list next to it.

const TYPE_LABELS = { multiple: 'Multiple choice', boolean: 'True / False' }

function QuestionList({
  questions = [],
  loading = false,
  error = '',
  page = 1,
  pages = 1,
  onPageChange,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return <p role="status">Loading questions...</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (questions.length === 0) {
    return (
      <section className="resource-list question-list">
        <h2>Questions</h2>
        <p className="resource-list__empty-state">No questions in this category yet.</p>
        <p className="resource-list__empty-hint">Select Add Question to write the first one.</p>
      </section>
    )
  }

  return (
    <section className="resource-list question-list">
      <h2>Questions</h2>

      <ul className="resource-list__items question-list__items">
        {questions.map((question) => (
          <li key={question.id} className="resource-list__item question-list__item">
            <h3 className="question-list__text">{question.text}</h3>

            <p className="question-list__meta">
              <span className="question-list__type">
                {TYPE_LABELS[question.question_type] ?? question.question_type}
              </span>
              {' · '}
              <span className={`question-list__difficulty question-list__difficulty--${question.difficulty}`}>
                {question.difficulty}
              </span>
            </p>

            <p className="question-list__answer">
              Answer: <strong>{question.correct_answer}</strong>
            </p>

            <div className="resource-list__actions">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(question)}
                  aria-label={`Edit: ${question.text}`}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(question)}
                  aria-label={`Delete: ${question.text}`}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Paging controls, only when there is more than one page. */}
      {pages > 1 && (
        <nav className="resource-list__pagination" aria-label="Question pages">
          <button
            type="button"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>

          <span aria-live="polite">
            Page {page} of {pages}
          </span>

          <button
            type="button"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= pages}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  )
}

export default QuestionList
