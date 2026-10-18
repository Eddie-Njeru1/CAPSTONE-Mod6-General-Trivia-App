import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios and the token helper so no real network calls happen.
const { postMock, tokenMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  tokenMock: vi.fn(),
}))

vi.mock('axios', () => ({ default: { post: postMock } }))
vi.mock('../services/api', () => ({ getToken: tokenMock }))

import { saveQuizAttempt } from '../services/scoreApi'

const round = { score: 7, total: 10, points: 120, bestStreak: 4 }

describe('saveQuizAttempt', () => {
  beforeEach(() => {
    postMock.mockReset()
    tokenMock.mockReset()
  })

  it('does nothing for a guest (no token)', async () => {
    tokenMock.mockReturnValue(null)

    expect(await saveQuizAttempt(round)).toBe('guest')
    expect(postMock).not.toHaveBeenCalled()
  })

  it('posts the round in the shape the backend expects', async () => {
    tokenMock.mockReturnValue('abc123')
    postMock.mockResolvedValue({ status: 201 })

    expect(await saveQuizAttempt(round)).toBe('saved')
    expect(postMock).toHaveBeenCalledWith(
      '/api/quiz-attempts',
      { score: 7, total_questions: 10, points: 120, best_streak: 4 },
      { headers: { Authorization: 'Bearer abc123' } }
    )
  })

  it('reports a failure instead of throwing', async () => {
    tokenMock.mockReturnValue('expired')
    postMock.mockRejectedValue(new Error('401'))

    expect(await saveQuizAttempt(round)).toBe('failed')
  })
})
