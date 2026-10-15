"""
Service for retrieving trivia questions and categories from Open Trivia DB.
"""

from urllib.parse import unquote

import requests


API_BASE_URL = "https://opentdb.com"
REQUEST_TIMEOUT = 10


class ExternalAPIError(Exception):
    """Raised when the external trivia service fails."""


def _get_json(endpoint, params=None):
    """Make a safe request and return the decoded JSON response."""
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

    if not isinstance(payload, dict):
        raise ExternalAPIError(
            "The trivia service returned an unexpected response."
        )

    return payload


def fetch_external_categories():
    """Retrieve available trivia categories."""
    payload = _get_json("/api_category.php")

    categories = payload.get("trivia_categories")

    if not isinstance(categories, list):
        raise ExternalAPIError(
            "The trivia service returned invalid categories."
        )

    # Decode URL-encoded category names.
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
    if isinstance(amount, bool) or not isinstance(amount, int):
        raise ValueError("amount must be an integer.")

    if not 1 <= amount <= 50:
        raise ValueError("amount must be between 1 and 50.")

    params = {
        "amount": amount,
        "encode": "url3986",
    }

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

    if difficulty is not None:
        if difficulty not in ("easy", "medium", "hard"):
            raise ValueError(
                "difficulty must be easy, medium, or hard."
            )

        params["difficulty"] = difficulty

    if question_type is not None:
        if question_type not in ("multiple", "boolean"):
            raise ValueError(
                "question_type must be multiple or boolean."
            )

        params["type"] = question_type

    payload = _get_json("/api.php", params=params)

    response_code = payload.get("response_code")

    if response_code == 1:
        return []

    if response_code == 0:
        results = payload.get("results")

        if not isinstance(results, list):
            raise ExternalAPIError(
                "The trivia service returned invalid questions."
            )

        # Decode URL-encoded text returned by Open Trivia DB.
        for question in results:
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

    error_messages = {
        2: "The trivia request contains invalid parameters.",
        3: "The trivia session token was not found.",
        4: "The trivia session has no remaining questions.",
        5: "The trivia service rate limit was reached. Wait before retrying.",
    }

    raise ExternalAPIError(
        error_messages.get(
            response_code,
            "The trivia service returned an unexpected error.",
        )
    )