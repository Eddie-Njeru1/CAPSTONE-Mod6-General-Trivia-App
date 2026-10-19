# Checks the seed content before it ever reaches the database: every
# question must pass the same model rules users' questions do.

import pytest
from flask import Flask

from models import Category, Question, User, db
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


def build_categories(owner):
    """Turn the seed dictionaries into Category and Question objects."""
    categories = []
    for data in SEED_CATEGORIES:
        category = Category(
            name=data["name"], description=data["description"], user=owner
        )
        for question_data in data["questions"]:
            Question(**question_data, category=category)
        categories.append(category)
    return categories


def test_every_seed_question_passes_model_validation(session):
    owner = User(username="demo", email="demo@example.com", password_hash="x")
    session.add_all(build_categories(owner))
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


# ---------- seed.py (the loader) ----------

from utils.seed import DEMO_EMAIL, DEMO_PASSWORD, seed_database


def test_seed_loads_demo_user_and_all_content(session):
    added = seed_database()

    total = sum(len(data["questions"]) for data in SEED_CATEGORIES)
    assert added == {"users": 1, "categories": len(SEED_CATEGORIES), "questions": total}

    demo = User.query.filter_by(email=DEMO_EMAIL).one()
    assert demo.check_password(DEMO_PASSWORD)  # stored as a hash, still works
    assert len(demo.categories) == len(SEED_CATEGORIES)


def test_seed_is_safe_to_run_twice(session):
    seed_database()
    second_run = seed_database()

    assert second_run == {"users": 0, "categories": 0, "questions": 0}
    assert User.query.count() == 1
    assert Question.query.count() == sum(len(d["questions"]) for d in SEED_CATEGORIES)
