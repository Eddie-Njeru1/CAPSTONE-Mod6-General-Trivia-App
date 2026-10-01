// Points awarded for a correct answer, by question difficulty.
export const POINTS_BY_DIFFICULTY = {
  easy: 10,
  medium: 20,
  hard: 30,
};

// Returns how many points a correct answer is worth.
// Falls back to "easy" if difficulty is missing or unexpected.
export function getPointsFor(difficulty) {
  return POINTS_BY_DIFFICULTY[difficulty] ?? POINTS_BY_DIFFICULTY.easy;
}

// Fisher-Yates shuffle: returns a NEW shuffled array,
// leaving the original untouched.
export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds the answer choices for one question.
// True/false always shows "True" then "False" so the buttons never swap;
// multiple-choice answers are shuffled so the right one isn't always first.
export function buildAnswerOptions(question) {
  if (question.type === "boolean") {
    return ["True", "False"];
  }
  return shuffle([question.correctAnswer, ...question.incorrectAnswers]);
}

// Streak bonus: answering several in a row correctly multiplies the points.
// 3-4 in a row = x1.5, 5 or more = x2, otherwise no bonus.
export function getStreakMultiplier(streak) {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}
