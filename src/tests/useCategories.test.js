// This tests useCategories hook to ensure it handles loading, successful API responses and API errors correctly 

import { describe, it, expect, vi, beforeEach } from "vitest"; // for vitest functions to organise and run tests
import { renderHook, waitFor } from "@testing-library/react"; // for tools for testing React hooks and waiting for async updates 
import { useCategories } from "../hooks/useCategories"; // for hooks being tested 
import { fetchCategories } from "../api/triviaApi"; // for the API function used by the hook to fetch categories

vi.mock("../api/triviaApi", () => ({ // replaces the real API call with a mock to keep tests fast and offline
    fetchCategories: vi.fn(),
}));

// Group tests that verify the useCategories hook
describe("useCategories", () => { // runs before each test to clear previous mock calls
    beforeEach(() => {
        vi.clearAllMocks();
    });
});

it("starts in a loading state", () => { // check that the hook starts in a loading state with no data or error 
    fetchCategories.mockReturnValue(new Promise(() => {})); // keeps request pending
    const { result } = renderHook(() => useCategories()); // renders hook for testing
    expect(result.current.loading).toBe(true); // confirm hoo is loading
    expect(result.current.categories).toEqual([]); // confirm there are no categories yet
    expect(result.current.error).toBe(null); // confirm no error
});

it("stores the categories once the API call succeeds", async () => { // checks the categories are stored after a successful API request
    const fakeCategories = [
        {id: 9, name: "General Knowledge" },
        {id: 21, name: "Sports" },
    ];
    fetchCategories.mockResolvedValue(fakeCategories) // provide fake successful API data 
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.loading).toBe(false)); // waits for loading to finish
    expect(result.current.categories).toEqual(fakeCategories); // confirms the categories were stored  
    expect(result.current.error).toBe(null); // confirm no error 
});

it("stores an error message if the API call fails", async () => { // checks that the hook stores an eror when the API request fails 
    fetchCategories.mockRejectedValue(new Error("Network down"));
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.loading).toBe(false)); // waits for request to finish
    expect(result.current.error).toBe("Network down"); // confirms the error message was stored 
    expect(result.current.categories).toEqual([]); // confirm no categories wee stored
});

