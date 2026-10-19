# Fills the database with starter content: one demo user who owns the
# 6 seed categories and their 30 questions (from utils/seed_data.py).
#
# Safe to run more than once: anything that already exists is skipped,
# so running it again never creates duplicates or crashes.
#
# Run from the server/ folder:
#     pipenv run python -m utils.seed

import os

from models import Category, Question, User, db
from utils.seed_data import SEED_CATEGORIES

DEMO_USERNAME = "demo"
DEMO_EMAIL = "demo@trivia.app"
# Development only. Set SEED_DEMO_PASSWORD in .env to use your own.
DEMO_PASSWORD = os.environ.get("SEED_DEMO_PASSWORD", "demo-password-123")


def get_or_create_demo_user():
    """Return the demo user, creating it the first time."""
    user = User.query.filter_by(email=DEMO_EMAIL).first()
    if user:
        return user, False

    user = User(username=DEMO_USERNAME, email=DEMO_EMAIL)
    user.set_password(DEMO_PASSWORD)  # stores a bcrypt hash, never the password
    db.session.add(user)
    return user, True


def seed_database():
    """Add any missing seed rows. Returns how many of each were added."""
    added = {"users": 0, "categories": 0, "questions": 0}

    owner, created = get_or_create_demo_user()
    added["users"] += int(created)

    for data in SEED_CATEGORIES:
        # Look up by owner + name: the same pair the unique rule protects.
        category = Category.query.filter_by(user=owner, name=data["name"]).first()
        if category is None:
            category = Category(
                name=data["name"], description=data["description"], user=owner
            )
            db.session.add(category)
            added["categories"] += 1

        existing_texts = {question.text for question in category.questions}
        for question_data in data["questions"]:
            if question_data["text"] not in existing_texts:
                # Append through the category (already in the session), so
                # the new question is saved with it.
                category.questions.append(Question(**question_data))
                added["questions"] += 1

    # One commit at the end: if anything fails, nothing is half-saved.
    db.session.commit()
    return added


if __name__ == "__main__":
    from app import create_app

    app = create_app()
    with app.app_context():
        added = seed_database()
        print(
            f"Seed complete: added {added['users']} user(s), "
            f"{added['categories']} categories, {added['questions']} questions."
        )
        print(
            f"Database now has {User.query.count()} user(s), "
            f"{Category.query.count()} categories, {Question.query.count()} questions."
        )
