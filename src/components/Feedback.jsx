// Shown after the user answers. Says whether they were right,
// reveals the correct answer when they weren't, and moves the quiz on.
function Feedback({
  isCorrect,
  correctAnswer,
  pointsEarned = 0,
  onNext,
  isLastQuestion = false,
}) {
  return (
    <div
      className={`feedback feedback--${isCorrect ? "correct" : "wrong"}`}
      aria-live="polite"
    >
      <p className="feedback__message">
        {isCorrect ? "Correct!" : "Not quite."}
      </p>

      {isCorrect && pointsEarned > 0 && (
        <p className="feedback__points">+{pointsEarned} points</p>
      )}

      {!isCorrect && (
        <p className="feedback__answer">
          The correct answer was <strong>{correctAnswer}</strong>.
        </p>
      )}

      <button type="button" className="feedback__next" onClick={onNext}>
        {isLastQuestion ? "See results" : "Next question"}
      </button>
    </div>
  );
}

export default Feedback;
