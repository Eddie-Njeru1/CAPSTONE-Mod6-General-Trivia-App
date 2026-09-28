import { useEffect, useState } from "react";
import { ScoreContext } from "./useScore";
import { getPointsFor } from "../utils/quizHelpers";

// localStorage key for past rounds 
const HISTORY_KEY = "trivia-score-history";
const MAX_HISTORY = 20;

// Reads saved rounds from the browser. Returns [] if nothing is saved
// or the data is unreadable, so the app never crashes on load.
function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function ScoreProvider({ children }) {
  // score = correct answers this round (shown on ResultsPage)
  const [score, setScore] = useState(0);
  // points = reward points this round, weighted by difficulty
  const [points, setPoints] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  // past rounds, shaped { category, score, total } for ScoreboardPage
  const [history, setHistory] = useState(loadHistory);

  // Save history to the browser whenever it changes.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage can fail (e.g. private browsing). The app still works.
    }
  }, [history]);

  // Call when a new quiz begins.
  function startRound(numberOfQuestions) {
    setScore(0);
    setPoints(0);
    setTotalQuestions(numberOfQuestions);
  }

  // Call once per answered question.
  function recordAnswer(isCorrect, difficulty) {
    if (!isCorrect) return;
    setScore((prev) => prev + 1);
    setPoints((prev) => prev + getPointsFor(difficulty));
  }

  // Saves the finished round. Call from its own click (e.g. "See results"),
  // not in the same click as the last answer.
  function finishRound(category) {
    const round = {
      id: Date.now(),
      date: new Date().toISOString(),
      category,
      score,
      total: totalQuestions,
      points,
    };
    setHistory((prev) => [round, ...prev].slice(0, MAX_HISTORY));
  }

  const value = {
    score,
    points,
    totalQuestions,
    history,
    startRound,
    recordAnswer,
    finishRound,
  };

  return (
    <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>
  );
}
