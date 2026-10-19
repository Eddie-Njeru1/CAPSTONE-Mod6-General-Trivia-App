// Saves finished quiz rounds to the backend (POST /api/quiz-attempts).
//
// This uses plain axios on purpose, not the shared `api` client from
// services/api.js: that client sends the user to /login on any 401.
// A round should never interrupt the results screen, so if the token
// has expired we just skip saving and keep the round in the browser.

import axios from 'axios'
import { getToken } from './api'

// Returns "guest" when nobody is logged in, "saved" on success,
// or "failed" if the request did not work. It never throws.
export async function saveQuizAttempt({ score, total, points, bestStreak }) {
  const token = getToken()
  if (!token) return 'guest'

  try {
    await axios.post(
      '/api/quiz-attempts',
      {
        score,
        total_questions: total,
        points,
        best_streak: bestStreak,
        // No category_id: quiz questions come from Open Trivia DB, whose
        // categories are not rows in our database, so the round is "Mixed".
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    return 'saved'
  } catch {
    return 'failed'
  }
}
