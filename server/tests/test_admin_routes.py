"""Tests for the administrator API: access control, statistics, and users."""

import pytest

from models import User, db


ADMIN_URL = "/api/admin"


# ---------------------------------------------------------------------------
# Authentication and authorization
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "endpoint",
    [
        "/stats",
        "/users",
        "/categories",
        "/questions",
    ],
)
def test_admin_endpoints_require_authentication(client, endpoint):
    """Requests without a JWT must not access administrator endpoints."""
    response = client.get(f"{ADMIN_URL}{endpoint}")

    assert response.status_code == 401


def test_regular_user_cannot_access_admin_stats(client, auth_headers):
    """An authenticated non-admin must be denied administrator access."""
    response = client.get(
        f"{ADMIN_URL}/stats",
        headers=auth_headers,
    )

    assert response.status_code == 403


def test_regular_user_cannot_list_admin_users(client, auth_headers):
    response = client.get(
        f"{ADMIN_URL}/users",
        headers=auth_headers,
    )

    assert response.status_code == 403


def test_regular_user_cannot_update_another_user(
    client,
    auth_headers,
    other_user,
):
    response = client.patch(
        f"{ADMIN_URL}/users/{other_user.id}",
        headers=auth_headers,
        json={"role": "admin"},
    )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Dashboard statistics
# ---------------------------------------------------------------------------

def test_admin_stats_returns_expected_counts(
    client,
    admin_headers,
    admin_user,
    other_user,
    inactive_user,
):
    """Dashboard counts should reflect the database records."""
    response = client.get(
        f"{ADMIN_URL}/stats",
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["total_users"] == 3
    assert data["active_users"] == 2
    assert data["inactive_users"] == 1
    assert data["admin_users"] == 1
    assert data["total_categories"] == 0
    assert data["total_questions"] == 0


# ---------------------------------------------------------------------------
# User listing, filters, and pagination
# ---------------------------------------------------------------------------

def test_admin_can_list_users(client, admin_headers, admin_user, other_user):
    response = client.get(
        f"{ADMIN_URL}/users",
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.get_json()
    usernames = [user["username"] for user in data["users"]]

    assert admin_user.username in usernames
    assert other_user.username in usernames
    assert data["pagination"]["total"] == 2
    assert data["pagination"]["page"] == 1

    # Sensitive password hashes must never be exposed by the API.
    assert all("password_hash" not in user for user in data["users"])


def test_admin_can_filter_users_by_role(
    client,
    admin_headers,
    admin_user,
    other_user,
):
    response = client.get(
        f"{ADMIN_URL}/users?role=admin",
        headers=admin_headers,
    )

    assert response.status_code == 200

    users = response.get_json()["users"]

    assert users
    assert all(user["role"] == "admin" for user in users)
    assert admin_user.username in [user["username"] for user in users]
    assert other_user.username not in [user["username"] for user in users]


def test_admin_can_filter_users_by_active_status(
    client,
    admin_headers,
    other_user,
    inactive_user,
):
    response = client.get(
        f"{ADMIN_URL}/users?is_active=false",
        headers=admin_headers,
    )

    assert response.status_code == 200

    users = response.get_json()["users"]

    assert [user["username"] for user in users] == [inactive_user.username]
    assert all(user["is_active"] is False for user in users)


def test_admin_can_search_users_by_username(
    client,
    admin_headers,
    other_user,
):
    response = client.get(
        f"{ADMIN_URL}/users?search=sam",
        headers=admin_headers,
    )

    assert response.status_code == 200

    users = response.get_json()["users"]

    assert any(user["username"] == other_user.username for user in users)
    assert all(
        "sam" in user["username"].lower()
        or "sam" in user["email"].lower()
        for user in users
    )


@pytest.mark.parametrize(
    ("query_string", "expected_message"),
    [
        ("?role=superuser", "role"),
        ("?is_active=sometimes", "is_active"),
        ("?page=0", "page"),
        ("?page=abc", "page"),
        ("?per_page=0", "per_page"),
        ("?per_page=101", "per_page"),
    ],
)
def test_admin_user_list_rejects_invalid_filters_and_pagination(
    client,
    admin_headers,
    query_string,
    expected_message,
):
    response = client.get(
        f"{ADMIN_URL}/users{query_string}",
        headers=admin_headers,
    )

    assert response.status_code == 400
    assert expected_message in response.get_json()["error"]


def test_admin_user_list_paginates_results(
    client,
    admin_headers,
    make_user,
):
    make_user("reader1", "reader1@email.com")
    make_user("reader2", "reader2@email.com")

    response = client.get(
        f"{ADMIN_URL}/users?page=1&per_page=1",
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.get_json()

    assert len(data["users"]) == 1
    assert data["pagination"]["per_page"] == 1
    assert data["pagination"]["total"] == 3
    assert data["pagination"]["pages"] == 3
    assert data["pagination"]["has_next"] is True
    assert data["pagination"]["has_prev"] is False


# ---------------------------------------------------------------------------
# Administrator user updates
# ---------------------------------------------------------------------------

def test_admin_can_promote_regular_user(
    client,
    admin_headers,
    other_user,
    app,
):
    response = client.patch(
        f"{ADMIN_URL}/users/{other_user.id}",
        headers=admin_headers,
        json={"role": "admin"},
    )

    assert response.status_code == 200
    assert response.get_json()["role"] == "admin"

    with app.app_context():
        updated_user = db.session.get(User, other_user.id)
        assert updated_user.role == "admin"


def test_admin_can_deactivate_another_user(
    client,
    admin_headers,
    other_user,
    app,
):
    response = client.patch(
        f"{ADMIN_URL}/users/{other_user.id}",
        headers=admin_headers,
        json={"is_active": False},
    )

    assert response.status_code == 200
    assert response.get_json()["is_active"] is False

    with app.app_context():
        updated_user = db.session.get(User, other_user.id)
        assert updated_user.is_active is False


def test_admin_cannot_remove_own_admin_role(
    client,
    admin_headers,
    admin_user,
):
    response = client.patch(
        f"{ADMIN_URL}/users/{admin_user.id}",
        headers=admin_headers,
        json={"role": "user"},
    )

    assert response.status_code == 400
    assert "own admin role" in response.get_json()["error"]


def test_admin_cannot_deactivate_own_account(
    client,
    admin_headers,
    admin_user,
):
    response = client.patch(
        f"{ADMIN_URL}/users/{admin_user.id}",
        headers=admin_headers,
        json={"is_active": False},
    )

    assert response.status_code == 400
    assert "own account" in response.get_json()["error"]


def test_admin_update_rejects_invalid_role(
    client,
    admin_headers,
    other_user,
):
    response = client.patch(
        f"{ADMIN_URL}/users/{other_user.id}",
        headers=admin_headers,
        json={"role": "superuser"},
    )

    assert response.status_code == 422


def test_admin_update_returns_404_for_missing_user(
    client,
    admin_headers,
):
    response = client.patch(
        f"{ADMIN_URL}/users/999999",
        headers=admin_headers,
        json={"is_active": False},
    )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Administrator user deletion
# ---------------------------------------------------------------------------

def test_admin_cannot_delete_own_account(
    client,
    admin_headers,
    admin_user,
):
    response = client.delete(
        f"{ADMIN_URL}/users/{admin_user.id}",
        headers=admin_headers,
    )

    assert response.status_code == 400
    assert "own account" in response.get_json()["error"]


def test_admin_can_delete_another_regular_user(
    client,
    admin_headers,
    other_user,
    app,
):
    user_id = other_user.id

    response = client.delete(
        f"{ADMIN_URL}/users/{user_id}",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["id"] == user_id

    with app.app_context():
        assert db.session.get(User, user_id) is None


def test_admin_delete_returns_404_for_missing_user(
    client,
    admin_headers,
):
    response = client.delete(
        f"{ADMIN_URL}/users/999999",
        headers=admin_headers,
    )

    assert response.status_code == 404
