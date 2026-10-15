"""Tests for the external trivia API service."""

import pytest
import requests
from unittest.mock import Mock, patch

from services.external_api import (
    ExternalAPIError,
    fetch_external_categories,
    fetch_external_questions,
)


@patch("services.external_api.requests.get")
def test_fetch_external_categories_returns_categories(mock_get):
    """Return categories when the external API responds successfully."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "trivia_categories": [
            {"id": 9, "name": "General Knowledge"},
            {"id": 17, "name": "Science & Nature"},
        ]
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    result = fetch_external_categories()

    assert len(result) == 2
    assert result[0]["name"] == "General Knowledge"
    mock_get.assert_called_once()


@patch("services.external_api.requests.get")
def test_fetch_external_questions_returns_questions(mock_get):
    """Return questions and pass the requested filters."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "response_code": 0,
        "results": [
            {
                "question": "What is 2 + 2?",
                "correct_answer": "4",
                "incorrect_answers": ["3", "5", "6"],
            }
        ],
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    result = fetch_external_questions(
        amount=1,
        category=9,
        difficulty="easy",
        question_type="multiple",
    )

    assert len(result) == 1
    assert result[0]["correct_answer"] == "4"

    request_params = mock_get.call_args.kwargs["params"]
    assert request_params["amount"] == 1
    assert request_params["category"] == 9
    assert request_params["difficulty"] == "easy"
    assert request_params["type"] == "multiple"

@patch("services.external_api.requests.get")
def test_fetch_external_questions_decodes_encoded_text(mock_get):
    """Decode URL-encoded text returned by Open Trivia DB."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "response_code": 0,
        "results": [
            {
                "category": "Science%20%26%20Nature",
                "question": "What%20is%202%20%2B%202%3F",
                "correct_answer": "4",
                "incorrect_answers": ["3", "5", "6"],
            }
        ],
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    result = fetch_external_questions(amount=1)

    assert result[0]["category"] == "Science & Nature"
    assert result[0]["question"] == "What is 2 + 2?"
    assert result[0]["correct_answer"] == "4"
    assert result[0]["incorrect_answers"] == ["3", "5", "6"]


@patch("services.external_api.requests.get")
def test_fetch_external_questions_returns_empty_for_no_results(mock_get):
    """Return an empty list when the API has no matching questions."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "response_code": 1,
        "results": [],
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    assert fetch_external_questions(amount=10) == []


@pytest.mark.parametrize("amount", [0, 51, -1, True, "10", 1.5])
def test_fetch_external_questions_rejects_invalid_amount(amount):
    """Reject invalid question counts before making a request."""
    with pytest.raises(ValueError):
        fetch_external_questions(amount=amount)


@pytest.mark.parametrize("difficulty", ["", "impossible", "EASY"])
def test_fetch_external_questions_rejects_invalid_difficulty(difficulty):
    """Reject unsupported difficulty values."""
    with pytest.raises(ValueError):
        fetch_external_questions(difficulty=difficulty)


@pytest.mark.parametrize("question_type", ["", "text", "MULTIPLE"])
def test_fetch_external_questions_rejects_invalid_type(question_type):
    """Reject unsupported question types."""
    with pytest.raises(ValueError):
        fetch_external_questions(question_type=question_type)


@patch("services.external_api.requests.get")
def test_fetch_external_questions_handles_rate_limit(mock_get):
    """Translate the external API rate-limit response into a useful error."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "response_code": 5,
        "results": [],
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    with pytest.raises(ExternalAPIError, match="rate limit"):
        fetch_external_questions()


@patch("services.external_api.requests.get")
def test_external_api_handles_timeout(mock_get):
    """Convert request timeouts into a service-specific error."""
    mock_get.side_effect = requests.Timeout("Request timed out")

    with pytest.raises(ExternalAPIError, match="timed out"):
        fetch_external_categories()


@patch("services.external_api.requests.get")
def test_external_api_handles_http_errors(mock_get):
    """Convert HTTP failures into a service-specific error."""
    mock_get.side_effect = requests.ConnectionError("Connection failed")

    with pytest.raises(ExternalAPIError, match="Unable to connect"):
        fetch_external_categories()


@patch("services.external_api.requests.get")
def test_external_api_handles_invalid_json(mock_get):
    """Reject invalid JSON returned by the external service."""
    mock_response = Mock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.side_effect = ValueError("Invalid JSON")
    mock_get.return_value = mock_response

    with pytest.raises(ExternalAPIError, match="invalid JSON"):
        fetch_external_categories()
