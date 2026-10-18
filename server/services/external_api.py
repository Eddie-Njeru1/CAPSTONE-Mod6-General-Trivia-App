
"""
Service for retrieving trivia questions and categories from Open Trivia DB
and generating additional trivia questions using OpenAI.

The existing Open Trivia DB functions are preserved so the AI feature
does not replace the application's current trivia functionality.
"""

import json
import os
from urllib.parse import unquote

import requests
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError


# Base URL and timeout for Open Trivia DB requests.
API_BASE_URL = "https://opentdb.com"
REQUEST_TIMEOUT = 10

# Load environment variables from the local .env file.
# Never place API keys directly in source code.
load_dotenv()


class ExternalAPIError(Exception):
    """Raised when the external trivia service fails."""


class AITriviaError(Exception):
    """Raised when AI trivia generation fails."""


def _get_json(endpoint, params=None):
    """Make a safe request to Open Trivia DB and return JSON data."""
    url = f"{API_BASE_URL}{endpoint}"

    try:
        response = requests.get(
            url,
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()

    except requests.Timeout as exc:
        raise ExternalAPIError(
            "The trivia service timed out. Please try again."
        ) from exc

    except requests.RequestException as exc:
        raise ExternalAPIError(
            "Unable to connect to the trivia service."
        ) from exc

    except ValueError as exc:
        raise ExternalAPIError(
            "The trivia service returned invalid JSON."
        ) from exc

    # Confirm the response has the expected top-level structure.
    if not isinstance(payload, dict):
        raise ExternalAPIError(
            "The trivia service returned an unexpected response."
        )

    return payload


def fetch_external_categories():
    """Retrieve available trivia categories from Open Trivia DB."""
    payload = _get_json("/api_category.php")
    categories = payload.get("trivia_categories")

    if not isinstance(categories, list):
        raise ExternalAPIError(
            "The trivia service returned invalid categories."
        )

    # Decode URL-encoded category names before returning them.
    for category in categories:
        if isinstance(category, dict) and "name" in category:
            category["name"] = unquote(category["name"])

    return categories


def fetch_external_questions(
    amount=10,
    category=None,
    difficulty=None,
    question_type=None,
):
    """Retrieve trivia questions with optional filters."""
    # Reject booleans as amounts even though bool is a subclass of int.
    if isinstance(amount, bool) or not isinstance(amount, int):
        raise ValueError("amount must be an integer.")

    if not 1 <= amount <= 50:
        raise ValueError("amount must be between 1 and 50.")

    # Configure the API request.
    params = {
        "amount": amount,
        "encode": "url3986",
    }

    # Validate and include an optional category ID.
    if category is not None:
        if isinstance(category, bool):
            raise ValueError("category must be a positive integer.")

        try:
            category = int(category)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                "category must be a positive integer."
            ) from exc

        if category < 1:
            raise ValueError("category must be a positive integer.")

        params["category"] = category

    # Validate and include an optional difficulty.
    if difficulty is not None:
        if difficulty not in ("easy", "medium", "hard"):
            raise ValueError(
                "difficulty must be easy, medium, or hard."
            )

        params["difficulty"] = difficulty

    # Validate and include an optional question type.
    if question_type is not None:
        if question_type not in ("multiple", "boolean"):
            raise ValueError(
                "question_type must be multiple or boolean."
            )

        params["type"] = question_type

    # Request questions from Open Trivia DB.
    payload = _get_json("/api.php", params=params)
    response_code = payload.get("response_code")

    # Open Trivia DB response code 1 means no matching questions.
    if response_code == 1:
        return []

    # Response code 0 means the request succeeded.
    if response_code == 0:
        results = payload.get("results")

        if not isinstance(results, list):
            raise ExternalAPIError(
                "The trivia service returned invalid questions."
            )

        # Decode URL-encoded question and answer text.
        for question in results:
            if not isinstance(question, dict):
                raise ExternalAPIError(
                    "The trivia service returned an invalid question."
                )

            if "category" in question:
                question["category"] = unquote(question["category"])

            if "question" in question:
                question["question"] = unquote(question["question"])

            if "correct_answer" in question:
                question["correct_answer"] = unquote(
                    question["correct_answer"]
                )

            question["incorrect_answers"] = [
                unquote(answer)
                for answer in question.get("incorrect_answers", [])
            ]

        return results

    # Translate other API response codes into readable errors.
    error_messages = {
        2: "The trivia request contains invalid parameters.",
        3: "The trivia session token was not found.",
        4: "The trivia session has no remaining questions.",
        5: (
            "The trivia service rate limit was reached. "
            "Wait before retrying."
        ),
    }

    raise ExternalAPIError(
        error_messages.get(
            response_code,
            "The trivia service returned an unexpected error.",
        )
    )


def generate_ai_question(
    category_name,
    difficulty="medium",
    question_type="multiple",
):
    """
    Generate one trivia question using OpenAI.

    Returns a dictionary containing:
    - text
    - question_type
    - difficulty
    - correct_answer
    - incorrect_answers

    The caller must validate the returned data with QuestionSchema
    before saving it to the database.
    """
    # Ensure a category name was provided.
    if not isinstance(category_name, str) or not category_name.strip():
        raise ValueError("category_name must be a non-empty string.")

    # Validate options before making a potentially billable API request.
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("difficulty must be easy, medium, or hard.")

    if question_type not in ("multiple", "boolean"):
        raise ValueError("question_type must be multiple or boolean.")

    # Do not attempt a request when the API key is missing.
    if not os.getenv("OPENAI_API_KEY"):
        raise AITriviaError(
            "AI trivia generation is not configured. An API key is required."
        )

    try:
        # The OpenAI SDK reads OPENAI_API_KEY from the environment.
        client = OpenAI(
            timeout=20.0,
            max_retries=1,
        )

        # Ask for one question in a predictable JSON structure.
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            instructions=(
                "You create accurate educational trivia questions. "
                "Return only a valid JSON object with these keys: "
                "text, question_type, difficulty, correct_answer, "
                "incorrect_answers. Do not include category_id or "
                "database IDs. The question_type and difficulty values "
                "must match the requested values. For multiple-choice "
                "questions, provide exactly three distinct incorrect "
                "answers. For boolean questions, correct_answer must be "
                "exactly 'True' or 'False', and incorrect_answers must "
                "contain only the opposite value. Ensure the question "
                "and answers are factually accurate."
            ),
            input=(
                f"Create one {difficulty} difficulty trivia question "
                f"about {category_name.strip()}. "
                f"The question type must be {question_type}. "
                "Return the JSON object only."
            ),
        )

        # Extract the model's text and parse it as JSON.
        generated_text = response.output_text

        if not generated_text:
            raise AITriviaError(
                "The AI service returned an empty response."
            )

        question_data = json.loads(generated_text)

    except AITriviaError:
        raise

    except (OpenAIError, json.JSONDecodeError, TypeError) as exc:
        # Avoid exposing provider errors, credentials, or internal details.
        raise AITriviaError(
            "Unable to generate a trivia question right now."
        ) from exc

    # Validate the basic structure before returning it to the caller.
    if not isinstance(question_data, dict):
        raise AITriviaError(
            "The AI service returned an invalid question."
        )

    required_fields = {
        "text",
        "question_type",
        "difficulty",
        "correct_answer",
        "incorrect_answers",
    }

    if not required_fields.issubset(question_data):
        raise AITriviaError(
            "The AI service returned an incomplete question."
        )

    # Return the generated data; the existing schema performs
    # detailed field and answer validation before database insertion.
    return question_data
