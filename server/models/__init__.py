# Makes `from models import db, User, Category, Question, QuizAttempt, TokenBlocklist` work.
# Every model is imported here so Flask-Migrate can find its table when it
# generates migrations.

from .db import db
from .user import User
from .category import Category
from .question import Question
from .quiz_attempt import QuizAttempt
from .token_blocklist import TokenBlocklist

__all__ = ["db", "User", "Category", "Question", "QuizAttempt", "TokenBlocklist"]
