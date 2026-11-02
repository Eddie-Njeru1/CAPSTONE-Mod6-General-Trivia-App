"""Tests for question CRUD, validation, filtering, pagination, and ownership."""

import pytest


QUESTION_URL = "/api/questions"
CATEGORY_URL = "/api/categories"


def create_category(client, headers, name="Science"):
    """Create a category and return the response."""
    return client.post(
        CATEGORY_URL,
        headers=headers,
        json={"name": name},
    )


def create_question(
    client,
    headers,
    category_id,
    text="What is 2 + 2?",
    question_type="multiple",
    difficulty="easy",
    correct_answer="4",
    incorrect_answers=None,
):
    """Create a question through the API and return the response."""
    if incorrect_answers is None:
        incorrect_answers = ["3", "5", "6"]

    return client.post(
        QUESTION_URL,
        headers=headers,
        json={
            "text": text,
            "question_type": question_type,
            "difficulty": difficulty,
            "correct_answer": correct_answer,
            "incorrect_answers": incorrect_answers,
            "category_id": category_id,
        },
    )


def create_boolean_question(client, headers, category_id):
    """Create a valid boolean question."""
    return create_question(
        client,
        headers,
        category_id,
        text="Is Nairobi the capital of Kenya?",
        question_type="boolean",
        difficulty="medium",
        correct_answer="True",
        incorrect_answers=["False"],
    )


def test_question_routes_require_authentication(client):
    """All question endpoints require a valid JWT."""
    responses = [
        client.get(QUESTION_URL),
        client.get(f"{QUESTION_URL}/999999"),
        client.post(QUESTION_URL, json={}),
        client.patch(f"{QUESTION_URL}/999999", json={"difficulty": "hard"}),
        client.put(f"{QUESTION_URL}/999999", json={}),
        client.delete(f"{QUESTION_URL}/999999"),
    ]

    assert all(response.status_code == 401 for response in responses)


def test_user_can_create_question(client, auth_headers):
    """An authenticated user can create a question in their category."""
    category = create_category(client, auth_headers, name="Science")
    assert category.status_code == 201

    category_id = category.get_json()["id"]

    response = create_question(
        client,
        auth_headers,
        category_id,
        text="Which planet is known as the Red Planet?",
        correct_answer="Mars",
        incorrect_answers=["Earth", "Venus", "Jupiter"],
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["text"] == "Which planet is known as the Red Planet?"
    assert data["question_type"] == "multiple"
    assert data["difficulty"] == "easy"
    assert data["correct_answer"] == "Mars"
    assert data["incorrect_answers"] == ["Earth", "Venus", "Jupiter"]
    assert data["category_id"] == category_id
    assert "id" in data
    assert "created_at" in data


def test_user_can_create_boolean_question(client, auth_headers):
    """A user can create a valid boolean question."""
    category = create_category(client, auth_headers, name="General")
    category_id = category.get_json()["id"]

    response = create_boolean_question(
        client,
        auth_headers,
        category_id,
    )

    assert response.status_code == 201

    data = response.get_json()
    assert data["question_type"] == "boolean"
    assert data["correct_answer"] == "True"
    assert data["incorrect_answers"] == ["False"]


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"text": ""},
        {"text": "   "},
        {"text": "x" * 501},
        {
            "text": "Question",
            "question_type": "invalid",
            "difficulty": "easy",
            "correct_answer": "A",
            "incorrect_answers": ["B", "C", "D"],
            "category_id": 1,
        },
        {
            "text": "Question",
            "question_type": "multiple",
            "difficulty": "invalid",
            "correct_answer": "A",
            "incorrect_answers": ["B", "C", "D"],
            "category_id": 1,
        },
        {
            "text": "Question",
            "question_type": "multiple",
            "difficulty": "easy",
            "correct_answer": "",
            "incorrect_answers": ["B", "C", "D"],
            "category_id": 1,
        },
        {
            "text": "Question",
            "question_type": "multiple",
            "difficulty": "easy",
            "correct_answer": "A",
            "incorrect_answers": ["B"],
            "category_id": 1,
        },
    ],
)
def test_question_creation_rejects_invalid_data(
    client,
    auth_headers,
    payload,
):
    """Invalid question data is rejected with a validation error."""
    category = create_category(client, auth_headers, name="Validation")
    category_id = category.get_json()["id"]

    payload["category_id"] = category_id

    response = client.post(
        QUESTION_URL,
        headers=auth_headers,
        json=payload,
    )

    assert response.status_code == 400


def test_multiple_question_requires_exactly_three_incorrect_answers(
    client,
    auth_headers,
):
    """Multiple-choice questions require exactly three incorrect answers."""
    category = create_category(client, auth_headers, name="Math")
    category_id = category.get_json()["id"]

    response = create_question(
        client,
        auth_headers,
        category_id,
        correct_answer="4",
        incorrect_answers=["3", "5"],
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Validation failed."


def test_boolean_question_requires_opposite_answer(
    client,
    auth_headers,
):
    """Boolean questions must contain the opposite boolean answer."""
    category = create_category(client, auth_headers, name="Geography")
    category_id = category.get_json()["id"]

    response = create_question(
        client,
        auth_headers,
        category_id,
        question_type="boolean",
        correct_answer="True",
        incorrect_answers=["True"],
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Validation failed."


def test_question_rejects_duplicate_answers(client, auth_headers):
    """The correct answer cannot be duplicated in incorrect answers."""
    category = create_category(client, auth_headers, name="Trivia")
    category_id = category.get_json()["id"]

    response = create_question(
        client,
        auth_headers,
        category_id,
        correct_answer="Paris",
        incorrect_answers=["Paris", "London", "Berlin"],
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "Validation failed."


def test_question_creation_requires_json_content_type(
    client,
    auth_headers,
):
    """Question creation requires application/json."""
    response = client.post(
        QUESTION_URL,
        headers={
            **auth_headers,
            "Content-Type": "text/plain",
        },
        data="not json",
    )

    assert response.status_code == 415
    assert "application/json" in response.get_json()["error"]


def test_question_creation_rejects_non_object_json(
    client,
    auth_headers,
):
    """The request body must be a JSON object."""
    response = client.post(
        QUESTION_URL,
        headers=auth_headers,
        json=["not", "an", "object"],
    )

    assert response.status_code == 400
    assert "JSON object" in response.get_json()["error"]


def test_question_creation_requires_existing_category(
    client,
    auth_headers,
):
    """A question cannot reference a missing category."""
    response = create_question(
        client,
        auth_headers,
        category_id=999999,
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Category not found."


def test_user_cannot_create_question_in_another_users_category(
    client,
    auth_headers,
    other_headers,
):
    """Users cannot add questions to another user's category."""
    category = create_category(
        client,
        other_headers,
        name="Other User Category",
    )
    category_id = category.get_json()["id"]

    response = create_question(
        client,
        auth_headers,
        category_id,
    )

    assert response.status_code == 403


def test_authenticated_user_can_list_questions(
    client,
    auth_headers,
):
    """An authenticated user can retrieve the question collection."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    create_question(client, auth_headers, category_id)

    response = client.get(
        QUESTION_URL,
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()
    assert "items" in data
    assert "pagination" in data
    assert len(data["items"]) == 1
    assert data["pagination"]["total"] == 1


def test_user_can_retrieve_question(
    client,
    auth_headers,
):
    """An authenticated user can retrieve a question by ID."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        category_id,
        text="What is water made of?",
    )
    question_id = created.get_json()["id"]

    response = client.get(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["text"] == "What is water made of?"


def test_user_can_read_another_users_question(
    client,
    auth_headers,
    other_headers,
):
    """Authenticated users can read questions owned by another user."""
    category = create_category(
        client,
        other_headers,
        name="Other Questions",
    )
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        other_headers,
        category_id,
        text="Public trivia question",
    )
    question_id = created.get_json()["id"]

    response = client.get(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["text"] == "Public trivia question"


def test_retrieving_missing_question_returns_404(
    client,
    auth_headers,
):
    """A missing question returns a 404 response."""
    response = client.get(
        f"{QUESTION_URL}/999999",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Question not found."


@pytest.mark.parametrize(
    ("query", "message"),
    [
        ("?page=0", "page"),
        ("?page=abc", "page"),
        ("?page=-1", "page"),
        ("?per_page=0", "per_page"),
        ("?per_page=abc", "per_page"),
        ("?per_page=101", "per_page"),
    ],
)
def test_question_list_rejects_invalid_pagination(
    client,
    auth_headers,
    query,
    message,
):
    """Invalid pagination parameters return 400."""
    response = client.get(
        f"{QUESTION_URL}{query}",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert message in response.get_json()["error"]


def test_question_list_paginates_results(
    client,
    auth_headers,
):
    """Question results are returned according to page size."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    create_question(client, auth_headers, category_id, text="Question One")
    create_question(client, auth_headers, category_id, text="Question Two")
    create_question(client, auth_headers, category_id, text="Question Three")

    response = client.get(
        f"{QUESTION_URL}?page=1&per_page=2",
        headers=auth_headers,
    )

    assert response.status_code == 200

    data = response.get_json()
    assert len(data["items"]) == 2
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["per_page"] == 2
    assert data["pagination"]["total"] == 3
    assert data["pagination"]["pages"] == 2
    assert data["pagination"]["has_next"] is True
    assert data["pagination"]["has_prev"] is False


def test_question_list_filters_by_category(
    client,
    auth_headers,
):
    """Questions can be filtered by category ID."""
    first_category = create_category(
        client,
        auth_headers,
        name="Science",
    )
    second_category = create_category(
        client,
        auth_headers,
        name="History",
    )

    first_id = first_category.get_json()["id"]
    second_id = second_category.get_json()["id"]

    create_question(
        client,
        auth_headers,
        first_id,
        text="Science question",
    )
    create_question(
        client,
        auth_headers,
        second_id,
        text="History question",
    )

    response = client.get(
        f"{QUESTION_URL}?category_id={first_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200

    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["text"] == "Science question"
    assert items[0]["category_id"] == first_id


@pytest.mark.parametrize(
    "category_id",
    ["0", "-1", "abc"],
)
def test_question_list_rejects_invalid_category_filter(
    client,
    auth_headers,
    category_id,
):
    """Invalid category filters return 400."""
    response = client.get(
        f"{QUESTION_URL}?category_id={category_id}",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert "category_id" in response.get_json()["error"]


def test_question_list_filters_by_difficulty(
    client,
    auth_headers,
):
    """Questions can be filtered by difficulty."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    create_question(
        client,
        auth_headers,
        category_id,
        text="Easy question",
        difficulty="easy",
    )
    create_question(
        client,
        auth_headers,
        category_id,
        text="Hard question",
        difficulty="hard",
    )

    response = client.get(
        f"{QUESTION_URL}?difficulty=hard",
        headers=auth_headers,
    )

    assert response.status_code == 200

    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["text"] == "Hard question"
    assert items[0]["difficulty"] == "hard"


def test_question_list_filters_by_question_type(
    client,
    auth_headers,
):
    """Questions can be filtered by question type."""
    category = create_category(client, auth_headers, name="General")
    category_id = category.get_json()["id"]

    create_question(
        client,
        auth_headers,
        category_id,
        text="Multiple question",
        question_type="multiple",
    )
    create_boolean_question(
        client,
        auth_headers,
        category_id,
    )

    response = client.get(
        f"{QUESTION_URL}?question_type=boolean",
        headers=auth_headers,
    )

    assert response.status_code == 200

    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["question_type"] == "boolean"


def test_owner_can_patch_question(
    client,
    auth_headers,
):
    """A question owner can partially update a question."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        category_id,
        text="Original question",
        difficulty="easy",
    )
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
        json={"difficulty": "hard"},
    )

    assert response.status_code == 200

    data = response.get_json()
    assert data["difficulty"] == "hard"
    assert data["text"] == "Original question"


def test_owner_can_put_question(
    client,
    auth_headers,
):
    """A question owner can replace all editable question fields."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        category_id,
        text="Original question",
    )
    question_id = created.get_json()["id"]

    replacement = {
        "text": "Replacement question",
        "question_type": "multiple",
        "difficulty": "hard",
        "correct_answer": "Mars",
        "incorrect_answers": ["Earth", "Venus", "Jupiter"],
        "category_id": category_id,
    }

    response = client.put(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
        json=replacement,
    )

    assert response.status_code == 200

    data = response.get_json()
    assert data["text"] == "Replacement question"
    assert data["difficulty"] == "hard"
    assert data["correct_answer"] == "Mars"


def test_patch_can_change_question_category(
    client,
    auth_headers,
):
    """An owner can move a question to another category they own."""
    first_category = create_category(
        client,
        auth_headers,
        name="Science",
    )
    second_category = create_category(
        client,
        auth_headers,
        name="History",
    )

    first_id = first_category.get_json()["id"]
    second_id = second_category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        first_id,
    )
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
        json={"category_id": second_id},
    )

    assert response.status_code == 200
    assert response.get_json()["category_id"] == second_id


def test_user_cannot_move_question_to_another_users_category(
    client,
    auth_headers,
    other_headers,
):
    """A question cannot be moved into another user's category."""
    own_category = create_category(
        client,
        auth_headers,
        name="My Category",
    )
    other_category = create_category(
        client,
        other_headers,
        name="Other Category",
    )

    own_category_id = own_category.get_json()["id"]
    other_category_id = other_category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        own_category_id,
    )
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
        json={"category_id": other_category_id},
    )

    assert response.status_code == 403


@pytest.mark.parametrize(
    "forbidden_field",
    ["id", "created_at", "updated_at", "user_id"],
)
def test_question_update_rejects_forbidden_fields(
    client,
    auth_headers,
    forbidden_field,
):
    """Clients cannot modify generated or ownership fields."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        category_id,
    )
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
        json={forbidden_field: "not allowed"},
    )

    assert response.status_code == 400
    assert (
        response.get_json()["error"]
        == "Identifier and ownership fields cannot be changed."
    )


def test_user_cannot_update_another_users_question(
    client,
    auth_headers,
    other_headers,
):
    """A user cannot modify a question owned by another user."""
    category = create_category(
        client,
        other_headers,
        name="Other Category",
    )
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        other_headers,
        category_id,
    )
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
        json={"difficulty": "hard"},
    )

    assert response.status_code == 403


def test_user_cannot_delete_another_users_question(
    client,
    auth_headers,
    other_headers,
):
    """A user cannot delete another user's question."""
    category = create_category(
        client,
        other_headers,
        name="Other Category",
    )
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        other_headers,
        category_id,
    )
    question_id = created.get_json()["id"]

    response = client.delete(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
    )

    assert response.status_code == 403


def test_admin_can_update_another_users_question(
    client,
    admin_headers,
    other_headers,
):
    """An administrator can update a question owned by another user."""
    category = create_category(
        client,
        other_headers,
        name="Other User Category",
    )
    category_id = category.get_json()["id"]

    created = create_question(client, other_headers, category_id)
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers=admin_headers,
        json={"difficulty": "hard"},
    )

    assert response.status_code == 200
    assert response.get_json()["difficulty"] == "hard"


def test_admin_can_delete_another_users_question(
    client,
    admin_headers,
    other_headers,
):
    """An administrator can delete a question owned by another user."""
    category = create_category(
        client,
        other_headers,
        name="Other User Category",
    )
    category_id = category.get_json()["id"]

    created = create_question(client, other_headers, category_id)
    question_id = created.get_json()["id"]

    response = client.delete(
        f"{QUESTION_URL}/{question_id}",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Question deleted successfully."


def test_owner_can_delete_question(
    client,
    auth_headers,
):
    """A question owner can delete their question."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        category_id,
    )
    question_id = created.get_json()["id"]

    response = client.delete(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Question deleted successfully."

    missing = client.get(
        f"{QUESTION_URL}/{question_id}",
        headers=auth_headers,
    )

    assert missing.status_code == 404


def test_owner_cannot_patch_missing_question(
    client,
    auth_headers,
):
    """Updating a missing question returns 404."""
    response = client.patch(
        f"{QUESTION_URL}/999999",
        headers=auth_headers,
        json={"difficulty": "hard"},
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Question not found."


def test_owner_cannot_delete_missing_question(
    client,
    auth_headers,
):
    """Deleting a missing question returns 404."""
    response = client.delete(
        f"{QUESTION_URL}/999999",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Question not found."


def test_question_update_requires_json_content_type(
    client,
    auth_headers,
):
    """Question updates require application/json."""
    category = create_category(client, auth_headers, name="Science")
    category_id = category.get_json()["id"]

    created = create_question(
        client,
        auth_headers,
        category_id,
    )
    question_id = created.get_json()["id"]

    response = client.patch(
        f"{QUESTION_URL}/{question_id}",
        headers={
            **auth_headers,
            "Content-Type": "text/plain",
        },
        data="difficulty=hard",
    )

    assert response.status_code == 415
    assert "application/json" in response.get_json()["error"]
