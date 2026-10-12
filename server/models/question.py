# Question: one trivia question that belongs to a category.
# Same shape as the Phase 1 question object, so the quiz logic keeps working:
# text, question_type ("multiple" or "boolean"), difficulty, correct_answer,
# incorrect_answers.

from sqlalchemy import event
from sqlalchemy.orm import validates

from .db import db


class Question(db.Model):
    __tablename__ = "questions"

    TEXT_MAX_LENGTH = 500
    ANSWER_MAX_LENGTH = 255
    TYPES = ("multiple", "boolean")
    DIFFICULTIES = ("easy", "medium", "hard")

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(TEXT_MAX_LENGTH), nullable=False)
    question_type = db.Column(db.String(10), nullable=False)
    difficulty = db.Column(db.String(10), nullable=False)
    correct_answer = db.Column(db.String(ANSWER_MAX_LENGTH), nullable=False)
    # A list of strings, e.g. ["Mombasa", "Kisumu", "Nakuru"]
    incorrect_answers = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime, server_default=db.func.now(), onupdate=db.func.now(), nullable=False
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category = db.relationship("Category", back_populates="questions")

    # Database-level backstops: even raw SQL can't save an invalid value.
    __table_args__ = (
        db.CheckConstraint(
            "question_type IN ('multiple', 'boolean')", name="valid_question_type"
        ),
        db.CheckConstraint(
            "difficulty IN ('easy', 'medium', 'hard')", name="valid_difficulty"
        ),
    )

    # ---- single-field validation: runs whenever the attribute is set ----

    @validates("text")
    def validate_text(self, key, value):
        return self._clean_string(value, "Question text", self.TEXT_MAX_LENGTH)

    @validates("correct_answer")
    def validate_correct_answer(self, key, value):
        return self._clean_string(value, "Correct answer", self.ANSWER_MAX_LENGTH)

    @validates("question_type")
    def validate_question_type(self, key, value):
        if value not in self.TYPES:
            raise ValueError(f"Question type must be one of: {', '.join(self.TYPES)}.")
        return value

    @validates("difficulty")
    def validate_difficulty(self, key, value):
        if value not in self.DIFFICULTIES:
            raise ValueError(
                f"Difficulty must be one of: {', '.join(self.DIFFICULTIES)}."
            )
        return value

    @validates("incorrect_answers")
    def validate_incorrect_answers(self, key, value):
        if not isinstance(value, list) or not value:
            raise ValueError("Incorrect answers must be a non-empty list.")
        cleaned = [
            self._clean_string(answer, "Each incorrect answer", self.ANSWER_MAX_LENGTH)
            for answer in value
        ]
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("Incorrect answers must not repeat.")
        return cleaned

    # ---- cross-field validation: needs several fields, so it runs on save ----

    def check_answers(self):
        if self.correct_answer in self.incorrect_answers:
            raise ValueError("The correct answer can't also be an incorrect answer.")
        if self.question_type == "multiple" and len(self.incorrect_answers) != 3:
            raise ValueError("Multiple-choice questions need exactly 3 incorrect answers.")
        if self.question_type == "boolean":
            if self.correct_answer not in ("True", "False"):
                raise ValueError('True/false answers must be "True" or "False".')
            expected = ["False" if self.correct_answer == "True" else "True"]
            if self.incorrect_answers != expected:
                raise ValueError(
                    f"For this true/false question, the incorrect answer must be {expected}."
                )

    @staticmethod
    def _clean_string(value, label, max_length):
        if value is None or not str(value).strip():
            raise ValueError(f"{label} is required.")
        value = str(value).strip()
        if len(value) > max_length:
            raise ValueError(f"{label} must be {max_length} characters or fewer.")
        return value

    def __repr__(self):
        return f"<Question id={self.id} difficulty={self.difficulty!r} text={self.text[:30]!r}>"


@event.listens_for(Question, "before_insert")
@event.listens_for(Question, "before_update")
def _check_answers_before_save(mapper, connection, target):
    target.check_answers()
