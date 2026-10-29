import { useCallback, useState } from "react";
import { fetchQuestions } from "../api/triviaApi";
import {
  MIXED,
  getOfflineQuestions,
  isNetworkError,
  isOfflineCategory,
} from "../services/offlineQuestions";

// Custom hook for loading trivia questions for a selected category.
// Phase 3: with no internet it uses the offline question pack instead, so
// the quiz still works. `isOffline` tells the page which one it got.
export function useQuestions(categoryId, amount = 10) {
  // Store the questions returned by the API.
  const [questions, setQuestions] = useState([]);

  // Track whether the questions request is currently loading.
  const [loading, setLoading] = useState(false);

  // Store an error message if the API request fails.
  const [error, setError] = useState(null);

  // True when the questions came from the offline pack.
  const [isOffline, setIsOffline] = useState(false);

  // Create a reusable function for loading questions.
  const loadQuestions = useCallback(async () => {
    // Start the loading state and clear any previous error.
    setLoading(true);
    setError(null);

    // Uses the offline pack. A pack category (slug) plays that category;
    // an Open Trivia DB category (a number) isn't in the pack, so play mixed.
    function loadOfflinePack() {
      try {
        const category = isOfflineCategory(categoryId) ? categoryId : MIXED;
        setQuestions(getOfflineQuestions({ category, amount }));
        setIsOffline(true);
      } catch (offlineError) {
        setQuestions([]);
        setError(offlineError.message);
      }
    }

    try {
      // Offline categories, or no connection at all: don't wait for a request that can't work.
      if (isOfflineCategory(categoryId) || !navigator.onLine) {
        loadOfflinePack();
        return;
      }

      // Request questions using the selected category and amount.
      const data = await fetchQuestions({
        amount,
        category: categoryId,
      });

      // Save the returned questions in state.
      setQuestions(data);
      setIsOffline(false);
    } catch (err) {
      if (isNetworkError(err)) {
        // The internet dropped during the request: fall back to the pack.
        loadOfflinePack();
      } else {
        // The API answered with a problem (e.g. rate limit): show it.
        setQuestions([]);
        setError(err.message || "Failed to load trivia questions.");
      }
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
    isOffline,
    refetch: loadQuestions,
  };
}
