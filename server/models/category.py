# Category: a named group of trivia questions (e.g. "Science", "Kenyan History").
# Each category belongs to one user (its owner) and has many questions.
# Phase 3: an optional icon key and colour, used by the category tiles.

import re

from sqlalchemy.orm import validates

from .db import db

# maps to a picture; colours are hex codes like "#2E86C1".
ICON_PATTERN = re.compile(r"^[a-z0-9-]+$")
COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class Category(db.Model):
    __tablename__ = "categories"

    NAME_MAX_LENGTH = 80
    DESCRIPTION_MAX_LENGTH = 255
    ICON_MAX_LENGTH = 40

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(NAME_MAX_LENGTH), nullable=False)
    description = db.Column(db.String(DESCRIPTION_MAX_LENGTH))
    icon = db.Column(db.String(ICON_MAX_LENGTH))  # optional, e.g. "globe"
    color = db.Column(db.String(7))  # optional, e.g. "#2E86C1"
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
        # Database backstop: a colour, when set, is always "#" + 6 characters.
        db.CheckConstraint(
            "color IS NULL OR length(color) = 7", name="color_length"
        ),
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

    @validates("icon")
    def validate_icon(self, key, value):
        # Optional: empty or blank means "no icon".
        if value is None or not str(value).strip():
            return None
        value = str(value).strip().lower()
        if len(value) > self.ICON_MAX_LENGTH:
            raise ValueError(
                f"Icon must be {self.ICON_MAX_LENGTH} characters or fewer."
            )
        if not ICON_PATTERN.match(value):
            raise ValueError(
                "Icon must use only lowercase letters, numbers and hyphens (e.g. 'globe')."
            )
        return value

    @validates("color")
    def validate_color(self, key, value):
        # Optional: empty or blank means "no colour".
        if value is None or not str(value).strip():
            return None
        value = str(value).strip()
        if not COLOR_PATTERN.match(value):
            raise ValueError("Color must be a hex colour like #2E86C1.")
        return value.upper()  # one consistent form: "#2e86c1" is stored as "#2E86C1"

    def __repr__(self):
        return f"<Category id={self.id} name={self.name!r}>"
