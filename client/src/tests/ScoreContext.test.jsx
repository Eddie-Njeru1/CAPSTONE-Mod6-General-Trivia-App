import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Replace the backend call so the test controls what "saving" returns.
const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }))
vi.mock('../services/scoreApi', () => ({ saveQuizAttempt: saveMock }))

import { ScoreProvider } from '../context/ScoreContext'
import { useScore } from '../context/useScore'

// A tiny component that plays a 2-question round through the context.
function Player() {
  const { history, saveStatus, startRound, recordAnswer, finishRound } = useScore()
  return (
    <div>
      <p>status:{saveStatus}</p>
      <p>rounds:{history.length}</p>
      <button onClick={() => startRound(2)}>start</button>
      <button onClick={() => recordAnswer(true, 'easy')}>right</button>
      <button onClick={() => recordAnswer(false, 'easy')}>wrong</button>
      <button onClick={() => finishRound('Mixed')}>finish</button>
    </div>
  )
}

function playRound() {
  render(
    <ScoreProvider>
      <Player />
    </ScoreProvider>
  )
  fireEvent.click(screen.getByText('start'))
  fireEvent.click(screen.getByText('right'))
  fireEvent.click(screen.getByText('wrong'))
  fireEvent.click(screen.getByText('finish'))
}

describe('ScoreProvider saving rounds', () => {
  beforeEach(() => {
    localStorage.clear()
    saveMock.mockReset()
  })

  it('sends the finished round to the backend', async () => {
    saveMock.mockResolvedValue('saved')

    playRound()

    expect(saveMock).toHaveBeenCalledTimes(1)
    const sent = saveMock.mock.calls[0][0]
    expect(sent).toMatchObject({ score: 1, total: 2, bestStreak: 1 })
    expect(sent.points).toBeGreaterThan(0)
    expect(await screen.findByText('status:saved')).toBeInTheDocument()
  })

  it('still keeps the round in the browser when saving fails', async () => {
    saveMock.mockResolvedValue('failed')

    playRound()

    expect(await screen.findByText('status:queued')).toBeInTheDocument() // Phase 3: kept in the sync queue
    expect(screen.getByText('rounds:1')).toBeInTheDocument()
  })

  it('reports guest when nobody is logged in', async () => {
    saveMock.mockResolvedValue('guest')

    playRound()

    await waitFor(() => expect(screen.getByText('status:guest')).toBeInTheDocument())
  })
})
