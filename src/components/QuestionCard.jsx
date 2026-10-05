import AnswerOption from "./AnswerOption";

// Shows one question, its progress, and its answer buttons.
// It works out each button's status; the parent (QuizPage) owns the state.
function QuestionCard({
  question,
  options,
  selectedAnswer,
  onSelect,
  questionNumber,
  totalQuestions,
}) {
  const answered = selectedAnswer !== null;
  const progressPercent = (questionNumber / totalQuestions) * 100;

  function getStatus(option) {
    if (!answered) return "idle";
    if (option === question.correctAnswer) return "correct";
    if (option === selectedAnswer) return "wrong";
    return "neutral";
  }

  return (
    <article className="question-card">
      <header className="question-card__header">
        <p className="question-card__progress-text">
          Question {questionNumber} of {totalQuestions}
        </p>
        <div
          className="question-card__progress-bar"
          role="progressbar"
          aria-valuenow={questionNumber}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
        >
          <div
            className="question-card__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="question-card__meta">
          {question.category} · {question.difficulty}
        </p>
      </header>

      <h2 className="question-card__question">{question.question}</h2>

      <div className="question-card__options">
        {options.map((option) => (
          <AnswerOption
            key={option}
            text={option}
            status={getStatus(option)}
            onSelect={onSelect}
            disabled={answered}
          />
        ))}
      </div>
    </article>
  );
}

export default QuestionCard;
