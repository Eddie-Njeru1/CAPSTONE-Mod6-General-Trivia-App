// Sync queue (an "outbox") for quiz rounds finished while offline.
//
// A round that could not be saved is kept in localStorage. When the
// connection comes back, flushQueue() sends the rounds to the server in the
// order they were played and removes each one once it is saved.
//
// Rounds use the same shape as ScoreContext's finishRound():
//   { score, total, points, bestStreak, category, date }

import { saveQuizAttempt } from './scoreApi'

export const STORAGE_KEY = 'trivia.syncQueue.v1'
export const MAX_QUEUED = 50 // keep the newest 50 so storage never fills up
export const MAX_ATTEMPTS = 5 // a round the server keeps refusing is dropped after this

// ---------- storage (never throws: private mode or full storage just means no queue) ----------

function readQueue() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return [] // missing or damaged data: start with an empty queue
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    // storage unavailable: nothing else we can do
  }
}

// ---------- reading ----------

export function getQueuedRounds() {
  return readQueue()
}

export function getQueuedCount() {
  return readQueue().length
}

// ---------- adding ----------

// Adds a finished round to the queue and returns the queued entry.
export function queueRound(round) {
  const entry = {
    queueId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    round: {
      score: round.score,
      total: round.total,
      points: round.points,
      bestStreak: round.bestStreak,
      category: round.category ?? null,
      date: round.date ?? new Date().toISOString(),
    },
  }
  const queue = [...readQueue(), entry].slice(-MAX_QUEUED)
  writeQueue(queue)
  return entry
}

export function clearQueue() {
  writeQueue([])
}

// ---------- sending ----------

let flushing = null // the flush in progress, so two flushes never run at once

export function flushQueue({ send = saveQuizAttempt } = {}) {
  if (flushing) return flushing

  flushing = (async () => {
    let sent = 0
    let dropped = 0

    for (const entry of readQueue()) {
      const status = await send(entry.round)

      if (status === 'saved') {
        writeQueue(readQueue().filter((item) => item.queueId !== entry.queueId))
        sent += 1
        continue
      }

      if (status === 'failed' && navigator.onLine) {
        const attempts = entry.attempts + 1
        const queue = readQueue()
        if (attempts >= MAX_ATTEMPTS) {
          writeQueue(queue.filter((item) => item.queueId !== entry.queueId))
          dropped += 1
          continue // this one is gone, try the next
        }
        writeQueue(
          queue.map((item) => (item.queueId === entry.queueId ? { ...item, attempts } : item))
        )
      }
      break // offline, logged out or failed: try again later, in the same order
    }

    return { sent, remaining: getQueuedCount(), dropped }
  })().finally(() => {
    flushing = null // finished: the next flush can start
  })

  return flushing
}

// Flushes now (if online) and again every time the browser comes back online.
// Returns a function that stops listening. Call it once, e.g. in App.jsx.
export function startAutoSync(options) {
  const handleOnline = () => {
    flushQueue(options)
  }
  window.addEventListener('online', handleOnline)
  if (navigator.onLine) handleOnline()
  return () => window.removeEventListener('online', handleOnline)
}
