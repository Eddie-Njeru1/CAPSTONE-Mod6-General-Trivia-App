# Tests for the Category, Question and QuizAttempt models: saving,
# relationships, ownership, every validation, and cascade deletes.
#
# Each test gets a brand-new in-memory SQLite database, so tests never touch
# your PostgreSQL data and never affect each other.

from itertools import count

import pytest
from flask import Flask
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from models import Category, Question, QuizAttempt, User, db


# ---------- fixtures and helpers ----------


@pytest.fixture
def session():
    """A fresh, empty database for each test; wiped afterwards."""
    app = Flask(__name__)
    app.config.update(SQLALCHEMY_DATABASE_URI="sqlite:///:memory:", TESTING=True)
    db.init_app(app)

    with app.app_context():
        db.create_all()
        yield db.session
        db.session.remove()
        db.drop_all()


_user_numbers = count(1)


def make_user(**overrides):
    """A valid user with a unique username and email each time."""
    n = next(_user_numbers)
    fields = {
        "username": f"player{n}",
        "email": f"player{n}@example.com",
        # Model tests don't need real hashing; auth tests cover set_password.
        "password_hash": "not-a-real-hash",
    }
    fields.update(overrides)
    return User(**fields)


def make_category(**overrides):
    """A valid category, owned by a brand-new user unless one is given."""
    fields = {"name": "Geography", "description": "Places and maps"}
    fields.update(overrides)
    fields.setdefault("user", make_user())
    return Category(**fields)


def make_question(**overrides):
    """A valid multiple-choice question; override any field to test a rule."""
    fields = {
        "text": "What is the capital of Kenya?",
        "question_type": "multiple",
        "difficulty": "easy",
        "correct_answer": "Nairobi",
        "incorrect_answers": ["Mombasa", "Kisumu", "Nakuru"],
    }
    fields.update(overrides)
    return Question(**fields)


# ---------- Category ----------


def test_category_saves_with_trimmed_name(session):
    category = make_category(name="  Geography  ")
    session.add(category)
    session.commit()

    assert category.id is not None
    assert category.name == "Geography"


@pytest.mark.parametrize("bad_name", [None, "", "   "])
def test_category_name_is_required(bad_name):
    with pytest.raises(ValueError, match="name is required"):
        make_category(name=bad_name)


def test_category_name_has_a_maximum_length():
    with pytest.raises(ValueError, match="80 characters or fewer"):
        make_category(name="x" * 81)


def test_one_user_cannot_have_two_categories_with_the_same_name(session):
    owner = make_user()
    session.add(make_category(name="Science", user=owner))
    session.commit()

    session.add(make_category(name="Science", user=owner))
    with pytest.raises(IntegrityError):
        session.commit()


def test_different_users_can_use_the_same_category_name(session):
    session.add_all([make_category(name="Science"), make_category(name="Science")])
    session.commit()

    assert Category.query.filter_by(name="Science").count() == 2


def test_category_must_have_an_owner(session):
    session.add(Category(name="Orphan"))  # no user
    with pytest.raises(IntegrityError):
        session.commit()


def test_category_and_owner_are_linked_both_ways(session):
    owner = make_user()
    category = make_category(user=owner)
    session.add(category)
    session.commit()

    assert category.user is owner
    assert category.user_id == owner.id
    assert owner.categories == [category]


def test_blank_description_is_stored_as_none(session):
    category = make_category(description="   ")
    session.add(category)
    session.commit()

    assert category.description is None


def test_timestamps_are_set_automatically(session):
    category = make_category()
    session.add(category)
    session.commit()

    assert category.created_at is not None
    assert category.updated_at is not None


# ---------- Question: saving and the relationship ----------


def test_multiple_choice_question_saves(session):
    question = make_question(category=make_category())
    session.add(question)
    session.commit()

    assert question.id is not None
    assert question.incorrect_answers == ["Mombasa", "Kisumu", "Nakuru"]


def test_true_false_question_saves(session):
    question = make_question(
        text="The Nile is in Africa.",
        question_type="boolean",
        correct_answer="True",
        incorrect_answers=["False"],
        category=make_category(),
    )
    session.add(question)
    session.commit()

    assert question.id is not None


def test_question_and_category_are_linked_both_ways(session):
    category = make_category()
    question = make_question(category=category)
    session.add(category)
    session.commit()

    assert question.category is category
    assert question.category_id == category.id
    assert category.questions == [question]


def test_question_text_and_answers_are_trimmed(session):
    question = make_question(
        text="  What is the capital of Kenya?  ",
        correct_answer=" Nairobi ",
        incorrect_answers=[" Mombasa", "Kisumu ", " Nakuru "],
        category=make_category(),
    )
    session.add(question)
    session.commit()

    assert question.text == "What is the capital of Kenya?"
    assert question.correct_answer == "Nairobi"
    assert question.incorrect_answers == ["Mombasa", "Kisumu", "Nakuru"]


