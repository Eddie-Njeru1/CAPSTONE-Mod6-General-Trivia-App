# Fills the database with starter content: one demo user who owns the
# 8 seed categories and their 80 questions (from utils/seed_data.py).
# Phase 3: categories also get their icon and colour. Categories seeded
# before Phase 3 get them filled in (only if empty, never overwritten).
# Safe to run more than once: anything that already exists is skipped, so running it again never creates duplicates or crashes.
# It can also create the admin account from ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD (see get_or_create_admin). `flask create-admin` uses the same function.
# Run from the server/ folder:
# pipenv run python -m utils.seed

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


def get_or_create_admin():
    """Return the admin from the ADMIN_* environment variables, creating it
    the first time. Raises ValueError if it can't be done safely.

    An existing account is never promoted or changed: if someone signed up
    with the admin's email first, promoting them would hand over admin access.
    """
    username = os.environ.get("ADMIN_USERNAME", "").strip()
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not (username and email and password):
        raise ValueError("Set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD first")

    user = User.query.filter_by(email=email).first()
    if user:
        if user.role != "admin":  # a regular account already uses this email
            raise ValueError(
                "That email already belongs to a regular user, so it was not promoted to admin"
            )
        return user, False  # the admin already exists, nothing to do

    if User.query.filter_by(username=username).first():
        raise ValueError("That username is already taken")

    user = User(username=username, email=email)
    user.set_password(password)  # stores a bcrypt hash, never the password
    user.role = "admin"
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
                name=data["name"],
                description=data["description"],
                icon=data["icon"],
                color=data["color"],
                user=owner,
            )
            db.session.add(category)
            added["categories"] += 1
        else:
            # Seeded before Phase 3: fill in the icon and colour if still empty.
            if category.icon is None:
                category.icon = data["icon"]
            if category.color is None:
                category.color = data["color"]

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

        # Create the admin too, but only when all three ADMIN_* variables are set.
        if all(os.environ.get(n) for n in ("ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD")):
            admin, created = get_or_create_admin()
            db.session.commit()
            print(f"Admin '{admin.username}' {'created' if created else 'already exists'}.")
