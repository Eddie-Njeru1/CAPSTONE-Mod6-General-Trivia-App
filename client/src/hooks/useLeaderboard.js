
import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

// Loads the public leaderboard from GET /api/leaderboard.
export default function useLeaderboard(limit = 10) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Make the request and return the leaderboard data.
  // State updates are handled by the effect or refresh function.
  const requestLeaderboard = useCallback(async () => {
    const response = await api.get('/leaderboard', {
      params: { limit },
    })

    // The backend returns an array of ranked players directly.
    return Array.isArray(response.data) ? response.data : []
  }, [limit])

  // Fetch data when the hook mounts or the limit changes.
  useEffect(() => {
    let cancelled = false

    requestLeaderboard()
      .then((data) => {
        if (!cancelled) {
          setPlayers(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              'Unable to load the leaderboard. Please try again.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    // Ignore results if the component unmounts or the request changes.
    return () => {
      cancelled = true
    }
  }, [requestLeaderboard])

  // Allow the UI to request a fresh leaderboard, such as after a quiz.
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await requestLeaderboard()
      setPlayers(data)
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to load the leaderboard. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [requestLeaderboard])

  return { players, loading, error, refresh }
}
