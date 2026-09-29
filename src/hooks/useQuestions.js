import { useCallback, useState } from "react";
import { fetchQuestions } from "../api/triviaApi";

export function useQuestions(categoryId, amount = 10) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchQuestions({
        amount,
        category: categoryId,
      });

      setQuestions(data);
    } catch (err) {
      setQuestions([]);
      setError(err.message || "Failed to load trivia questions.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, amount]);

  return {
    questions,
    loading,
    error,
    refetch: loadQuestions,
  };
}
