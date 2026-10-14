# Category: a named group of trivia questions (e.g. "Science", "Kenyan History").
# One category has many questions (one-to-many).

from sqlalchemy.orm import validates

from .db import db


class Category(db.Model):
    __tablename__ = "categories"

    NAME_MAX_LENGTH = 80
    DESCRIPTION_MAX_LENGTH = 255

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(NAME_MAX_LENGTH), nullable=False, unique=True)
    description = db.Column(db.String(DESCRIPTION_MAX_LENGTH))
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now(), nullable=False
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
