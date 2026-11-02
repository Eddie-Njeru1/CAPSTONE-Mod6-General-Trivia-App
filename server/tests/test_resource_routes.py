# Model-level tests for resource ownership and cascade deletes.
# Route behaviour (status codes, permissions, responses) lives in test_category_routes.py and test_question_routes.py, so nothing here calls an API route.
# Covers:
# - Ownership: a category belongs to one user, and a question belongs to one category.
# - Cascades: deleting a user, a category or a question removes (or keeps) the right rows.
# - Database-level rules: the same delete rules when the database itself enforces them as PostgreSQL does in production. SQLite ignores them unless foreign keys are switched on.

import pytest # test tools
from sqlalchemy import text # run the raw PRAGMA statement
from sqlalchemy.exc import IntegrityError # raised when the database rejects a row
from models import Category, Question, QuizAttempt, User, db # the models and the database object

# Small helpers that build valid rows (conftest.make_user builds users)
# Create and save a category for a user.
def make_category(owner, name="Science", **extra):
    category = Category(name=name, user_id=owner.id, **extra)
    db.session.add(category)
    db.session.commit()
    return category

# Create and save a question under a category.
def make_question(category, text="What is H2O?", **extra):
    fields = {
        "text": text,
        "question_type": "multiple",
        "difficulty": "easy",
        "correct_answer": "Water",
        "incorrect_answers": ["Salt", "Sand", "Air"], # multiple choice needs exactly 3
        "category_id": category.id,
    }
    fields.update(extra)
    question = Question(**fields)
    db.session.add(question)
    db.session.commit()
    return question

# Create and save a quiz attempt. A missing category represents a Mixed round.
def make_attempt(user, category=None, **extra):
    fields = {"score": 2, "total_questions": 3, "points": 20, "best_streak": 1}
    fields.update(extra)
    attempt = QuizAttempt(
        user_id=user.id,
        category_id=category.id if category else None, # None is a Mixed round
        **fields,
    )
    db.session.add(attempt)
    db.session.commit()
    return attempt

# Return the number of records in a model.
def count(model):
    return db.session.query(model).count()