def test_question_must_belong_to_a_category(session):
    session.add(make_question())  # no category
    with pytest.raises(IntegrityError):
        session.commit()


# ---------- Question: single-field validation (@validates) ----------


@pytest.mark.parametrize("bad_difficulty", ["impossible", "Easy", "", None])
def test_difficulty_must_be_easy_medium_or_hard(bad_difficulty):
    with pytest.raises(ValueError, match="Difficulty must be one of"):
        make_question(difficulty=bad_difficulty)


@pytest.mark.parametrize("bad_type", ["open", "", None])
def test_question_type_must_be_multiple_or_boolean(bad_type):
    with pytest.raises(ValueError, match="Question type must be one of"):
        make_question(question_type=bad_type)


@pytest.mark.parametrize("bad_text", [None, "", "   "])
def test_question_text_is_required(bad_text):
    with pytest.raises(ValueError, match="Question text is required"):
        make_question(text=bad_text)


def test_question_text_has_a_maximum_length():
    with pytest.raises(ValueError, match="500 characters or fewer"):
        make_question(text="x" * 501)


@pytest.mark.parametrize("bad_answers", [[], "Mombasa", None])
def test_incorrect_answers_must_be_a_non_empty_list(bad_answers):
    with pytest.raises(ValueError, match="non-empty list"):
        make_question(incorrect_answers=bad_answers)


def test_incorrect_answers_must_not_repeat():
    with pytest.raises(ValueError, match="must not repeat"):
        make_question(incorrect_answers=["Mombasa", "Mombasa", "Kisumu"])


# ---------- Question: cross-field rules (checked on save) ----------


def test_multiple_choice_needs_exactly_three_incorrect_answers(session):
    session.add(make_question(incorrect_answers=["Mombasa"], category=make_category()))
    with pytest.raises(ValueError, match="exactly 3 incorrect answers"):
        session.commit()


def test_correct_answer_cannot_also_be_incorrect(session):
    question = make_question(
        incorrect_answers=["Nairobi", "Kisumu", "Nakuru"], category=make_category()
    )
    session.add(question)
    with pytest.raises(ValueError, match="can't also be an incorrect answer"):
        session.commit()


def test_true_false_answer_must_be_true_or_false(session):
    question = make_question(
        question_type="boolean",
        correct_answer="Yes",
        incorrect_answers=["No"],
        category=make_category(),
    )
    session.add(question)
    with pytest.raises(ValueError, match='must be "True" or "False"'):
        session.commit()


def test_true_false_incorrect_answer_must_be_the_opposite(session):
    question = make_question(
        question_type="boolean",
        correct_answer="True",
        incorrect_answers=["Maybe"],
        category=make_category(),
    )
    session.add(question)
    with pytest.raises(ValueError, match="incorrect answer must be"):
        session.commit()


def test_rules_are_checked_again_when_a_question_is_edited(session):
    question = make_question(category=make_category())
    session.add(question)
    session.commit()

    question.incorrect_answers = ["Mombasa", "Kisumu"]  # now only 2
    with pytest.raises(ValueError, match="exactly 3 incorrect answers"):
        session.commit()


# ---------- database-level protection ----------


def test_database_rejects_invalid_difficulty_even_with_raw_sql(session):
    category = make_category()
    session.add(category)
    session.commit()

    # Raw SQL skips @validates entirely; the CHECK constraint still stops it.
    with pytest.raises(IntegrityError):
        session.execute(
            text(
                "INSERT INTO questions (text, question_type, difficulty, "
                "correct_answer, incorrect_answers, category_id) "
                "VALUES ('Q?', 'multiple', 'impossible', 'A', '[\"B\",\"C\",\"D\"]', :cid)"
            ),
            {"cid": category.id},
        )


# ---------- cascade delete ----------


def test_deleting_a_user_deletes_their_categories_and_questions(session):
    owner = make_user()
    make_question(category=make_category(user=owner))
    session.add(owner)
    session.commit()

    session.delete(owner)
    session.commit()

    assert Category.query.count() == 0
    assert Question.query.count() == 0


def test_deleting_a_category_deletes_its_questions(session):
    category = make_category()
    make_question(category=category)
    make_question(text="Largest lake in Kenya?", correct_answer="Turkana",
                  incorrect_answers=["Naivasha", "Nakuru", "Baringo"], category=category)
    session.add(category)
    session.commit()
    assert Question.query.count() == 2

    session.delete(category)
    session.commit()

    assert Question.query.count() == 0


# ---------- QuizAttempt ----------


def make_attempt(**overrides):
    """A valid finished round: 7 of 10 correct, best streak of 4."""
    fields = {"score": 7, "total_questions": 10, "points": 120, "best_streak": 4}
    fields.update(overrides)
    fields.setdefault("user", make_user())
    return QuizAttempt(**fields)


