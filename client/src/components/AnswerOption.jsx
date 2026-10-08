// One answer button. The parent decides its status:
//   "idle"    - not answered yet (clickable)
//   "correct" - the right answer, revealed after answering
//   "wrong"   - the user's pick, and it was wrong
//   "neutral" - answered; this option was neither picked nor correct
function AnswerOption({ text, status = "idle", onSelect, disabled = false }) {
  return (
    <button
      type="button"
      className={`answer-option answer-option--${status}`}
      onClick={() => onSelect(text)}
      disabled={disabled}
    >
      <span className="answer-option__text">{text}</span>
      {status === "correct" && <span className="answer-option__icon">✓</span>}
      {status === "wrong" && <span className="answer-option__icon">✗</span>}
    </button>
  );
}

export default AnswerOption;
