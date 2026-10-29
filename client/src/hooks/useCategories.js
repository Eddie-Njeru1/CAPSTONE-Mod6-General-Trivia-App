import { useCallback, useEffect, useState } from "react";
import { fetchCategories } from "../api/triviaApi";
import { getOfflineCategories, isNetworkError } from "../services/offlineQuestions";

// Custom hook for loading and managing trivia categories.
// Phase 3: with no internet it shows the offline pack's categories instead.
// `isOffline` tells the page which list it got.
export function useCategories() {
  // Store the list of categories returned by the API.
  const [categories, setCategories] = useState([]);

  // Track whether the category request is currently loading.
  const [loading, setLoading] = useState(true);

  // Store an error message if the API request fails.
  const [error, setError] = useState(null);

  // True when the categories came from the offline pack.
  const [isOffline, setIsOffline] = useState(false);

  // Create a reusable function for loading categories.
  const loadCategories = useCallback(async () => {
    // Show the loading state and clear any previous error.
    setLoading(true);
    setError(null);

    try {
      // No connection: use the offline categories straight away.
      if (!navigator.onLine) {
        setCategories(getOfflineCategories());
        setIsOffline(true);
        return;
      }

      // Request the categories from the API.
      const data = await fetchCategories();

      // Save the returned categories in state.
      setCategories(data);
      setIsOffline(false);
    } catch (err) {
      if (isNetworkError(err)) {
        // The internet dropped during the request: use the offline categories.
        setCategories(getOfflineCategories());
        setIsOffline(true);
      } else {
        // Clear the categories and store a useful error message.
        setError(err.message || "Failed to load trivia categories.");
        setCategories([]);
      }
    } finally {
      // Stop the loading state whether the request succeeds or fails.
      setLoading(false);
    }
  }, []);

  // Load categories automatically when the hook is first used.
  useEffect(() => {
    // The lint rule is disabled here because this effect intentionally
    // starts the asynchronous data-loading process.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
  }, [loadCategories]);

  // Expose the data, loading state, error, and a way to reload the data.
  return {
    categories,
    loading,
    error,
    isOffline,
    refetch: loadCategories,
  };
}
