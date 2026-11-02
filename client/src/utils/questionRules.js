// The rules for a valid question, shared by QuestionForm and its tests.
// They match the backend's Question model (server/models/question.py):
//   - text is required (max 500 characters)
//   - difficulty is easy, medium or hard
//   - multiple choice: a correct answer and exactly 3 different wrong answers,
//     none of them the same as the correct answer (each max 255 characters)
//   - true/false: the answer is "True" or "False", and the wrong answer is
//     the other one

export const TEXT_MAX_LENGTH = 500
export const ANSWER_MAX_LENGTH = 255
export const DIFFICULTIES = ['easy', 'medium', 'hard']

// Turns the form's fields into the data the API expects.
export function buildQuestionData(fields, categoryId) {
  const isBoolean = fields.questionType === 'boolean'
  const correct = isBoolean ? fields.booleanAnswer : fields.correctAnswer.trim()

  return {
    text: fields.text.trim(),
    question_type: fields.questionType,
    difficulty: fields.difficulty,
    correct_answer: correct,
    incorrect_answers: isBoolean
      ? [correct === 'True' ? 'False' : 'True']
      : fields.wrongAnswers.map((answer) => answer.trim()),
    category_id: categoryId,
  }
}

// Returns a list of problems with the data. An empty list means it is valid.
export function validateQuestion(data) {
  const errors = []

  if (!data.text) errors.push('Question text is required.')
  else if (data.text.length > TEXT_MAX_LENGTH) {
    errors.push(`Question text must be ${TEXT_MAX_LENGTH} characters or fewer.`)
  }

  if (!DIFFICULTIES.includes(data.difficulty)) {
    errors.push('Choose a difficulty: easy, medium or hard.')
  }

  if (data.question_type === 'boolean') {
    if (!['True', 'False'].includes(data.correct_answer)) {
      errors.push('Choose whether the answer is True or False.')
    }
    return errors
  }

  if (!data.correct_answer) errors.push('The correct answer is required.')
  else if (data.correct_answer.length > ANSWER_MAX_LENGTH) {
    errors.push(`The correct answer must be ${ANSWER_MAX_LENGTH} characters or fewer.`)
  }

  const wrong = data.incorrect_answers
  if (wrong.length !== 3 || wrong.some((answer) => !answer)) {
    errors.push('Fill in all 3 wrong answers.')
  } else {
    if (wrong.some((answer) => answer.length > ANSWER_MAX_LENGTH)) {
      errors.push(`Each wrong answer must be ${ANSWER_MAX_LENGTH} characters or fewer.`)
    }
    if (new Set(wrong).size !== wrong.length) {
      errors.push('The wrong answers must all be different.')
    }
    if (data.correct_answer && wrong.includes(data.correct_answer)) {
      errors.push("The correct answer can't also be a wrong answer.")
    }
  }

  return errors
}
