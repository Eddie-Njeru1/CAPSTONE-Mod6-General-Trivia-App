
/* Loads admin statistics, users, categories, and questions.
 *
 * Uses adminApi.js for authenticated requests and exposes loading,
 * error, pagination, and refresh state for the admin interface.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  getAdminStats,
  getAdminUsers,
  getAdminCategories,
  getAdminQuestions,
} from '../services/adminApi'

// Extract the server's paginated list regardless of its resource key.
function extractList(response, resourceKey) {
  if (Array.isArray(response?.[resourceKey])) {
    return response[resourceKey]
  }

  if (Array.isArray(response?.items)) {
    return response.items
  }

  return []
}

// Convert Axios errors into a message suitable for displaying in the UI.
function getErrorMessage(error) {
  return (
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message ||
    'Something went wrong while loading admin data.'
  )
}

export default function useAdminData() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [questions, setQuestions] = useState([])

  // Keep pagination metadata separately for each resource.
  const [pagination, setPagination] = useState({
    users: null,
    categories: null,
    questions: null,
  })

  const [loading, setLoading] = useState({
    stats: false,
    users: false,
    categories: false,
    questions: false,
  })

  const [error, setError] = useState(null)

  // Store the latest filters so refresh() can reload the same lists.
  const [params, setParams] = useState({
    users: {},
    categories: {},
    questions: {},
  })

  // Shared request handler keeps loading and error behavior consistent.
  const loadResource = useCallback(async (key, request, requestParams = {}) => {
    setLoading((current) => ({ ...current, [key]: true }))

    try {
      const response = await request(requestParams)

      if (key === 'stats') {
        setStats(response)
      } else {
        const list = extractList(response, key)

        if (key === 'users') setUsers(list)
        if (key === 'categories') setCategories(list)
        if (key === 'questions') setQuestions(list)

        setPagination((current) => ({
          ...current,
          [key]: response?.pagination ?? null,
        }))
      }

      return response
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      throw requestError
    } finally {
      setLoading((current) => ({ ...current, [key]: false }))
    }
  }, [])

  const loadStats = useCallback(
    () => loadResource('stats', getAdminStats),
    [loadResource],
  )

  const loadUsers = useCallback(
    (nextParams = params.users) => {
      setParams((current) => ({ ...current, users: nextParams }))
      return loadResource('users', getAdminUsers, nextParams)
    },
    [loadResource, params.users],
  )

  const loadCategories = useCallback(
    (nextParams = params.categories) => {
      setParams((current) => ({ ...current, categories: nextParams }))
      return loadResource('categories', getAdminCategories, nextParams)
    },
    [loadResource, params.categories],
  )

  const loadQuestions = useCallback(
    (nextParams = params.questions) => {
      setParams((current) => ({ ...current, questions: nextParams }))
      return loadResource('questions', getAdminQuestions, nextParams)
    },
    [loadResource, params.questions],
  )

  // Reload all admin data while retaining each list's current filters.
  const refresh = useCallback(async () => {
    // Clear the previous error once, before starting parallel requests.
    setError(null)

    const results = await Promise.allSettled([
      loadStats(),
      loadUsers(),
      loadCategories(),
      loadQuestions(),
    ])

    // Let callers know if one or more requests failed.
    const failedRequest = results.find(
      (result) => result.status === 'rejected',
    )

    if (failedRequest) {
      throw failedRequest.reason
    }
  }, [loadStats, loadUsers, loadCategories, loadQuestions])


  // Load dashboard data after the current effect has completed.
  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      // Skip the request if the effect was cleaned up first.
      if (cancelled) return

      refresh().catch(() => {
        // Errors are already saved in state for the UI to display.
      })
    })

    return () => {
      cancelled = true
    }
  }, [refresh])


  return {
    stats,
    users,
    categories,
    questions,
    pagination,
    loading,
    error,
    loadStats,
    loadUsers,
    loadCategories,
    loadQuestions,
    refresh,
  }
}
