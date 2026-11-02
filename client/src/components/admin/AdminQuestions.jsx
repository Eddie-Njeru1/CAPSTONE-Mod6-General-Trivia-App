// AdminQuestions.jsx
// The Questions tab: a filterable, paginated table of every question from every user,
// so an admin can moderate content. Admins can delete a question; editing is not
// offered here (owners edit their own questions from the Dashboard).
//
// Filters (category, difficulty, type) are sent when the form is submitted, because
// every load in useAdminData refreshes all four lists.
//
// Used by: AdminPage.jsx.
// Props: questions, categories, pagination, loading, onLoad(params), onChanged().

import { useState } from 'react' // form fields, applied filters, row being deleted
import { deleteAdminQuestion } from '../../services/adminApi' // DELETE /api/admin/questions/<id>

const PER_PAGE = 10

const TYPE_LABELS = { multiple: 'Multiple choice', boolean: 'True / False' }

// Builds the query values, leaving out empty filters.
function buildParams({ categoryId, difficulty, questionType, page }) {
  const params = { page, per_page: PER_PAGE }
  if (categoryId) params.category_id = categoryId
  if (difficulty) params.difficulty = difficulty
  if (questionType) params.question_type = questionType
  return params
}

// Turns a failed request into a message. The backend sends { "error": "..." }.
function getMessage(err) {
  return err.response?.data?.error || err.message || 'Something went wrong.'
}

function AdminQuestions({ questions, categories = [], pagination, loading, onLoad, onChanged }) {
  const emptyFilters = { categoryId: '', difficulty: '', questionType: '' }
  const [form, setForm] = useState(emptyFilters) // what the admin is choosing
  const [applied, setApplied] = useState(emptyFilters) // what was last sent to the server
  const [busyId, setBusyId] = useState(null) // id of the question being deleted
  const [actionError, setActionError] = useState('')

  // The questions list only has category_id, so find the name in the categories list.
  function categoryName(id) {
    const match = categories.find((category) => category.id === id)
    return match ? match.name : `Category #${id}`
  }

  function handleSubmit(event) {
    event.preventDefault()
    setApplied(form)
    onLoad(buildParams({ ...form, page: 1 }))
  }

  function handleReset() {
    setForm(emptyFilters)
    setApplied(emptyFilters)
    onLoad(buildParams({ ...emptyFilters, page: 1 }))
  }

  function goToPage(page) {
    onLoad(buildParams({ ...applied, page }))
  }

  async function removeQuestion(question) {
    const ok = window.confirm('Delete this question? This cannot be undone.')
    if (!ok) return

    setBusyId(question.id)
    setActionError('')
    try {
      await deleteAdminQuestion(question.id)
      await onChanged() // reload the lists (filters are kept by the hook)
    } catch (err) {
      setActionError(getMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-questions">
      <form className="admin-filters" onSubmit={handleSubmit}>
        <label htmlFor="admin-q-category" className="admin-filters__label">
          Category
        </label>
        <select
          id="admin-q-category"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="admin-q-difficulty" className="admin-filters__label">
          Difficulty
        </label>
        <select
          id="admin-q-difficulty"
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="">All</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <label htmlFor="admin-q-type" className="admin-filters__label">
          Type
        </label>
        <select
          id="admin-q-type"
          value={form.questionType}
          onChange={(e) => setForm({ ...form, questionType: e.target.value })}
        >
          <option value="">All</option>
          <option value="multiple">Multiple choice</option>
          <option value="boolean">True / False</option>
        </select>

        <button type="submit">Apply</button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </form>

      {actionError && (
        <p className="admin-page__error" role="alert">
          {actionError}
        </p>
      )}

      {loading && <p className="admin-status">Loading questions...</p>}

      {!loading && questions.length === 0 ? (
        <p className="admin-status">No questions match these filters.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Category</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Correct answer</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="admin-table__text">{question.text}</td>
                  <td>{categoryName(question.category_id)}</td>
                  <td>{TYPE_LABELS[question.question_type] || question.question_type}</td>
                  <td>{question.difficulty}</td>
                  <td className="admin-table__text">{question.correct_answer}</td>
                  <td>
                    {question.created_at ? new Date(question.created_at).toLocaleDateString() : ''}
                  </td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="admin-table__danger"
                      disabled={busyId === question.id}
                      onClick={() => removeQuestion(question)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination: the numbers come from the server's pagination object */}
      {pagination && pagination.pages > 1 && (
        <div className="admin-pagination">
          <button type="button" disabled={!pagination.has_prev} onClick={() => goToPage(pagination.page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} questions)
          </span>
          <button type="button" disabled={!pagination.has_next} onClick={() => goToPage(pagination.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminQuestions