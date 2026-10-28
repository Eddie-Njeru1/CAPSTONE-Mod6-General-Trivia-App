"""Tests for category CRUD, filtering, pagination, and ownership."""

import pytest


CATEGORY_URL = "/api/categories"


def create_category(client, headers, name="Science", **extra):
    """Create a category through the API and return its response."""
    payload = {"name": name, **extra}
    return client.post(CATEGORY_URL, headers=headers, json=payload)


def test_category_routes_require_authentication(client):
    """Category endpoints should reject requests without a JWT."""
    responses = [
        client.get(CATEGORY_URL),
        client.get(f"{CATEGORY_URL}/999999"),
        client.post(CATEGORY_URL, json={"name": "Science"}),
        client.patch(f"{CATEGORY_URL}/999999", json={"name": "Updated"}),
        client.put(f"{CATEGORY_URL}/999999", json={"name": "Updated"}),
        client.delete(f"{CATEGORY_URL}/999999"),
    ]

    assert all(response.status_code == 401 for response in responses)


def test_authenticated_user_can_list_categories(client, auth_headers):
    """The list endpoint should return items and pagination metadata."""
    created = create_category(client, auth_headers)
    assert created.status_code == 201

    response = client.get(CATEGORY_URL, headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()
    assert "items" in data
    assert "pagination" in data
    assert any(item["name"] == "Science" for item in data["items"])
    assert data["pagination"]["total"] == 1


def test_user_can_create_category(client, auth_headers):
    """A new category should belong to the authenticated user."""
    response = create_category(
        client,
        auth_headers,
        name="History",
        description="World history",
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["name"] == "History"
    assert data["description"] == "World history"
    assert "id" in data
    assert "created_at" in data


def test_category_creation_supports_icon_and_color(client, auth_headers):
    """Optional category presentation fields should be accepted."""
    response = create_category(
        client,
        auth_headers,
        name="Geography",
        icon="globe",
        color="#12ABef",
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["icon"] == "globe"
    assert data["color"].upper() == "#12ABEF"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 81},
        {"name": "Science", "description": "d" * 256},
        {"name": "Science", "icon": "i" * 41},
        {"name": "Science", "color": "red"},
        {"name": "Science", "color": "#12345"},
    ],
)
def test_category_creation_rejects_invalid_data(client, auth_headers, payload):
    """Invalid category fields should return a validation error."""
    response = client.post(CATEGORY_URL, headers=auth_headers, json=payload)

    assert response.status_code == 400
    assert response.get_json()["error"] == "Validation failed."


def test_category_creation_requires_json_content_type(client, auth_headers):
    response = client.post(
        CATEGORY_URL,
        headers={**auth_headers, "Content-Type": "text/plain"},
        data="name=Science",
    )

    assert response.status_code == 415
    assert "application/json" in response.get_json()["error"]


def test_category_creation_rejects_non_object_json(client, auth_headers):
    response = client.post(
        CATEGORY_URL,
        headers=auth_headers,
        json=["Science"],
    )

    assert response.status_code == 400
    assert "JSON object" in response.get_json()["error"]


def test_user_can_retrieve_category(client, auth_headers):
    created = create_category(client, auth_headers, name="Art")
    category_id = created.get_json()["id"]

    response = client.get(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["name"] == "Art"


def test_user_can_read_another_users_category(
    client, auth_headers, other_headers
):
    """Reading categories is allowed across owners."""
    created = create_category(client, other_headers, name="Other User Category")
    category_id = created.get_json()["id"]

    response = client.get(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["name"] == "Other User Category"


def test_retrieving_missing_category_returns_404(client, auth_headers):
    response = client.get(
        f"{CATEGORY_URL}/999999",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "Category not found."


def test_user_can_filter_own_categories(client, auth_headers, other_headers):
    create_category(client, auth_headers, name="My Category")
    create_category(client, other_headers, name="Their Category")

    response = client.get(
        f"{CATEGORY_URL}?mine=true",
        headers=auth_headers,
    )

    assert response.status_code == 200
    names = [item["name"] for item in response.get_json()["items"]]
    assert "My Category" in names
    assert "Their Category" not in names


def test_category_list_defaults_to_all_users(client, auth_headers, other_headers):
    create_category(client, auth_headers, name="Mine")
    create_category(client, other_headers, name="Theirs")

    response = client.get(CATEGORY_URL, headers=auth_headers)

    assert response.status_code == 200
    names = [item["name"] for item in response.get_json()["items"]]
    assert "Mine" in names
    assert "Theirs" in names


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
def test_category_list_rejects_invalid_pagination(
    client, auth_headers, query, message
):
    response = client.get(f"{CATEGORY_URL}{query}", headers=auth_headers)

    assert response.status_code == 400
    assert message in response.get_json()["error"]


def test_category_list_paginates_results(client, auth_headers):
    create_category(client, auth_headers, name="Category One")
    create_category(client, auth_headers, name="Category Two")
    create_category(client, auth_headers, name="Category Three")

    response = client.get(
        f"{CATEGORY_URL}?page=1&per_page=2",
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


def test_owner_can_patch_category(client, auth_headers):
    created = create_category(client, auth_headers, name="Old Name")
    category_id = created.get_json()["id"]

    response = client.patch(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
        json={"name": "New Name", "color": "#AABBCC"},
    )

    assert response.status_code == 200
    assert response.get_json()["name"] == "New Name"
    assert response.get_json()["color"] == "#AABBCC"


def test_owner_can_put_category(client, auth_headers):
    created = create_category(
        client,
        auth_headers,
        name="Before",
        description="Old description",
    )
    category_id = created.get_json()["id"]

    response = client.put(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
        json={"name": "After", "description": "New description"},
    )

    assert response.status_code == 200
    assert response.get_json()["name"] == "After"
    assert response.get_json()["description"] == "New description"


def test_user_cannot_update_another_users_category(
    client, auth_headers, other_headers
):
    created = create_category(client, other_headers, name="Owned by Other")
    category_id = created.get_json()["id"]

    response = client.patch(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
        json={"name": "Unauthorized Change"},
    )

    assert response.status_code == 403


def test_user_cannot_delete_another_users_category(
    client, auth_headers, other_headers
):
    created = create_category(client, other_headers, name="Protected")
    category_id = created.get_json()["id"]

    response = client.delete(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
    )

    assert response.status_code == 403


def test_owner_can_delete_category(client, auth_headers):
    created = create_category(client, auth_headers, name="To Delete")
    category_id = created.get_json()["id"]

    response = client.delete(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "Category deleted successfully."

    missing = client.get(
        f"{CATEGORY_URL}/{category_id}",
        headers=auth_headers,
    )
    assert missing.status_code == 404


def test_owner_cannot_patch_missing_category(client, auth_headers):
    response = client.patch(
        f"{CATEGORY_URL}/999999",
        headers=auth_headers,
        json={"name": "Missing"},
    )

    assert response.status_code == 404


def test_owner_cannot_delete_missing_category(client, auth_headers):
    response = client.delete(
        f"{CATEGORY_URL}/999999",
        headers=auth_headers,
    )

    assert response.status_code == 404
