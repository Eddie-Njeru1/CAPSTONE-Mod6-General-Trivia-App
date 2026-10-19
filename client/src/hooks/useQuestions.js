import { useCallback, useState } from "react";
import { fetchQuestions } from "../api/triviaApi";

// Custom hook for loading trivia questions for a selected category.
export function useQuestions(categoryId, amount = 10) {
  // Store the questions returned by the API.
  const [questions, setQuestions] = useState([]);

  // Track whether the questions request is currently loading.
  const [loading, setLoading] = useState(false);

  // Store an error message if the API request fails.
  const [error, setError] = useState(null);

  // Create a reusable function for loading questions.
  const loadQuestions = useCallback(async () => {
    // Start the loading state and clear any previous error.
    setLoading(true);
    setError(null);

    try {
      // Request questions using the selected category and amount.
      const data = await fetchQuestions({
        amount,
        category: categoryId,
      });

      // Save the returned questions in state.
      setQuestions(data);
    } catch (err) {
      // Clear the questions and store a useful error message.
      setQuestions([]);
      setError(err.message || "Failed to load trivia questions.");
    } finally {
      // Stop the loading state whether the request succeeds or fails.
      setLoading(false);
    }
  }, [categoryId, amount]);

  // Expose the questions, loading state, error, and reload function.
  return {
    questions,
    loading,
    error,
    refetch: loadQuestions,
  };
}