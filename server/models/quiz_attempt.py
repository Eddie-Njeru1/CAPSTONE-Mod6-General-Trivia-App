# QuizAttempt: one finished round of the quiz, saved for the scoreboard.
# Moves the Phase 1 browser history into the database, per user.

from sqlalchemy import event
from sqlalchemy.orm import validates

from .db import db


class QuizAttempt(db.Model):
    __tablename__ = "quiz_attempts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Empty (None) for a Mixed round. If the category is later deleted,
    # the attempt is kept and this becomes None, so score history survives.
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id", ondelete="SET NULL"),
        index=True,
    )
    score = db.Column(db.Integer, nullable=False)  # correct answers
    total_questions = db.Column(db.Integer, nullable=False)
    points = db.Column(db.Integer, nullable=False, default=0)  # incl. streak bonus
    best_streak = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    user = db.relationship(
        "User",
        backref=db.backref("quiz_attempts", cascade="all, delete-orphan"),
    )
    category = db.relationship("Category", backref="quiz_attempts")

    # Database-level backstops for the same rules the Python checks enforce.
    __table_args__ = (
        db.CheckConstraint("total_questions > 0", name="total_questions_positive"),
        db.CheckConstraint(
            "score >= 0 AND score <= total_questions", name="score_in_range"
        ),
        db.CheckConstraint("points >= 0", name="points_not_negative"),
        db.CheckConstraint(
            "best_streak >= 0 AND best_streak <= score", name="best_streak_in_range"
        ),
    )

    # ---- single-field validation ----

    @validates("score", "points", "best_streak")
    def validate_non_negative(self, key, value):
        return self._whole_number(value, key, minimum=0)

    @validates("total_questions")
    def validate_total_questions(self, key, value):
        return self._whole_number(value, key, minimum=1)

    # ---- cross-field validation: runs on save ----

    def check_numbers(self):
        if self.score > self.total_questions:
            raise ValueError("score can't be more than total_questions.")
        if self.best_streak > self.score:
            raise ValueError("best_streak can't be more than score.")

    @staticmethod
    def _whole_number(value, label, minimum):
        # bool is a kind of int in Python, so reject it explicitly.
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(f"{label} must be a whole number.")
        if value < minimum:
            raise ValueError(f"{label} must be at least {minimum}.")
        return value

    # ---- scoreboard queries ----

    @classmethod
    def leaderboard(cls, limit=10):
        """Top players by total points, one row per player.

        Ties are broken by fewer games played (more points per game),
        then alphabetically, so the order is always the same.
        """
        from .user import User  # imported here to avoid a circular import

        total_points = db.func.sum(cls.points).label("total_points")
        games_played = db.func.count(cls.id).label("games_played")
        best_streak = db.func.max(cls.best_streak).label("best_streak")

        rows = (
            db.session.query(User.username, total_points, games_played, best_streak)
            .join(cls.user)
            .group_by(User.id, User.username)
            .order_by(total_points.desc(), games_played.asc(), User.username.asc())
            .limit(limit)
            .all()
        )
        return [
            {
                "rank": position,
                "username": row.username,
                "total_points": row.total_points,
                "games_played": row.games_played,
                "best_streak": row.best_streak,
            }
            for position, row in enumerate(rows, start=1)
        ]

    def __repr__(self):
        return (
            f"<QuizAttempt id={self.id} user_id={self.user_id} "
            f"score={self.score}/{self.total_questions}>"
        )


@event.listens_for(QuizAttempt, "before_insert")
@event.listens_for(QuizAttempt, "before_update")
def _check_numbers_before_save(mapper, connection, target):
    target.check_numbers()
