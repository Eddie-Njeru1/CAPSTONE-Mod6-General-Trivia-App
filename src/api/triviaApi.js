const API_BASE_URL = "https://opentdb.com";

async function fetchJson(url) {
  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error(
      "Trivia API rate limit reached. Please wait a few seconds before trying again."
    );
  }

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchCategories() {
  const data = await fetchJson(`${API_BASE_URL}/api_category.php`);

  if (!Array.isArray(data.trivia_categories)) {
    throw new Error("Invalid category data received from the API");
  }

  return data.trivia_categories;
}

export async function fetchQuestions({
  amount = 10,
  category,
  difficulty,
  type,
} = {}) {
  const params = new URLSearchParams({
    amount: String(amount),
    encode: "url3986",
  });

  if (category) {
    params.set("category", String(category));
  }

  if (difficulty) {
    params.set("difficulty", difficulty);
  }

  if (type) {
    params.set("type", type);
  }

  const data = await fetchJson(
    `${API_BASE_URL}/api.php?${params.toString()}`
  );

  if (data.response_code !== 0) {
    throw new Error(
      `Trivia API returned response code ${data.response_code}`
    );
  }

  return data.results.map((question, index) => {
    const decodedQuestion = decodeURIComponent(question.question);
    const decodedCorrectAnswer = decodeURIComponent(question.correct_answer);
    const decodedIncorrectAnswers = question.incorrect_answers.map(
      (answer) => decodeURIComponent(answer)
    );

    const answers = [
      decodedCorrectAnswer,
      ...decodedIncorrectAnswers,
    ];

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