def test_quiz_attempt_saves_and_links_to_user_and_category(session):
    category = make_category()
    attempt = make_attempt(user=category.user, category=category)
    session.add(attempt)
    session.commit()

    assert attempt.id is not None
    assert attempt.created_at is not None
    assert category.user.quiz_attempts == [attempt]
    assert category.quiz_attempts == [attempt]


def test_mixed_round_has_no_category(session):
    attempt = make_attempt()  # no category = Mixed round
    session.add(attempt)
    session.commit()

    assert attempt.category_id is None


def test_deleting_a_category_keeps_its_attempts(session):
    category = make_category()
    session.add(make_attempt(user=category.user, category=category))
    session.commit()

    session.delete(category)
    session.commit()

    attempt = QuizAttempt.query.one()
    assert attempt.category_id is None  # history survives


def test_deleting_a_user_deletes_their_attempts(session):
    owner = make_user()
    session.add(make_attempt(user=owner))
    session.commit()

    session.delete(owner)
    session.commit()

    assert QuizAttempt.query.count() == 0


@pytest.mark.parametrize("field", ["score", "points", "best_streak"])
@pytest.mark.parametrize("bad_value", [-1, 1.5, "7", True, None])
def test_attempt_numbers_must_be_non_negative_whole_numbers(field, bad_value):
    with pytest.raises(ValueError):
        make_attempt(**{field: bad_value})


@pytest.mark.parametrize("bad_total", [0, -5])
def test_attempt_needs_at_least_one_question(bad_total):
    with pytest.raises(ValueError, match="total_questions must be at least 1"):
        make_attempt(total_questions=bad_total)


def test_score_cannot_exceed_total_questions(session):
    session.add(make_attempt(score=11, total_questions=10, best_streak=4))
    with pytest.raises(ValueError, match="score can't be more than total_questions"):
        session.commit()


def test_best_streak_cannot_exceed_score(session):
    session.add(make_attempt(score=3, best_streak=5))
    with pytest.raises(ValueError, match="best_streak can't be more than score"):
        session.commit()


def test_database_rejects_impossible_score_even_with_raw_sql(session):
    owner = make_user()
    session.add(owner)
    session.commit()

    with pytest.raises(IntegrityError):
        session.execute(
            text(
                "INSERT INTO quiz_attempts (user_id, score, total_questions, points, best_streak) "
                "VALUES (:uid, 15, 10, 0, 0)"
            ),
            {"uid": owner.id},
        )


# ---------- QuizAttempt.leaderboard ----------


def test_leaderboard_ranks_players_by_total_points(session):
    alice, brian = make_user(username="alice"), make_user(username="brian")
    session.add_all([
        make_attempt(user=alice, points=100, best_streak=3),
        make_attempt(user=alice, points=50, best_streak=5),
        make_attempt(user=brian, points=120, best_streak=2),
    ])
    session.commit()

    board = QuizAttempt.leaderboard()

    assert board == [
        {"rank": 1, "username": "alice", "total_points": 150,
         "games_played": 2, "best_streak": 5},
        {"rank": 2, "username": "brian", "total_points": 120,
         "games_played": 1, "best_streak": 2},
    ]


def test_leaderboard_breaks_ties_by_fewer_games(session):
    alice, brian = make_user(username="alice"), make_user(username="brian")
    session.add_all([
        make_attempt(user=alice, points=50),
        make_attempt(user=alice, points=50),
        make_attempt(user=brian, points=100),  # same total in one game
    ])
    session.commit()

    assert [row["username"] for row in QuizAttempt.leaderboard()] == ["brian", "alice"]


def test_leaderboard_respects_the_limit_and_skips_players_with_no_games(session):
    session.add(make_user(username="nogames"))
    session.add_all([make_attempt(points=p) for p in (10, 20, 30)])
    session.commit()

    board = QuizAttempt.leaderboard(limit=2)

    assert [row["total_points"] for row in board] == [30, 20]
    assert "nogames" not in [row["username"] for row in board]


# =====================================================================
# Phase 3: user roles and login tracking, category icon/color, blocklist
# =====================================================================

from datetime import datetime, timedelta, timezone

from models import TokenBlocklist


# ---------- User: role, is_active, login tracking ----------


def test_new_user_gets_safe_defaults(session):
    user = make_user()
    session.add(user)
    session.commit()

    assert user.role == "user"
    assert user.is_active is True
    assert user.login_count == 0
    assert user.last_login_at is None
    assert user.is_admin is False


def test_user_can_be_made_admin(session):
    user = make_user(role="admin")
    session.add(user)
    session.commit()

    assert user.role == "admin"
    assert user.is_admin is True


