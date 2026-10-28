# Routes for saving finished quiz rounds and reading the scoreboard.
#
#   POST /api/quiz-attempts   save a finished round for the logged-in user
#   GET  /api/quiz-attempts   the logged-in user's own history, newest first,
#                             paginated with ?page=1&per_page=10
#   GET  /api/leaderboard     top players by total points (public)

from flask import Blueprint, jsonify, request

from models import Category, QuizAttempt, db
from utils.auth import active_user_required, get_current_user

quiz_attempt_bp = Blueprint("quiz_attempts", __name__)

# Fields the client may send. Anything else in the body is ignored.
NUMBER_FIELDS = ("score", "total_questions", "points", "best_streak")
LEADERBOARD_MAX = 50
PER_PAGE_DEFAULT = 10
PER_PAGE_MAX = 50


def error(message, status):
    return jsonify({"error": message}), status


def read_positive_int(name, default):
    """Read ?name=... as a whole number of at least 1, or return None if it isn't."""
    try:
        value = int(request.args.get(name, str(default)))
    except ValueError:
        return None
    return value if value >= 1 else None


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
@active_user_required
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
@active_user_required
def list_my_quiz_attempts():
    user = get_current_user()
    if user is None:
        return error("User not found", 401)

    page = read_positive_int("page", 1)
    per_page = read_positive_int("per_page", PER_PAGE_DEFAULT)
    if page is None or per_page is None:
        return error("page and per_page must be whole numbers of at least 1", 400)
    per_page = min(per_page, PER_PAGE_MAX)

    query = QuizAttempt.query.filter_by(user_id=user.id).order_by(
        QuizAttempt.created_at.desc(), QuizAttempt.id.desc()
    )
    # error_out=False: a page past the end returns an empty list, not a 404.
    results = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        {
            "items": [serialize_attempt(attempt) for attempt in results.items],
            "page": results.page,
            "per_page": results.per_page,
            "total": results.total,
            "pages": results.pages,
        }
    ), 200


@quiz_attempt_bp.get("/leaderboard")
def leaderboard():
    # ?limit=5 arrives as the text "5", so convert it ourselves: a bad value
    # like "ten" should be an error, not silently replaced by the default.
    limit = read_positive_int("limit", 10)
    if limit is None:
        return error("limit must be a whole number of at least 1", 400)
    limit = min(limit, LEADERBOARD_MAX)  # never return an unbounded list

    return jsonify(QuizAttempt.leaderboard(limit=limit)), 200
