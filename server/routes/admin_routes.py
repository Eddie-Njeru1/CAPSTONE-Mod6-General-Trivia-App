"""
These endpoints provide administrator-only access to:
- Dashboard statistics
- User management
- Categories across all users
- Questions across all users

All endpoints are protected by admin_required() from utils/auth.py.
"""

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from marshmallow import ValidationError

from models import db, User, Category, Question
from schemas.quiz_schemas import CategorySchema, QuestionSchema
from schemas.admin_schemas import (
    admin_stats_schema,
    admin_user_schema,
    admin_users_schema,
    admin_user_update_schema,
)
from utils.auth import admin_required, get_current_user


# /api/admin is added when this blueprint is registered in app.py.
admin_bp = Blueprint("admin", __name__)


# ---------------------------------------------------------------------------
# Schema instances
# ---------------------------------------------------------------------------

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

question_schema = QuestionSchema()
questions_schema = QuestionSchema(many=True)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def error_response(message, status_code):
    """Return a consistent JSON error response."""
    return jsonify({"error": message}), status_code


def get_json_body():
    """
    Safely return the request JSON body.

    Returning an empty dictionary allows the route to produce a normal
    validation error instead of crashing when JSON is missing.
    """
    return request.get_json(silent=True) or {}


def get_user_or_404(user_id):
    """Return a user or a 404 response tuple."""
    user = db.session.get(User, user_id)

    if user is None:
        return None, error_response("User not found.", 404)

    return user, None


def get_category_or_404(category_id):
    """Return a category or a 404 response tuple."""
    category = db.session.get(Category, category_id)

    if category is None:
        return None, error_response("Category not found.", 404)

    return category, None


def get_question_or_404(question_id):
    """Return a question or a 404 response tuple."""
    question = db.session.get(Question, question_id)

    if question is None:
        return None, error_response("Question not found.", 404)

    return question, None


def get_pagination_args():
    """
    Read and validate pagination parameters.

    Defaults:
        page = 1
        per_page = 10
    """
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 10))
    except (TypeError, ValueError):
        return None, None, error_response(
            "page and per_page must be integers.",
            400,
        )

    if page < 1:
        return None, None, error_response(
            "page must be greater than or equal to 1.",
            400,
        )

    if per_page < 1 or per_page > 100:
        return None, None, error_response(
            "per_page must be between 1 and 100.",
            400,
        )

    return page, per_page, None


def pagination_data(pagination):
    """Convert Flask-SQLAlchemy pagination data to JSON-friendly data."""
    return {
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }


def commit_changes():
    """
    Commit database changes.

    Returns None on success or a JSON error response on failure.
    """
    try:
        db.session.commit()
        return None
    except IntegrityError:
        db.session.rollback()
        return error_response(
            "The requested change conflicts with existing data.",
            409,
        )
    except SQLAlchemyError:
        db.session.rollback()
        return error_response(
            "A database error occurred.",
            500,
        )


def attach_user_counts(user):
    """
    Add category/question counts to a user object before serialization.

    The counts are attached temporarily to the SQLAlchemy object so that
    AdminUserSchema can serialize them without changing the User model.
    """
    user.category_count = (
        db.session.query(func.count(Category.id))
        .filter(Category.user_id == user.id)
        .scalar()
        or 0
    )

    user.question_count = (
        db.session.query(func.count(Question.id))
        .join(Category, Question.category_id == Category.id)
        .filter(Category.user_id == user.id)
        .scalar()
        or 0
    )

    return user


def apply_user_filters(query):
    """Apply optional admin user-list filters."""
    role = request.args.get("role")
    is_active = request.args.get("is_active")
    search = request.args.get("search")

    if role:
        if role not in User.ROLES:
            return None, error_response(
                "role must be either 'user' or 'admin'.",
                400,
            )

        query = query.filter(User.role == role)

    if is_active is not None:
        normalized = is_active.lower()

        if normalized not in {"true", "false"}:
            return None, error_response(
                "is_active must be true or false.",
                400,
            )

        query = query.filter(User.is_active == (normalized == "true"))

    if search:
        search_value = f"%{search.strip()}%"

        query = query.filter(
            or_(
                User.username.ilike(search_value),
                User.email.ilike(search_value),
            )
        )

    return query, None


# ---------------------------------------------------------------------------
# Admin statistics
# ---------------------------------------------------------------------------

@admin_bp.get("/stats")
@admin_required
def admin_stats():
    """
    Return high-level statistics for the administrator dashboard.
    """
    total_users = db.session.query(func.count(User.id)).scalar() or 0

    active_users = (
        db.session.query(func.count(User.id))
        .filter(User.is_active.is_(True))
        .scalar()
        or 0
    )

    inactive_users = (
        db.session.query(func.count(User.id))
        .filter(User.is_active.is_(False))
        .scalar()
        or 0
    )

    admin_users = (
        db.session.query(func.count(User.id))
        .filter(User.role == "admin")
        .scalar()
        or 0
    )

    total_categories = (
        db.session.query(func.count(Category.id)).scalar() or 0
    )

    total_questions = (
        db.session.query(func.count(Question.id)).scalar() or 0
    )

    stats = {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "admin_users": admin_users,
        "total_categories": total_categories,
        "total_questions": total_questions,
    }

    return jsonify(admin_stats_schema.dump(stats)), 200


