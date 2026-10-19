// This tests useQuestions hook to ensure it corectly handles fetching questions, loading states and API errors

import { describe, it, expect, vi, beforeEach } from "vitest"; // for vitest functions to organise and run tests
import { renderHook, act } from "@testing-library/react"; // for tools for testing React hooks and waiting for async updates 
import { useQuestions } from "../hooks/useQuestions"; // for hooks being tested 
import { fetchQuestions } from "../api/triviaApi"; // for the API function used by the hook to fetch questions

vi.mock("../api/triviaApi", () => ({ // replaces the real API call with a mock to keep tests fast and offline
    fetchQuestions: vi.fn(),
}));

// Group tests that verify the useQuestions hook
describe("useQuestions", () => { // runs before each test to clear previous mock calls
    beforeEach(() => {
        vi.clearAllMocks();
    });


it("does not fetch automatically on mount", () => { // check that the questions are not fetched automatically when the hook mounts 
    const { result } = renderHook(() => useQuestions(9, 10)); 
    expect(result.current.loading).toBe(false); // confirm hook is not loading
    expect(result.current.questions).toEqual([]); // confirm no questions have been loaded
    expect(result.current.error).toBe(null); // confirm no error
    expect(fetchQuestions).not.toHaveBeenCalled(); // confirm no API request was made 
});

it("calls fetchQuestions with the given category and amount", async () => { // checks that refetch sends the correct category and questions amount to the API
    fetchQuestions.mockResolvedValue([]); // Provides a successful empty response 
    const { result } = renderHook(() => useQuestions(9, 5));
    await act(async () => {
        await result.current.refetch(); // manually triggers the API request
    });
    expect(fetchQuestions).toHaveBeenCalledWith({ amount:5, category: 9 }); // confirms the correct parameters were sent
    
});

it("stores the questions once refetch succeeds", async () => { // checks that the questions are stored afte successful fetch
    const fakeQuestions = [
        { id: "1", question: "2 + 2?", correctAnswer: "4" },
    ];
    fetchQuestions.mockResolvedValue(fakeQuestions); // provides fake successful API data
    const { result } = renderHook(() => useQuestions(9, 10));
    await act(async () => {
        await result.current.refetch(); // trigger the API request
    });
    expect(result.current.questions).toEqual(fakeQuestions); // confirms the questions were stored 
    expect(result.current.loading).toBe(false); // confirm loading has finished 
    expect(result.current.error).toBe(null); // confirm no error
});

it("stores an error message if refetch fails", async () => { // checks that the API error is stored when refetch fails 
    fetchQuestions.mockRejectedValue(new Error("Rate limit exceeded")); // simulates a failed API request
    const { result } = renderHook(() => useQuestions(9, 10));
    await act(async () => {
        await result.current.refetch(); // trigger the failed API request
    });
    expect(result.current.error).toBe("Rate limit exceeded"); // confirms the error message was stored 
    expect(result.current.questions).toEqual([]); // confirm no questions were stored
    expect(result.current.loading).toBe(false); // confirm loading has finished 
    }); 
});
