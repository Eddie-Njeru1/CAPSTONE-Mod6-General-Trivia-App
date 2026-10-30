// Interactive sample question for landing page visitors.

import { useState } from 'react'

const answers = [
  'Mars',
  'Venus',
  'Jupiter',
  'Mercury',
]

function TryItQuestion() {
  const [selectedAnswer, setSelectedAnswer] = useState('')

  const correctAnswer = 'Mars'

  function handleAnswer(answer) {
    setSelectedAnswer(answer)
  }

  return (
    <section className="try-it-question">
      <div className="try-it-question__header">
        <p>Give it a try</p>
        <h2>Test Your Knowledge</h2>
        <p>Which planet is known as the Red Planet?</p>
      </div>

      <div className="try-it-question__answers">
        {answers.map((answer) => {
          let answerClass = ''

          if (selectedAnswer && answer === correctAnswer) {
            answerClass = 'try-it-question__answer--correct'
          } else if (selectedAnswer === answer) {
            answerClass = 'try-it-question__answer--wrong'
          }

          return (
            <button
              key={answer}
              type="button"
              className={`try-it-question__answer ${answerClass}`}
              onClick={() => handleAnswer(answer)}
              disabled={Boolean(selectedAnswer)}
            >
              {answer}
            </button>
          )
        })}
      </div>

      {selectedAnswer && (
        <div className="try-it-question__feedback" role="status">
          {selectedAnswer === correctAnswer
            ? 'Correct! Well done!'
            : 'Not quite! The correct answer is Mars.'}
        </div>
      )}

      {selectedAnswer && (
        <button
          type="button"
          className="try-it-question__reset"
          onClick={() => setSelectedAnswer('')}
        >
          Try Again
        </button>
      )}
    </section>
  )
}

export default TryItQuestion