@pytest.mark.parametrize("bad_role", ["boss", "Admin", "", None])
def test_role_must_be_user_or_admin(bad_role):
    with pytest.raises(ValueError, match="role must be one of"):
        make_user(role=bad_role)


@pytest.mark.parametrize("bad_value", [1, 0, "yes", None])
def test_is_active_must_be_true_or_false(bad_value):
    with pytest.raises(ValueError, match="is_active must be true or false"):
        make_user(is_active=bad_value)


@pytest.mark.parametrize("bad_count", [-1, 1.5, "3", True, None])
def test_login_count_must_be_a_non_negative_whole_number(bad_count):
    with pytest.raises(ValueError, match="login_count must be a whole number"):
        make_user(login_count=bad_count)


def test_login_tracking_fields_can_be_updated(session):
    user = make_user()
    session.add(user)
    session.commit()

    user.login_count += 1
    user.last_login_at = datetime(2026, 10, 27, 9, 30)
    session.commit()

    assert user.login_count == 1
    assert user.last_login_at == datetime(2026, 10, 27, 9, 30)


def test_database_rejects_an_unknown_role_even_with_raw_sql(session):
    user = make_user()
    session.add(user)
    session.commit()

    with pytest.raises(IntegrityError):
        session.execute(text("UPDATE users SET role = 'boss' WHERE id = :id"), {"id": user.id})


# ---------- Category: icon and color ----------


def test_category_icon_and_color_are_optional(session):
    category = make_category()
    session.add(category)
    session.commit()

    assert category.icon is None
    assert category.color is None


def test_category_icon_and_color_are_cleaned(session):
    category = make_category(icon="  Globe ", color="#2e86c1")
    session.add(category)
    session.commit()

    assert category.icon == "globe"
    assert category.color == "#2E86C1"  # stored in one consistent form


@pytest.mark.parametrize("blank", ["", "   ", None])
def test_blank_icon_and_color_are_stored_as_none(blank):
    category = make_category(icon=blank, color=blank)
    assert category.icon is None
    assert category.color is None


@pytest.mark.parametrize("bad_icon", ["globe icon", "globe!", "x" * 41])
def test_icon_must_be_a_short_simple_key(bad_icon):
    with pytest.raises(ValueError, match="Icon must"):
        make_category(icon=bad_icon)


@pytest.mark.parametrize("bad_color", ["2E86C1", "#2E86C", "#2E86C1F", "#GGGGGG", "blue"])
def test_color_must_be_a_hex_code(bad_color):
    with pytest.raises(ValueError, match="Color must be a hex colour"):
        make_category(color=bad_color)


def test_database_rejects_a_short_color_even_with_raw_sql(session):
    category = make_category()
    session.add(category)
    session.commit()

    with pytest.raises(IntegrityError):
        session.execute(
            text("UPDATE categories SET color = '#FFF' WHERE id = :id"), {"id": category.id}
        )


# ---------- TokenBlocklist ----------


def in_one_hour():
    return datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)


def test_revoked_token_is_found(session):
    TokenBlocklist.revoke("abc-123", in_one_hour())
    session.commit()

    assert TokenBlocklist.is_revoked("abc-123") is True
    assert TokenBlocklist.is_revoked("some-other-token") is False


def test_revoking_the_same_token_twice_keeps_one_row(session):
    TokenBlocklist.revoke("abc-123", in_one_hour())
    TokenBlocklist.revoke("abc-123", in_one_hour())
    session.commit()

    assert TokenBlocklist.query.count() == 1


def test_jti_must_be_unique_in_the_database(session):
    session.add_all([
        TokenBlocklist(jti="dup", expires_at=in_one_hour()),
        TokenBlocklist(jti="dup", expires_at=in_one_hour()),
    ])
    with pytest.raises(IntegrityError):
        session.commit()


@pytest.mark.parametrize("jti, expires_at", [("", in_one_hour()), ("abc", None), ("abc", "tomorrow")])
def test_revoke_needs_a_jti_and_an_expiry_time(jti, expires_at):
    with pytest.raises(ValueError):
        TokenBlocklist.revoke(jti, expires_at)


def test_remove_expired_deletes_only_old_tokens(session):
    now = datetime(2026, 10, 27, 12, 0)
    TokenBlocklist.revoke("expired", now - timedelta(minutes=1))
    TokenBlocklist.revoke("still-valid", now + timedelta(minutes=30))
    session.commit()

    removed = TokenBlocklist.remove_expired(now=now)
    session.commit()

    assert removed == 1
    assert TokenBlocklist.is_revoked("expired") is False
    assert TokenBlocklist.is_revoked("still-valid") is True


def test_blocklist_entry_gets_a_created_at_time(session):
    entry = TokenBlocklist.revoke("abc-123", in_one_hour())
    session.commit()

    assert entry.created_at is not None
