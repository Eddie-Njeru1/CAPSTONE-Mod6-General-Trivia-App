# Tests for the quiz-attempt and leaderboard routes, using the real app
# (create_app) with an in-memory database and real signup tokens.

import pytest

from app import create_app
from config import TestConfig
from models import Category, User, db


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def sign_up(client, username="player1"):
    """Create an account and return the auth header for it."""
    response = client.post(
        "/api/auth/signup",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def valid_round(**overrides):
    body = {"score": 7, "total_questions": 10, "points": 120, "best_streak": 4}
    body.update(overrides)
    return body


# ---------- POST /api/quiz-attempts ----------


def test_saving_a_round_returns_it_with_201(client):
    headers = sign_up(client)

    response = client.post("/api/quiz-attempts", json=valid_round(), headers=headers)

    assert response.status_code == 201
    data = response.get_json()
    assert data["id"] is not None
    assert data["score"] == 7
    assert data["category_name"] == "Mixed"
    assert data["created_at"] is not None


def test_saving_a_round_requires_login(client):
    response = client.post("/api/quiz-attempts", json=valid_round())
    assert response.status_code == 401


def test_saving_a_round_for_a_category(client):
    headers = sign_up(client)
    owner = User.query.filter_by(username="player1").one()
    category = Category(name="Science", user=owner)
    db.session.add(category)
    db.session.commit()

    response = client.post(
        "/api/quiz-attempts",
        json=valid_round(category_id=category.id),
        headers=headers,
    )

    assert response.status_code == 201
    assert response.get_json()["category_name"] == "Science"


def test_unknown_category_returns_404(client):
    headers = sign_up(client)
    response = client.post(
        "/api/quiz-attempts", json=valid_round(category_id=999), headers=headers
    )
    assert response.status_code == 404


@pytest.mark.parametrize(
    "body, message",
    [
        ({"total_questions": 10}, "score is required"),
        ({"score": 5}, "total_questions is required"),
        (valid_round(score=-1), "score must be at least 0"),
        (valid_round(points="lots"), "points must be a whole number"),
        (valid_round(category_id="science"), "category_id must be a whole number"),
        (valid_round(score=11), "score can't be more than total_questions"),
        (valid_round(best_streak=9), "best_streak can't be more than score"),
    ],
)
def test_invalid_rounds_return_400_with_a_clear_message(client, body, message):
    headers = sign_up(client)

    response = client.post("/api/quiz-attempts", json=body, headers=headers)

    assert response.status_code == 400
    assert message in response.get_json()["error"]


def test_non_json_body_returns_400(client):
    headers = sign_up(client)
    response = client.post("/api/quiz-attempts", data="not json", headers=headers)
    assert response.status_code == 400


def test_a_failed_save_does_not_break_the_next_one(client):
    headers = sign_up(client)
    client.post("/api/quiz-attempts", json=valid_round(score=11), headers=headers)

    response = client.post("/api/quiz-attempts", json=valid_round(), headers=headers)

    assert response.status_code == 201


# ---------- GET /api/quiz-attempts ----------


def test_history_shows_only_my_rounds_newest_first(client):
    mine = sign_up(client, "player1")
    theirs = sign_up(client, "player2")
    client.post("/api/quiz-attempts", json=valid_round(score=3, best_streak=1), headers=mine)
    client.post("/api/quiz-attempts", json=valid_round(score=8, best_streak=2), headers=mine)
    client.post("/api/quiz-attempts", json=valid_round(score=10), headers=theirs)

    response = client.get("/api/quiz-attempts", headers=mine)

    assert response.status_code == 200
    assert [a["score"] for a in response.get_json()["items"]] == [8, 3]


def test_history_requires_login(client):
    assert client.get("/api/quiz-attempts").status_code == 401


# ---------- GET /api/leaderboard ----------


def test_leaderboard_is_public_and_ranked(client):
    alice = sign_up(client, "alice")
    brian = sign_up(client, "brian")
    client.post("/api/quiz-attempts", json=valid_round(points=50), headers=alice)
    client.post("/api/quiz-attempts", json=valid_round(points=90), headers=brian)

    response = client.get("/api/leaderboard")  # no token needed

    assert response.status_code == 200
    board = response.get_json()
    assert [row["username"] for row in board] == ["brian", "alice"]
    assert board[0]["rank"] == 1
    assert "email" not in board[0]  # never expose private details


def test_leaderboard_limit(client):
    for name in ("player1", "player2", "player3"):
        client.post("/api/quiz-attempts", json=valid_round(), headers=sign_up(client, name))

    assert len(client.get("/api/leaderboard?limit=2").get_json()) == 2


@pytest.mark.parametrize("bad_limit", ["0", "-3", "ten"])
def test_leaderboard_rejects_a_bad_limit(client, bad_limit):
    response = client.get(f"/api/leaderboard?limit={bad_limit}")
    assert response.status_code == 400


# ---------- pagination of GET /api/quiz-attempts ----------


def test_history_is_paginated(client):
    headers = sign_up(client)
    for score in range(1, 6):  # 5 rounds, scores 1..5
        client.post(
            "/api/quiz-attempts",
            json=valid_round(score=score, best_streak=1),
            headers=headers,
        )

    first = client.get("/api/quiz-attempts?page=1&per_page=2", headers=headers).get_json()
    last = client.get("/api/quiz-attempts?page=3&per_page=2", headers=headers).get_json()

    assert [a["score"] for a in first["items"]] == [5, 4]  # newest first
    assert (first["page"], first["per_page"], first["total"], first["pages"]) == (1, 2, 5, 3)
    assert [a["score"] for a in last["items"]] == [1]


def test_history_page_past_the_end_is_empty_not_an_error(client):
    headers = sign_up(client)
    response = client.get("/api/quiz-attempts?page=99", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["items"] == []


@pytest.mark.parametrize("query", ["page=0", "page=two", "per_page=-1"])
def test_history_rejects_bad_page_numbers(client, query):
    headers = sign_up(client)
    response = client.get(f"/api/quiz-attempts?{query}", headers=headers)
    assert response.status_code == 400


def test_history_caps_per_page(client):
    headers = sign_up(client)
    response = client.get("/api/quiz-attempts?per_page=1000", headers=headers)
    assert response.get_json()["per_page"] == 50
