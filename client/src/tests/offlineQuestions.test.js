// Tests for the offline question pack (data/offlineQuestions.json) and
// services/offlineQuestions.js.

import { describe, expect, it } from 'vitest'
import pack from '../data/offlineQuestions.json'
import {
  MIXED,
  getOfflineCategories,
  getOfflineQuestions,
  hasOfflinePack,
} from '../services/offlineQuestions'

describe('the offline pack file', () => {
  it('has at least 8 categories with at least 10 questions each', () => {
    expect(pack.categories.length).toBeGreaterThanOrEqual(8)
    for (const category of pack.categories) {
      expect(category.questions.length).toBeGreaterThanOrEqual(10)
    }
  })

  it('gives every category a slug, name, icon and hex colour', () => {
    for (const category of pack.categories) {
      expect(category.slug).toMatch(/^[a-z0-9-]+$/)
      expect(category.name).toBeTruthy()
      expect(category.icon).toMatch(/^[a-z0-9-]+$/)
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('has valid questions (3 wrong answers for multiple choice, 1 for true/false)', () => {
    for (const category of pack.categories) {
      for (const q of category.questions) {
        expect(q.text).toBeTruthy()
        expect(['easy', 'medium', 'hard']).toContain(q.difficulty)
        expect(q.incorrect_answers).not.toContain(q.correct_answer)
        if (q.question_type === 'boolean') {
          expect(['True', 'False']).toContain(q.correct_answer)
          expect(q.incorrect_answers).toHaveLength(1)
        } else {
          expect(q.question_type).toBe('multiple')
          expect(q.incorrect_answers).toHaveLength(3)
        }
      }
    }
  })
})

describe('getOfflineCategories', () => {
  it('lists every category with its icon, colour and question count', () => {
    const categories = getOfflineCategories()

    expect(categories).toHaveLength(pack.categories.length)
    expect(categories[0]).toEqual({
      id: pack.categories[0].slug,
      name: pack.categories[0].name,
      description: pack.categories[0].description,
      icon: pack.categories[0].icon,
      color: pack.categories[0].color,
      questionCount: pack.categories[0].questions.length,
    })
  })

  it('reports that the pack has questions', () => {
    expect(hasOfflinePack()).toBe(true)
  })
})

describe('getOfflineQuestions', () => {
  it('returns 10 questions by default, in the same shape as the online API', () => {
    const questions = getOfflineQuestions()

    expect(questions).toHaveLength(10)
    for (const q of questions) {
      expect(Object.keys(q).sort()).toEqual(
        ['answers', 'category', 'correctAnswer', 'difficulty', 'id', 'incorrectAnswers', 'question', 'type'].sort()
      )
      expect(q.answers).toContain(q.correctAnswer)
      expect(q.answers).toHaveLength(q.incorrectAnswers.length + 1)
    }
  })

  it('only uses the chosen category', () => {
    const slug = pack.categories[1].slug
    const questions = getOfflineQuestions({ category: slug })

    expect(questions.every((q) => q.category === pack.categories[1].name)).toBe(true)
  })

  it('can mix questions from more than one category', () => {
    const questions = getOfflineQuestions({ category: MIXED, amount: 80 })
    const names = new Set(questions.map((q) => q.category))

    expect(names.size).toBeGreaterThan(1)
  })

  it('filters by difficulty', () => {
    const questions = getOfflineQuestions({ difficulty: 'hard', amount: 80 })

    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every((q) => q.difficulty === 'hard')).toBe(true)
  })

  it('never returns the same question twice in one round', () => {
    const questions = getOfflineQuestions({ amount: 80 })
    const ids = questions.map((q) => q.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does not change the pack when a round is played', () => {
    const before = JSON.stringify(pack)
    const [first] = getOfflineQuestions()
    first.answers.push('changed')

    expect(JSON.stringify(pack)).toBe(before)
  })

  it('throws a readable error for a category that is not in the pack', () => {
    expect(() => getOfflineQuestions({ category: 'not-a-category' })).toThrow(
      'That category is not available offline.'
    )
  })

  it('throws a readable error when no question matches', () => {
    expect(() => getOfflineQuestions({ difficulty: 'impossible' })).toThrow(
      'No offline questions were found for the selected options.'
    )
  })
})
