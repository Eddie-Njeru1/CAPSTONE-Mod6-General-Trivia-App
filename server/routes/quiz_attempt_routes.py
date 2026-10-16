# Routes for saving finished quiz rounds and reading the scoreboard.
#
#   POST /api/quiz-attempts   save a finished round for the logged-in user
#   GET  /api/quiz-attempts   the logged-in user's own history, newest first
#   GET  /api/leaderboard     top players by total points (public)

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models import Category, QuizAttempt, db
from utils.auth import get_current_user

quiz_attempt_bp = Blueprint("quiz_attempts", __name__)

# Fields the client may send. Anything else in the body is ignored.
NUMBER_FIELDS = ("score", "total_questions", "points", "best_streak")
LEADERBOARD_MAX = 50


def error(message, status):
    return jsonify({"error": message}), status


def serialize_attempt(attempt):
    """Turn a QuizAttempt into JSON-safe data for the frontend."""
    return {
        "id": attempt.id,
        "score": attempt.score,
        "total_questions": attempt.total_questions,
        "points": attempt.points,
        "best_streak": attempt.best_streak,
        "category_id": attempt.category_id,
        # No category means a Mixed round (or its category was deleted).
        "category_name": attempt.category.name if attempt.category else "Mixed",
        "created_at": attempt.created_at.isoformat() if attempt.created_at else None,
    }


@quiz_attempt_bp.post("/quiz-attempts")
@jwt_required()
def create_quiz_attempt():
    user = get_current_user()
    if user is None:
        return error("User not found", 401)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error("request body must be JSON", 400)

    for name in ("score", "total_questions"):
        if name not in data:
            return error(f"{name} is required", 400)

    # The category is optional: leave it out (or send null) for a Mixed round.
    category_id = data.get("category_id")
    category = None
    if category_id is not None:
        if isinstance(category_id, bool) or not isinstance(category_id, int):
            return error("category_id must be a whole number", 400)
        category = db.session.get(Category, category_id)
        if category is None:
            return error("Category not found", 404)

    # The model's validators check each number (whole, not negative, ...).
    try:
        attempt = QuizAttempt(
            user=user,
            category=category,
            **{name: data.get(name, 0) for name in NUMBER_FIELDS},
        )
        db.session.add(attempt)
        db.session.commit()  # cross-field checks run here (score <= total, ...)
    except ValueError as exc:
        db.session.rollback()
        return error(str(exc), 400)

    return jsonify(serialize_attempt(attempt)), 201


@quiz_attempt_bp.get("/quiz-attempts")
@jwt_required()
def list_my_quiz_attempts():
    user = get_current_user()
    if user is None:
        return error("User not found", 401)

    attempts = (
        QuizAttempt.query.filter_by(user_id=user.id)
        .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        .all()
    )
    return jsonify([serialize_attempt(attempt) for attempt in attempts]), 200


@quiz_attempt_bp.get("/leaderboard")
def leaderboard():
    # ?limit=5 arrives as the text "5", so convert it ourselves: a bad value
    # like "ten" should be an error, not silently replaced by the default.
    try:
        limit = int(request.args.get("limit", "10"))
    except ValueError:
        limit = 0
    if limit < 1:
        return error("limit must be a whole number of at least 1", 400)
    limit = min(limit, LEADERBOARD_MAX)  # never return an unbounded list

    return jsonify(QuizAttempt.leaderboard(limit=limit)), 200
