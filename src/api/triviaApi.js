// Base URL for the Open Trivia Database API.
const API_BASE_URL = "https://opentdb.com";

// Fetch JSON data from the API and handle HTTP-level errors.
async function fetchJson(url) {
  const response = await fetch(url);

  // OpenTDB may return HTTP 429 when too many requests are made.
  if (response.status === 429) {
    throw new Error(
      "Trivia API rate limit reached. Please wait a few seconds and try again."
    );
  }

  // Handle other unsuccessful HTTP responses.
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

// Fetch all available trivia categories from OpenTDB.
export async function fetchCategories() {
  const data = await fetchJson(`${API_BASE_URL}/api_category.php`);

  // Make sure the API returned the category data in the expected format.
  if (!Array.isArray(data.trivia_categories)) {
    throw new Error("Invalid category data received from the API");
  }

  return data.trivia_categories;
}

// Fetch trivia questions using the selected options.
export async function fetchQuestions({
  amount = 10,
  category,
  difficulty,
  type,
} = {}) {
  // Build the query parameters sent to the OpenTDB questions endpoint.
  const params = new URLSearchParams({
    amount: String(amount),
    encode: "url3986",
  });

  // Add the category filter when one is provided.
  if (category) {
    params.set("category", String(category));
  }

  // Add the difficulty filter when one is provided.
  if (difficulty) {
    params.set("difficulty", difficulty);
  }

  // Add the question type when one is provided.
  if (type) {
    params.set("type", type);
  }

  // Send the request with the selected query parameters.
  const data = await fetchJson(
    `${API_BASE_URL}/api.php?${params.toString()}`
  );

  // OpenTDB uses response codes to describe application-level API errors.
  if (data.response_code === 1) {
    throw new Error(
      "No trivia questions were found for the selected options."
    );
  }

  if (data.response_code === 2) {
    throw new Error("The Trivia API received invalid parameters.");
  }

  if (data.response_code === 3) {
    throw new Error("The Trivia API session token was not found.");
  }

  if (data.response_code === 4) {
    throw new Error("The Trivia API session token has no questions left.");
  }

  if (data.response_code === 5) {
    throw new Error(
      "Trivia API rate limit reached. Please wait a few seconds and try again."
    );
  }

  // Catch any unexpected response code that was not handled above.
  if (data.response_code !== 0) {
    throw new Error(
      `Trivia API returned response code ${data.response_code}`
    );
  }

  // Make sure the API returned a non-empty array of questions.
  if (!Array.isArray(data.results) || data.results.length === 0) {
    throw new Error("The Trivia API returned no questions.");
  }

  // Convert the API response into the format expected by the React app.
  return data.results.map((question, index) => {
    // Validate the important fields before using the question.
    if (
      !question.question ||
      !question.correct_answer ||
      !Array.isArray(question.incorrect_answers)
    ) {
      throw new Error("Invalid question data received from the Trivia API.");
    }

    // Decode the URL-encoded text returned by OpenTDB.
    const decodedQuestion = decodeURIComponent(question.question);
    const decodedCorrectAnswer = decodeURIComponent(question.correct_answer);

    const decodedIncorrectAnswers = question.incorrect_answers.map(
      (answer) => decodeURIComponent(answer)
    );

    // Combine the correct and incorrect answers for the quiz interface.
    const answers = [
      decodedCorrectAnswer,
      ...decodedIncorrectAnswers,
    ];

    // Return a consistent question object for the rest of the application.
    return {
      id: `${question.category}-${index}-${decodedQuestion}`,
      category: decodeURIComponent(question.category),
      difficulty: question.difficulty,
      type: question.type,
      question: decodedQuestion,
      correctAnswer: decodedCorrectAnswer,
      incorrectAnswers: decodedIncorrectAnswers,
      answers,
    };
  });
}