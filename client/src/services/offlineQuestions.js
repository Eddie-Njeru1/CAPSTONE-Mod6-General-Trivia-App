// Offline question pack: categories and questions the app can use with no internet.
//
// The pack (data/offlineQuestions.json) is made from the server's seed data by
// server/utils/export_offline_pack.py, so offline and online content match.
// It is bundled into the app's JavaScript, so the service worker saves it with
// the rest of the app and it is always there offline.
//
// Questions come back in the SAME shape as api/triviaApi.js fetchQuestions(),
// so QuizPage, QuestionCard and the scoring code work without any changes.

import pack from '../data/offlineQuestions.json'
import { shuffle } from '../utils/quizHelpers'

// "mixed" (or no category) means: questions from every category.
export const MIXED = 'mixed'

const categories = Array.isArray(pack?.categories) ? pack.categories : []

// True when the pack has questions to play.
export function hasOfflinePack() {
  return categories.some((category) => category.questions?.length > 0)
}

// The offline categories, for showing tiles while offline.
// `id` is the category's slug (e.g. "african-geography").
export function getOfflineCategories() {
  return categories.map((category) => ({
    id: category.slug,
    name: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color,
    questionCount: category.questions.length,
  }))
}

// Turns one pack question into the shape the quiz screens use.
function toQuizQuestion(question, category, index) {
  return {
    id: `offline-${category.slug}-${index}`,
    category: category.name,
    difficulty: question.difficulty,
    type: question.question_type, // "multiple" or "boolean", same words as Open Trivia DB
    question: question.text,
    correctAnswer: question.correct_answer,
    incorrectAnswers: [...question.incorrect_answers],
    answers: [question.correct_answer, ...question.incorrect_answers],
  }
}

// Returns up to `amount` random questions, like fetchQuestions() does online.
//   category:   a slug from getOfflineCategories(), or "mixed" / null for all
//   difficulty: "easy", "medium" or "hard" (optional)
// Throws an Error with a readable message when nothing matches, so the quiz
// page can show it the same way it shows online errors.
export function getOfflineQuestions({ category = MIXED, amount = 10, difficulty } = {}) {
  const chosen =
    !category || category === MIXED
      ? categories
      : categories.filter((item) => item.slug === category)

  if (chosen.length === 0) {
    throw new Error('That category is not available offline.')
  }

  const all = chosen.flatMap((item) =>
    item.questions.map((question, index) => toQuizQuestion(question, item, index))
  )
  const matching = difficulty ? all.filter((q) => q.difficulty === difficulty) : all

  if (matching.length === 0) {
    throw new Error('No offline questions were found for the selected options.')
  }

  return shuffle(matching).slice(0, amount)
}
