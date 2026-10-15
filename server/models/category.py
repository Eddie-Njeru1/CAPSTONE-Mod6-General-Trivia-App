# Category: a named group of trivia questions (e.g. "Science", "Kenyan History").
# Each category belongs to one user (its owner) and has many questions.

from sqlalchemy.orm import validates

from .db import db


class Category(db.Model):
    __tablename__ = "categories"

    NAME_MAX_LENGTH = 80
    DESCRIPTION_MAX_LENGTH = 255

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(NAME_MAX_LENGTH), nullable=False)
    description = db.Column(db.String(DESCRIPTION_MAX_LENGTH))
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now(), nullable=False
    )

    # A user can't have two categories with the same name,
    # but two different users can each have their own "Science".
    __table_args__ = (
        db.UniqueConstraint("user_id", "name", name="uq_categories_user_id_name"),
    )

    # The owner. The backref also gives every User a `.categories` list
    # (deleting a user deletes their categories), without editing user.py.
    user = db.relationship(
        "User",
        backref=db.backref("categories", cascade="all, delete-orphan"),
    )

    # Deleting a category deletes its questions too, so no question is left
    # pointing at a category that no longer exists.
    questions = db.relationship(
        "Question",
        back_populates="category",
        cascade="all, delete-orphan",
    )

    @validates("name")
    def validate_name(self, key, value):
        if value is None or not str(value).strip():
            raise ValueError("Category name is required.")
        value = str(value).strip()
        if len(value) > self.NAME_MAX_LENGTH:
            raise ValueError(
                f"Category name must be {self.NAME_MAX_LENGTH} characters or fewer."
            )
        return value

    @validates("description")
    def validate_description(self, key, value):
        if value is None:
            return None
        value = str(value).strip()
        if len(value) > self.DESCRIPTION_MAX_LENGTH:
            raise ValueError(
                f"Description must be {self.DESCRIPTION_MAX_LENGTH} characters or fewer."
            )
        return value or None

    def __repr__(self):
        return f"<Category id={self.id} name={self.name!r}>"
