// Tests for offline mode: the quiz and category hooks switch to the offline
// pack when there is no internet, and a round that can't be saved is queued.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'

// Fake the online APIs so each test decides what "the internet" does.
const { fetchQuestionsMock, fetchCategoriesMock, saveMock } = vi.hoisted(() => ({
  fetchQuestionsMock: vi.fn(),
  fetchCategoriesMock: vi.fn(),
  saveMock: vi.fn(),
}))
vi.mock('../api/triviaApi', () => ({
  fetchQuestions: fetchQuestionsMock,
  fetchCategories: fetchCategoriesMock,
}))
vi.mock('../services/scoreApi', () => ({ saveQuizAttempt: saveMock }))

import pack from '../data/offlineQuestions.json'
import { useQuestions } from '../hooks/useQuestions'
import { useCategories } from '../hooks/useCategories'
import { ScoreProvider } from '../context/ScoreContext'
import { useScore } from '../context/useScore'
import { getQueuedCount, getQueuedRounds } from '../services/syncQueue'

// What fetch() throws when there is no connection.
const noInternet = () => new TypeError('Failed to fetch')

function setOnline(value) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

beforeEach(() => {
  localStorage.clear()
  fetchQuestionsMock.mockReset()
  fetchCategoriesMock.mockReset()
  saveMock.mockReset()
  setOnline(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useQuestions offline', () => {
  it('uses the offline pack straight away when the browser is offline', async () => {
    setOnline(false)
    const { result } = renderHook(() => useQuestions(9, 10))

    await act(async () => {
      await result.current.refetch()
    })

    expect(fetchQuestionsMock).not.toHaveBeenCalled()
    expect(result.current.questions).toHaveLength(10)
    expect(result.current.isOffline).toBe(true)
    expect(result.current.error).toBe(null)
  })

  it('falls back to the offline pack if the internet drops during the request', async () => {
    fetchQuestionsMock.mockRejectedValue(noInternet())
    const { result } = renderHook(() => useQuestions(9, 10))

    await act(async () => {
      await result.current.refetch()
    })

    expect(fetchQuestionsMock).toHaveBeenCalledTimes(1)
    expect(result.current.questions).toHaveLength(10)
    expect(result.current.isOffline).toBe(true)
  })

  it('plays only that category when an offline category is chosen', async () => {
    const category = pack.categories[2]
    const { result } = renderHook(() => useQuestions(category.slug, 10))

    await act(async () => {
      await result.current.refetch()
    })

    expect(fetchQuestionsMock).not.toHaveBeenCalled() // slugs aren't Open Trivia DB categories
    expect(result.current.questions.every((q) => q.category === category.name)).toBe(true)
  })

  it('still shows API errors like the rate limit instead of switching to offline', async () => {
    fetchQuestionsMock.mockRejectedValue(new Error('Rate limit exceeded'))
    const { result } = renderHook(() => useQuestions(9, 10))

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.error).toBe('Rate limit exceeded')
    expect(result.current.isOffline).toBe(false)
  })

  it('goes back to online questions once the connection works again', async () => {
    fetchQuestionsMock.mockRejectedValueOnce(noInternet()).mockResolvedValueOnce([{ id: 'online-1' }])
    const { result } = renderHook(() => useQuestions(9, 10))

    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.isOffline).toBe(true)

    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.isOffline).toBe(false)
    expect(result.current.questions).toEqual([{ id: 'online-1' }])
  })
})

describe('useCategories offline', () => {
  it('shows the offline categories when the browser is offline', async () => {
    setOnline(false)
    const { result } = renderHook(() => useCategories())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchCategoriesMock).not.toHaveBeenCalled()
    expect(result.current.categories.map((c) => c.id)).toEqual(pack.categories.map((c) => c.slug))
    expect(result.current.isOffline).toBe(true)
  })

  it('falls back to the offline categories if the internet drops', async () => {
    fetchCategoriesMock.mockRejectedValue(noInternet())
    const { result } = renderHook(() => useCategories())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toHaveLength(pack.categories.length)
    expect(result.current.error).toBe(null)
  })
})

describe('ScoreProvider offline', () => {
  function Player() {
    const { saveStatus, startRound, recordAnswer, finishRound } = useScore()
    return (
      <div>
        <p>status:{saveStatus}</p>
        <button onClick={() => startRound(1)}>start</button>
        <button onClick={() => recordAnswer(true, 'easy')}>right</button>
        <button onClick={() => finishRound('Mixed')}>finish</button>
      </div>
    )
  }

  function playRound() {
    fireEvent.click(screen.getByText('start'))
    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('finish'))
  }

  it('queues a round that could not be saved', async () => {
    setOnline(false)
    saveMock.mockResolvedValue('failed')
    render(<ScoreProvider><Player /></ScoreProvider>)

    playRound()

    expect(await screen.findByText('status:queued')).toBeInTheDocument()
    expect(getQueuedRounds()[0].round).toMatchObject({ score: 1, total: 1 })
  })

  it('sends the queued round when the connection comes back', async () => {
    setOnline(false)
    saveMock.mockResolvedValueOnce('failed')
    render(<ScoreProvider><Player /></ScoreProvider>)
    playRound()
    await screen.findByText('status:queued')

    saveMock.mockResolvedValue('saved')
    setOnline(true)
    window.dispatchEvent(new Event('online'))

    await waitFor(() => expect(getQueuedCount()).toBe(0))
    expect(saveMock).toHaveBeenCalledTimes(2) // once offline, once after reconnecting
  })

  it('does not queue a round that was saved', async () => {
    saveMock.mockResolvedValue('saved')
    render(<ScoreProvider><Player /></ScoreProvider>)

    playRound()

    expect(await screen.findByText('status:saved')).toBeInTheDocument()
    expect(getQueuedCount()).toBe(0)
  })
})
