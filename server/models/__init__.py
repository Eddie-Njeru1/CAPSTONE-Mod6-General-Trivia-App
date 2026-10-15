# Makes `from models import db, Category, Question` work (app.py relies on db).
# Every model is imported here so Flask-Migrate can find its table when it
# generates migrations.

from .db import db
from .category import Category
from .question import Question

__all__ = ["db", "Category", "Question"]
