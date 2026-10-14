# Tests for the Category and Question models: saving, the relationship,
# every validation, and cascade deletes.
#
# Each test gets a brand-new in-memory SQLite database, so tests never touch
# your PostgreSQL data and never affect each other.

import pytest
from flask import Flask
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from models import Category, Question, db


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


def make_category(**overrides):
    fields = {"name": "Geography", "description": "Places and maps"}
    fields.update(overrides)
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


def test_category_names_are_unique(session):
    session.add(make_category(name="Science"))
    session.commit()

    session.add(make_category(name="Science"))
    with pytest.raises(IntegrityError):
        session.commit()


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
