import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuestions } from "../hooks/useQuestions";
import { useScore } from "../context/useScore";
import { buildAnswerOptions, getPointsFor } from "../utils/quizHelpers";
import QuestionCard from "../components/QuestionCard";
import Feedback from "../components/Feedback";

// The API returns exactly this many questions, or an error if it can't.
const QUESTIONS_PER_ROUND = 10;

function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { startRound, recordAnswer, finishRound } = useScore();

  // "mixed" (or no category at all) means: don't filter by category.
  const categoryParam = searchParams.get("category");
  const categoryId =
    categoryParam && categoryParam !== "mixed" ? categoryParam : null;

  const { questions, loading, error, refetch } = useQuestions(
    categoryId,
    QUESTIONS_PER_ROUND
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // Remembers which category we last fetched for. React's StrictMode runs
  // effects twice in development; without this guard we'd send two requests
  // at once and trip the API's rate limit (about 1 request per 5 seconds).
  const fetchedFor = useRef(undefined);

  useEffect(() => {
    if (fetchedFor.current === categoryId) return;
    fetchedFor.current = categoryId;
    startRound(QUESTIONS_PER_ROUND);
    refetch();
  }, [categoryId, refetch, startRound]);

  // Shuffle each question's answers ONCE per batch, so the buttons
  // don't jump around every time the page re-renders.
  const options = useMemo(
    () => questions.map((question) => buildAnswerOptions(question)),
    [questions]
  );

  function handleRetry() {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    startRound(QUESTIONS_PER_ROUND);
    refetch();
  }

  if (error) {
    return (
      <section className="quiz-page quiz-page--error">
        <p>Sorry, we couldn't load questions: {error}</p>
        <button type="button" onClick={handleRetry}>
          Try again
        </button>
        <Link to="/">Back to categories</Link>
      </section>
    );
  }

  // Errors (including "no questions found") are handled above, so an
  // empty list here only means the questions haven't arrived yet.
  if (loading || questions.length === 0) {
    return (
      <section className="quiz-page quiz-page--loading">
        <p>Loading questions…</p>
      </section>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  function handleSelect(answer) {
    if (answered) return; // ignore double-clicks
    setSelectedAnswer(answer);
    recordAnswer(
      answer === currentQuestion.correctAnswer,
      currentQuestion.difficulty
    );
  }

  function handleNext() {
    if (isLastQuestion) {
      finishRound(categoryId ? currentQuestion.category : "Mixed");
      navigate("/results");
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
  }

  return (
    <section className="quiz-page">
      <QuestionCard
        question={currentQuestion}
        options={options[currentIndex]}
        selectedAnswer={selectedAnswer}
        onSelect={handleSelect}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
      />

      {answered && (
        <Feedback
          isCorrect={isCorrect}
          correctAnswer={currentQuestion.correctAnswer}
          pointsEarned={isCorrect ? getPointsFor(currentQuestion.difficulty) : 0}
          onNext={handleNext}
          isLastQuestion={isLastQuestion}
        />
      )}
    </section>
  );
}

export default QuizPage;
