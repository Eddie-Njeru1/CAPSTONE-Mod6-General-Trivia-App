import { useEffect, useState } from "react";
import { ScoreContext } from "./useScore";
import { getPointsFor, getStreakMultiplier } from "../utils/quizHelpers";
import { saveQuizAttempt } from "../services/scoreApi";

// localStorage key for past rounds. Kept in Phase 2 so guests (not logged
// in) still see their history; logged-in rounds are also saved to the backend.
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
  // points = reward points this round, weighted by difficulty and streak
  const [points, setPoints] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  // streak = correct answers in a row right now; bestStreak = longest this round
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  // past rounds, shaped { category, score, total } for ScoreboardPage
  const [history, setHistory] = useState(loadHistory);
  // Backend save of the last round: "idle" | "saving" | "saved" | "failed" | "guest"
  const [saveStatus, setSaveStatus] = useState("idle");

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
    setStreak(0);
    setBestStreak(0);
    setTotalQuestions(numberOfQuestions);
    setSaveStatus("idle");
  }

  // Call once per answered question. Returns what this answer earned,
  // so the Feedback panel can show the points and the streak.
  function recordAnswer(isCorrect, difficulty) {
    if (!isCorrect) {
      setStreak(0);
      return { points: 0, streak: 0, multiplier: 1 };
    }

    const newStreak = streak + 1;
    const multiplier = getStreakMultiplier(newStreak);
    const earned = Math.round(getPointsFor(difficulty) * multiplier);

    setScore((prev) => prev + 1);
    setPoints((prev) => prev + earned);
    setStreak(newStreak);
    setBestStreak((prev) => Math.max(prev, newStreak));

    return { points: earned, streak: newStreak, multiplier };
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
      bestStreak,
    };
    setHistory((prev) => [round, ...prev].slice(0, MAX_HISTORY));

    // Also save it to the backend when logged in. This runs in the
    // background: the results page shows straight away either way.
    if (totalQuestions > 0) {
      setSaveStatus("saving");
      saveQuizAttempt(round).then(setSaveStatus);
    }
  }

  const value = {
    score,
    points,
    totalQuestions,
    streak,
    bestStreak,
    history,
    saveStatus,
    startRound,
    recordAnswer,
    finishRound,
  };

  return (
    <ScoreContext.Provider value={value}>{children}</ScoreContext.Provider>
  );
}
