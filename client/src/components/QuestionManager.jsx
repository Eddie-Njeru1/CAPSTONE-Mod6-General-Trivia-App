// Import React hooks for managing state and API loading
import { useCallback, useEffect, useState } from 'react'

// Import the API client for communicating with Flask
import api from '../services/api'

// Import the component that displays questions
import QuestionList from './QuestionList'

// Import the form used to add and edit questions
import QuestionForm from './QuestionForm'

function QuestionManager({ categoryId }) {
  const [questions, setQuestions] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const loadQuestions = useCallback(async () => {
    if (!categoryId) return

    setLoading(true)
    setError('')

    try {
      const response = await api.get('/questions', {
        params: {
          category_id: categoryId,
          page,
          per_page: 10,
        },
      })

      setQuestions(response.data.items)
      setPages(response.data.pagination.pages || 1)
    } catch (err) {
      setError(
        err.response?.data?.error || 'Unable to load questions. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [categoryId, page])

  useEffect(() => {
  const timer = setTimeout(() => {
    loadQuestions()
  }, 0)

  return () => clearTimeout(timer)
}, [loadQuestions])

  function startAdding() {
    setEditingQuestion(null)
    setServerError('')
    setShowForm(true)
  }

  function startEditing(question) {
    setEditingQuestion(question)
    setServerError('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingQuestion(null)
    setServerError('')
  }

  async function handleSubmit(data) {
    setSubmitting(true)
    setServerError('')

    try {
      if (editingQuestion) {
        await api.patch(`/questions/${editingQuestion.id}`, data)
      } else {
        await api.post('/questions', data)
        setPage(1)
      }

      cancelForm()
      await loadQuestions()
    } catch (err) {
      setServerError(
        err.response?.data?.error || 'Unable to save the question. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(question) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this question?'
    )

    if (!confirmed) return

    setError('')

    try {
      await api.delete(`/questions/${question.id}`)
      await loadQuestions()
    } catch (err) {
      setError(
        err.response?.data?.error || 'Unable to delete the question. Please try again.'
      )
    }
  }

  function handlePageChange(nextPage) {
    setPage(nextPage)
  }

  if (!categoryId) {
    return <p>Select a category to manage its questions.</p>
  }

  return (
    <section className="question-manager">
      <div className="question-manager__header">
        <h2>Manage Questions</h2>
        {!showForm && (
          <button type="button" onClick={startAdding}>
            Add Question
          </button>
        )}
      </div>

      {showForm && (
        <QuestionForm
          categoryId={categoryId}
          initialQuestion={editingQuestion}
          onSubmit={handleSubmit}
          onCancel={cancelForm}
          submitting={submitting}
          serverError={serverError}
        />
      )}

      <QuestionList
        questions={questions}
        loading={loading}
        error={error}
        page={page}
        pages={pages}
        onPageChange={handlePageChange}
        onEdit={startEditing}
        onDelete={handleDelete}
      />
    </section>
  )
}

export default QuestionManager