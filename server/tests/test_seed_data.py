# Checks the seed content before it ever reaches the database: every
# question must pass the same model rules users' questions do.

import pytest
from flask import Flask

from models import Category, Question, db
from utils.seed_data import SEED_CATEGORIES


@pytest.fixture
def session():
    """A fresh, empty in-memory database for each test."""
    app = Flask(__name__)
    app.config.update(SQLALCHEMY_DATABASE_URI="sqlite:///:memory:", TESTING=True)
    db.init_app(app)

    with app.app_context():
        db.create_all()
        yield db.session
        db.session.remove()
        db.drop_all()


def build_categories():
    """Turn the seed dictionaries into Category and Question objects."""
    categories = []
    for data in SEED_CATEGORIES:
        category = Category(name=data["name"], description=data["description"])
        for question_data in data["questions"]:
            Question(**question_data, category=category)
        categories.append(category)
    return categories


def test_every_seed_question_passes_model_validation(session):
    session.add_all(build_categories())
    session.commit()  # raises if any question breaks a rule

    total = sum(len(data["questions"]) for data in SEED_CATEGORIES)
    assert Question.query.count() == total
    assert Category.query.count() == len(SEED_CATEGORIES)


def test_seed_category_names_are_unique():
    names = [data["name"] for data in SEED_CATEGORIES]
    assert len(names) == len(set(names))


def test_seed_question_texts_are_unique():
    texts = [q["text"] for data in SEED_CATEGORIES for q in data["questions"]]
    assert len(texts) == len(set(texts))


@pytest.mark.parametrize("data", SEED_CATEGORIES, ids=lambda d: d["name"])
def test_each_seed_category_covers_every_difficulty(data):
    difficulties = {q["difficulty"] for q in data["questions"]}
    assert difficulties == {"easy", "medium", "hard"}


def test_seed_includes_both_question_types():
    types = {q["question_type"] for data in SEED_CATEGORIES for q in data["questions"]}
    assert types == {"multiple", "boolean"}