# ---------------------------------------------------------------------------
# Admin user management
# ---------------------------------------------------------------------------

@admin_bp.get("/users")
@admin_required
def list_users():
    """
    Return a paginated list of users.

    Supported filters:
        ?role=user
        ?role=admin
        ?is_active=true
        ?is_active=false
        ?search=username-or-email
        ?page=1
        ?per_page=10
    """
    page, per_page, error = get_pagination_args()

    if error:
        return error

    query = User.query.order_by(User.id.asc())

    query, error = apply_user_filters(query)

    if error:
        return error

    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )

    users = [
        attach_user_counts(user)
        for user in pagination.items
    ]

    return jsonify(
        {
            "users": admin_users_schema.dump(users),
            "pagination": pagination_data(pagination),
        }
    ), 200


@admin_bp.patch("/users/<int:user_id>")
@admin_required
def update_user(user_id):
    """
    Update an administrator-managed user.

    Supported fields:
        role
        is_active
    """
    user, error = get_user_or_404(user_id)

    if error:
        return error

    data = get_json_body()

    try:
        validated_data = admin_user_update_schema.load(data)
    except ValidationError as exc:
        return error_response(exc.messages, 422)

    current_user = get_current_user()

    # An administrator must not deactivate their own account.
    if (
        user.id == current_user.id
        and validated_data.get("is_active") is False
    ):
        return error_response(
            "You cannot deactivate your own account.",
            400,
        )

    # An administrator must not remove their own admin role.
    if (
        user.id == current_user.id
        and validated_data.get("role") == "user"
    ):
        return error_response(
            "You cannot remove your own admin role.",
            400,
        )

    # Prevent the application from being left without an administrator.
    if (
        user.role == "admin"
        and validated_data.get("role") == "user"
    ):
        admin_count = (
            db.session.query(func.count(User.id))
            .filter(User.role == "admin")
            .scalar()
            or 0
        )

        if admin_count <= 1:
            return error_response(
                "The last administrator cannot be demoted.",
                400,
            )

    if (
        user.role == "admin"
        and validated_data.get("is_active") is False
    ):
        active_admin_count = (
            db.session.query(func.count(User.id))
            .filter(
                User.role == "admin",
                User.is_active.is_(True),
            )
            .scalar()
            or 0
        )

        if active_admin_count <= 1:
            return error_response(
                "The last active administrator cannot be deactivated.",
                400,
            )

    for field, value in validated_data.items():
        setattr(user, field, value)

    error = commit_changes()

    if error:
        return error

    attach_user_counts(user)

    return jsonify(admin_user_schema.dump(user)), 200


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    """
    Delete a user and their owned resources.

    The current administrator cannot delete their own account.
    The last administrator cannot be deleted.
    """
    user, error = get_user_or_404(user_id)

    if error:
        return error

    current_user = get_current_user()

    if user.id == current_user.id:
        return error_response(
            "You cannot delete your own account.",
            400,
        )

    if user.role == "admin":
        admin_count = (
            db.session.query(func.count(User.id))
            .filter(User.role == "admin")
            .scalar()
            or 0
        )

        if admin_count <= 1:
            return error_response(
                "The last administrator cannot be deleted.",
                400,
            )

    db.session.delete(user)

    error = commit_changes()

    if error:
        return error

    return jsonify(
        {
            "message": "User deleted successfully.",
            "id": user_id,
        }
    ), 200


# ---------------------------------------------------------------------------
# Admin category management
# ---------------------------------------------------------------------------

@admin_bp.get("/categories")
@admin_required
def list_categories():
    """Return a paginated list of categories owned by all users."""
    page, per_page, error = get_pagination_args()

    if error:
        return error

    query = Category.query.order_by(Category.id.asc())

    owner_id = request.args.get("user_id")

    if owner_id:
        try:
            owner_id = int(owner_id)
        except ValueError:
            return error_response(
                "user_id must be an integer.",
                400,
            )

        query = query.filter(Category.user_id == owner_id)

    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )

    return jsonify(
        {
            "categories": categories_schema.dump(pagination.items),
            "pagination": pagination_data(pagination),
        }
    ), 200


@admin_bp.get("/categories/<int:category_id>")
@admin_required
def get_category(category_id):
    """Return any category regardless of ownership."""
    category, error = get_category_or_404(category_id)

    if error:
        return error

    return jsonify(category_schema.dump(category)), 200


