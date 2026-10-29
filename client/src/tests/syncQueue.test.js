// Tests for services/syncQueue.js: the outbox for rounds played offline.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_ATTEMPTS,
  MAX_QUEUED,
  STORAGE_KEY,
  clearQueue,
  flushQueue,
  getQueuedCount,
  getQueuedRounds,
  queueRound,
  startAutoSync,
} from '../services/syncQueue'

const round = (points) => ({ score: 7, total: 10, points, bestStreak: 3, category: 'Mixed' })

// Pretend the browser is online or offline.
function setOnline(value) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
}

beforeEach(() => {
  localStorage.clear()
  setOnline(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('queueRound', () => {
  it('saves the round in localStorage so it survives a refresh', () => {
    queueRound(round(120))

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved).toHaveLength(1)
    expect(saved[0].round).toMatchObject({ score: 7, total: 10, points: 120, bestStreak: 3 })
    expect(saved[0].attempts).toBe(0)
  })

  it('keeps rounds in the order they were played', () => {
    queueRound(round(1))
    queueRound(round(2))

    expect(getQueuedRounds().map((e) => e.round.points)).toEqual([1, 2])
    expect(getQueuedCount()).toBe(2)
  })

  it(`keeps only the newest ${MAX_QUEUED} rounds`, () => {
    for (let i = 1; i <= MAX_QUEUED + 5; i++) queueRound(round(i))

    const points = getQueuedRounds().map((e) => e.round.points)
    expect(points).toHaveLength(MAX_QUEUED)
    expect(points[0]).toBe(6) // the 5 oldest were dropped
  })

  it('treats damaged storage as an empty queue instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, 'not json{')

    expect(getQueuedCount()).toBe(0)
    queueRound(round(5))
    expect(getQueuedCount()).toBe(1)
  })

  it('clearQueue empties it', () => {
    queueRound(round(1))
    clearQueue()
    expect(getQueuedCount()).toBe(0)
  })
})

describe('flushQueue', () => {
  it('sends every round oldest first and empties the queue', async () => {
    queueRound(round(1))
    queueRound(round(2))
    const send = vi.fn().mockResolvedValue('saved')

    const result = await flushQueue({ send })

    expect(send.mock.calls.map(([r]) => r.points)).toEqual([1, 2])
    expect(result).toEqual({ sent: 2, remaining: 0, dropped: 0 })
    expect(getQueuedCount()).toBe(0)
  })

  it('stops at the first failure and keeps that round and the rest', async () => {
    queueRound(round(1))
    queueRound(round(2))
    queueRound(round(3))
    const send = vi.fn()
      .mockResolvedValueOnce('saved')
      .mockResolvedValueOnce('failed')

    const result = await flushQueue({ send })

    expect(send).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ sent: 1, remaining: 2, dropped: 0 })
    expect(getQueuedRounds().map((e) => e.round.points)).toEqual([2, 3])
    expect(getQueuedRounds()[0].attempts).toBe(1)
  })

  it('keeps everything when nobody is logged in', async () => {
    queueRound(round(1))
    const send = vi.fn().mockResolvedValue('guest')

    const result = await flushQueue({ send })

    expect(result).toEqual({ sent: 0, remaining: 1, dropped: 0 })
    expect(getQueuedRounds()[0].attempts).toBe(0) // not counted as a failure
  })

  it('does not count failures while offline', async () => {
    setOnline(false)
    queueRound(round(1))

    await flushQueue({ send: vi.fn().mockResolvedValue('failed') })

    expect(getQueuedRounds()[0].attempts).toBe(0)
  })

  it(`drops a round after ${MAX_ATTEMPTS} failures so it cannot block the others`, async () => {
    queueRound(round(1))
    queueRound(round(2))
    const send = vi.fn(async (r) => (r.points === 1 ? 'failed' : 'saved'))

    for (let i = 1; i < MAX_ATTEMPTS; i++) await flushQueue({ send })
    expect(getQueuedRounds().map((e) => e.round.points)).toEqual([1, 2])

    const result = await flushQueue({ send }) // the last allowed attempt

    expect(result).toEqual({ sent: 1, remaining: 0, dropped: 1 })
  })

  it('never sends the same round twice when two flushes start together', async () => {
    queueRound(round(1))
    const send = vi.fn().mockResolvedValue('saved')

    const [a, b] = await Promise.all([flushQueue({ send }), flushQueue({ send })])

    expect(send).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('does nothing when the queue is empty', async () => {
    const send = vi.fn()

    expect(await flushQueue({ send })).toEqual({ sent: 0, remaining: 0, dropped: 0 })
    expect(send).not.toHaveBeenCalled()
  })
})

describe('startAutoSync', () => {
  it('sends queued rounds straight away when online', async () => {
    queueRound(round(1))
    const send = vi.fn().mockResolvedValue('saved')

    const stop = startAutoSync({ send })
    await vi.waitFor(() => expect(getQueuedCount()).toBe(0))
    stop()
  })

  it('waits while offline, then sends when the connection comes back', async () => {
    setOnline(false)
    queueRound(round(1))
    const send = vi.fn().mockResolvedValue('saved')

    const stop = startAutoSync({ send })
    expect(send).not.toHaveBeenCalled()

    setOnline(true)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(getQueuedCount()).toBe(0))
    stop()
  })

  it('stops listening after stop() is called', () => {
    setOnline(false)
    const send = vi.fn().mockResolvedValue('saved')
    queueRound(round(1))

    const stop = startAutoSync({ send })
    stop()
    window.dispatchEvent(new Event('online'))

    expect(send).not.toHaveBeenCalled()
  })
})