# Category Ownership 
class TestCategoryOwnership:
     # A category belongs to the user who created it.
    def test_category_belongs_to_its_owner(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        assert category.user_id == owner.id
        assert category.user is owner

     # Each user should only see their own categories.
    def test_user_lists_only_their_own_categories(self, make_user, other_user):
        owner = make_user("owner", "owner@email.com")
        mine = make_category(owner, "Mine")
        theirs = make_category(other_user, "Theirs")
        assert owner.categories == [mine]
        assert other_user.categories == [theirs]

    # Different users can use the same category name.
    def test_two_users_can_each_have_a_category_with_the_same_name(self, make_user, other_user):
        owner = make_user("owner", "owner@email.com")
        make_category(owner, "Science")
        make_category(other_user, "Science") # allowed: names are unique per user
        assert count(Category) == 2

    # A user cannot create two categories with the same name.
    def test_one_user_cannot_have_two_categories_with_the_same_name(self, make_user):
        owner = make_user("owner", "owner@email.com")
        make_category(owner, "Science")
        db.session.add(Category(name="Science", user_id=owner.id))
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback() # recover the session after the expected error

    # Every category must have an owner.
    def test_category_cannot_exist_without_an_owner(self, app):
        db.session.add(Category(name="Orphan")) # no user_id
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

# Question ownership
class TestQuestionOwnership:
    # A question belongs to a category and reaches its owner through that relationship.
    def test_question_belongs_to_its_category_and_reaches_the_owner_through_it(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        question = make_question(category)
        assert question.category is category
        assert question.category.user is owner # ownership comes from the category

    # Each category should only contain its own questions.
    def test_category_lists_only_its_own_questions(self, make_user, other_user):
        owner = make_user("owner", "owner@email.com")
        mine = make_category(owner, "Mine")
        theirs = make_category(other_user, "Theirs")
        q1 = make_question(mine, "Question one?")
        q2 = make_question(theirs, "Question two?")
        assert mine.questions == [q1]
        assert theirs.questions == [q2]

    # Every question must belong to a category.
    def test_question_cannot_exist_without_a_category(self, app):
        db.session.add(Question(
            text="Lost question?", question_type="boolean", difficulty="easy",
            correct_answer="True", incorrect_answers=["False"],
        )) # no category_id
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()


# Cascades (the ORM rules, the way the app deletes things)
# Deleting a user should remove their categories, questions and quiz attempts.
class TestDeletingAUser:
    def test_deleting_a_user_deletes_their_categories_questions_and_attempts(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        make_question(category)
        make_attempt(owner, category)

        db.session.delete(owner)
        db.session.commit()

        assert count(Category) == 0
        assert count(Question) == 0
        assert count(QuizAttempt) == 0

    # Deleting one user must not affect another user's records.
    def test_deleting_a_user_leaves_other_users_data_untouched(self, make_user, other_user):
        owner = make_user("owner", "owner@email.com")
        make_question(make_category(owner, "Mine"))
        kept_category = make_category(other_user, "Theirs")
        kept_question = make_question(kept_category, "Kept question?")
        kept_attempt = make_attempt(other_user, kept_category)

        db.session.delete(owner)
        db.session.commit()

        assert [c.id for c in Category.query.all()] == [kept_category.id]
        assert [q.id for q in Question.query.all()] == [kept_question.id]
        assert [a.id for a in QuizAttempt.query.all()] == [kept_attempt.id]
        assert db.session.get(User, other_user.id) is not None

    # Deleted users should no longer appear on the leaderboard.
    def test_a_deleted_user_disappears_from_the_leaderboard(self, make_user, other_user):
        owner = make_user("owner", "owner@email.com")
        make_attempt(owner, points=50)
        make_attempt(other_user, points=10)

        db.session.delete(owner)
        db.session.commit()

        board = QuizAttempt.leaderboard()
        assert [row["username"] for row in board] == [other_user.username]

# Deleting a category should remove its questions but preserve the owner and score history.
class TestDeletingACategory:
    def test_deleting_a_category_deletes_its_questions(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        make_question(category, "Question one?")
        make_question(category, "Question two?")

        db.session.delete(category)
        db.session.commit()

        assert count(Category) == 0
        assert count(Question) == 0

    # Other categories belonging to the same user should remain.
    def test_deleting_a_category_keeps_the_owner_and_other_categories(self, make_user):
        owner = make_user("owner", "owner@email.com")
        doomed = make_category(owner, "Doomed")
        kept = make_category(owner, "Kept")

        db.session.delete(doomed)
        db.session.commit()

        assert db.session.get(User, owner.id) is not None
        assert owner.categories == [kept]

    # Quiz attempts should remain for score history, even when their category is deleted.
    def test_deleting_a_category_keeps_score_history_with_no_category(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        attempt = make_attempt(owner, category)

        db.session.delete(category)
        db.session.commit()

        db.session.refresh(attempt)
        assert db.session.get(QuizAttempt, attempt.id) is not None # the attempt survives
        assert attempt.category_id is None # but no longer points at a category
        assert attempt.score == 2 # and its score is intact

    # Deleting one category should not remove questions from other categories.
    def test_only_the_deleted_categorys_questions_go(self, make_user):
        owner = make_user("owner", "owner@email.com")
        doomed = make_category(owner, "Doomed")
        kept = make_category(owner, "Kept")
        make_question(doomed, "Doomed question?")
        kept_question = make_question(kept, "Kept question?")

        db.session.delete(doomed)
        db.session.commit()

        assert [q.id for q in Question.query.all()] == [kept_question.id]

# Deleting a question should not affect its category.
class TestDeletingAQuestion:
    def test_deleting_a_question_keeps_its_category(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        question = make_question(category)

        db.session.delete(question)
        db.session.commit()

        assert db.session.get(Category, category.id) is not None
        assert category.questions == []

    # Removing a question from the relationship deletes it from the database. This is handled by the delete-orphan cascade.
    def test_removing_a_question_from_its_category_deletes_it(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        question = make_question(category)

        category.questions.remove(question) # delete-orphan: a question can't live without its category
        db.session.commit()

        assert count(Question) == 0

# Database-level cascade rules
# PostgreSQL applies ON DELETE CASCADE / SET NULL on its own, even for bulk deletes that skip the ORM. 
# SQLite ignores foreign keys unless this pragma is switched on.
@pytest.fixture
def foreign_keys_on(app):
    db.session.execute(text("PRAGMA foreign_keys=ON"))
    db.session.commit()
    yield
    db.session.execute(text("PRAGMA foreign_keys=OFF")) # do not leak into other tests
    db.session.commit()

@pytest.mark.usefixtures("foreign_keys_on")
class TestDatabaseEnforcedRules:
    # A database-level user delete should also remove their categories and questions. Bulk deletes bypass SQLAlchemy's ORM cascade.
    def test_database_deletes_a_users_categories_and_questions(self, make_user):
        owner = make_user("owner", "owner@email.com")
        make_question(make_category(owner))

        db.session.query(User).filter_by(id=owner.id).delete() # bulk delete: skips the ORM cascade
        db.session.commit()
        db.session.expire_all()

        assert count(Category) == 0
        assert count(Question) == 0

    # Deleting a category should preserve quiz attempts but clear their category reference.
    def test_database_keeps_attempts_but_clears_their_category(self, make_user):
        owner = make_user("owner", "owner@email.com")
        category = make_category(owner)
        attempt = make_attempt(owner, category)

        db.session.query(Category).filter_by(id=category.id).delete() # bulk delete: skips the ORM
        db.session.commit()
        db.session.expire_all()

        attempt = db.session.get(QuizAttempt, attempt.id)
        assert attempt is not None
        assert attempt.category_id is None # ON DELETE SET NULL

    # The database should reject categories linked to users that do not exist.
    def test_database_rejects_a_category_whose_owner_does_not_exist(self, app):
        db.session.add(Category(name="Ghost", user_id=9999)) # no such user
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()