@admin_bp.post("/categories")
@admin_required
def create_category():
    """Create a category on behalf of the authenticated administrator."""
    data = get_json_body()

    try:
        validated_data = category_schema.load(data)
    except ValidationError as exc:
        return error_response(exc.messages, 422)

    current_user = get_current_user()

    category = Category(
        **validated_data,
        user_id=current_user.id,
    )

    db.session.add(category)

    error = commit_changes()

    if error:
        return error

    return jsonify(category_schema.dump(category)), 201


@admin_bp.patch("/categories/<int:category_id>")
@admin_required
def update_category(category_id):
    """Update any category regardless of ownership."""
    category, error = get_category_or_404(category_id)

    if error:
        return error

    data = get_json_body()

    try:
        validated_data = category_schema.load(
            data,
            partial=True,
        )
    except ValidationError as exc:
        return error_response(exc.messages, 422)

    # Ownership must never be changed through the admin category API.
    validated_data.pop("user_id", None)

    for field, value in validated_data.items():
        setattr(category, field, value)

    error = commit_changes()

    if error:
        return error

    return jsonify(category_schema.dump(category)), 200


@admin_bp.delete("/categories/<int:category_id>")
@admin_required
def delete_category(category_id):
    """Delete any category and its related questions."""
    category, error = get_category_or_404(category_id)

    if error:
        return error

    db.session.delete(category)

    error = commit_changes()

    if error:
        return error

    return jsonify(
        {
            "message": "Category deleted successfully.",
            "id": category_id,
        }
    ), 200


# ---------------------------------------------------------------------------
# Admin question management
# ---------------------------------------------------------------------------

@admin_bp.get("/questions")
@admin_required
def list_questions():
    """
    Return a paginated list of questions across all users.

    Supported filters:
        ?category_id=1
        ?difficulty=easy
        ?difficulty=medium
        ?difficulty=hard
        ?question_type=multiple
        ?question_type=boolean
        ?page=1
        ?per_page=10
    """
    page, per_page, error = get_pagination_args()

    if error:
        return error

    query = Question.query.order_by(Question.id.asc())

    category_id = request.args.get("category_id")
    difficulty = request.args.get("difficulty")
    question_type = request.args.get("question_type")

    if category_id:
        try:
            category_id = int(category_id)
        except ValueError:
            return error_response(
                "category_id must be an integer.",
                400,
            )

        query = query.filter(Question.category_id == category_id)

    if difficulty:
        if difficulty not in {"easy", "medium", "hard"}:
            return error_response(
                "difficulty must be easy, medium, or hard.",
                400,
            )

        query = query.filter(Question.difficulty == difficulty)

    if question_type:
        if question_type not in {"multiple", "boolean"}:
            return error_response(
                "question_type must be multiple or boolean.",
                400,
            )

        query = query.filter(Question.question_type == question_type)

    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )

    return jsonify(
        {
            "questions": questions_schema.dump(pagination.items),
            "pagination": pagination_data(pagination),
        }
    ), 200


@admin_bp.get("/questions/<int:question_id>")
@admin_required
def get_question(question_id):
    """Return any question regardless of category ownership."""
    question, error = get_question_or_404(question_id)

    if error:
        return error

    return jsonify(question_schema.dump(question)), 200


@admin_bp.post("/questions")
@admin_required
def create_question():
    """
    Create a question in any existing category.

    Unlike the normal user API, the administrator does not need to own
    the target category.
    """
    data = get_json_body()

    try:
        validated_data = question_schema.load(data)
    except ValidationError as exc:
        return error_response(exc.messages, 422)

    category_id = validated_data.get("category_id")

    category, error = get_category_or_404(category_id)

    if error:
        return error

    # Admins can create questions in any category.
    question = Question(**validated_data)

    db.session.add(question)

    error = commit_changes()

    if error:
        return error

    return jsonify(question_schema.dump(question)), 201


@admin_bp.patch("/questions/<int:question_id>")
@admin_required
def update_question(question_id):
    """Update any question regardless of category ownership."""
    question, error = get_question_or_404(question_id)

    if error:
        return error

    data = get_json_body()

    try:
        validated_data = question_schema.load(
            data,
            partial=True,
        )
    except ValidationError as exc:
        return error_response(exc.messages, 422)

    # If category_id is being changed, ensure the new category exists.
    if "category_id" in validated_data:
        category, error = get_category_or_404(
            validated_data["category_id"]
        )

        if error:
            return error

    for field, value in validated_data.items():
        setattr(question, field, value)

    error = commit_changes()

    if error:
        return error

    return jsonify(question_schema.dump(question)), 200


@admin_bp.delete("/questions/<int:question_id>")
@admin_required
def delete_question(question_id):
    """Delete any question regardless of category ownership."""
    question, error = get_question_or_404(question_id)

    if error:
        return error

    db.session.delete(question)

    error = commit_changes()

    if error:
        return error

    return jsonify(
        {
            "message": "Question deleted successfully.",
            "id": question_id,
        }
    ), 200