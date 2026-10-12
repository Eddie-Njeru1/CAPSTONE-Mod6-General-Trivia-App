# Makes `from models import db` work (app.py relies on this).
# Each model is imported here as it's written, so Flask-Migrate can find
# every table when it generates migrations.

from .db import db

__all__ = ["db"]
