
"""
Trivia API Routes
=================

This module defines REST API endpoints for managing trivia categories
and questions.

Features:
    - JWT authentication for every endpoint.
    - Category CRUD (Create, Read, Update, Delete).
    - Question CRUD (Create, Read, Update, Delete).
    - Optional AI-powered trivia question generation.
    - Ownership checks to prevent users modifying another user's data.
    - Pagination for category and question lists.
    - Optional question filtering by category, difficulty, and type.
    - Marshmallow schema validation for incoming data.
    - Consistent JSON responses and database error handling.

Blueprint registration:
    The application registers this blueprint with the /api URL prefix.

Authentication:
    Requests must include a valid JWT access token in the Authorization header.

Ownership:
    Categories belong to the user who created them.
    Questions inherit ownership through their associated category.
"""


from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from models import Category, Question, db
from schemas.quiz_schemas import CategorySchema, QuestionSchema
from services.external_api import AITriviaError, generate_ai_question
from utils.auth import get_current_user_id


# Create the blueprint used to group trivia API endpoints.
api_bp = Blueprint("api", __name__)

# Reusable schemas for validating and serializing API data.
category_schema = CategorySchema()
question_schema = QuestionSchema()
categories_schema = CategorySchema(many=True)
questions_schema = QuestionSchema(many=True)


def error_response(message, status_code, details=None):
    """
    Create a consistent JSON error response.

    Args:
        message (str): Human-readable explanation of the error.
        status_code (int): HTTP status code to return.
        details (dict | list | None): Optional validation details.

    Returns:
        tuple: A Flask JSON response and its HTTP status code.
    """
    body = {"error": message}

    if details is not None:
        body["details"] = details

    return jsonify(body), status_code


def read_json_object():
    """
    Validate that the request contains a JSON object.

    Returns:
        tuple: (parsed_data, None) on success, or
        (None, error_response) when the request body is invalid.
    """
    if not request.is_json:
        return None, error_response(
            "Content-Type must be application/json.",
            415,
        )

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return None, error_response(
            "Request body must be a valid JSON object.",
            400,
        )

    return data, None


def get_pagination_args():
    """
    Validate pagination query parameters.

    Supported query parameters:
        page: Page number, starting at 1.
        per_page: Number of records per page, from 1 to 100.

    Returns:
        tuple: ((page, per_page), None) when valid, otherwise
        (None, error_response).
    """
    page_value = request.args.get("page", "1")
    per_page_value = request.args.get("per_page", "10")

    # Reject zero, negative values, decimals, and non-numeric values.
    if not page_value.isdigit() or int(page_value) < 1:
        return None, error_response(
            "page must be a positive integer.",
            400,
        )

    if not per_page_value.isdigit() or int(per_page_value) < 1:
        return None, error_response(
            "per_page must be a positive integer.",
            400,
        )

    page = int(page_value)
    per_page = int(per_page_value)

    # Limit page size to avoid unnecessarily large database responses.
    if per_page > 100:
        return None, error_response(
            "per_page cannot exceed 100.",
            400,
        )

    return (page, per_page), None


def pagination_response(result, schema):
    """
    Serialize a paginated SQLAlchemy query result.

    Args:
        result: SQLAlchemy pagination object.
        schema: Marshmallow schema used to serialize the records.

    Returns:
        tuple: JSON containing records and pagination metadata.
    """
    return jsonify(
        {
            "items": schema.dump(result.items),
            "pagination": {
                "page": result.page,
                "per_page": result.per_page,
                "total": result.total,
                "pages": result.pages,
                "has_next": result.has_next,
                "has_prev": result.has_prev,
            },
        }
    ), 200


def commit_changes():
    """
    Commit pending database changes and handle database errors.

    A rollback is performed whenever the commit fails so the database
    session is not left in a failed transaction state.
    """
    try:
        db.session.commit()
        return None

    except IntegrityError:
        db.session.rollback()
        return error_response(
            "The operation conflicts with existing data.",
            409,
        )

    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)

    except SQLAlchemyError:
        db.session.rollback()
        return error_response(
            "A database error occurred.",
            500,
        )


# ---------------------------------------------------------------------------
# Record lookup and ownership helpers
# ---------------------------------------------------------------------------

def get_category_or_404(category_id):
    """Retrieve a category by ID."""
    category = db.session.get(Category, category_id)

    if category is None:
        return None, error_response("Category not found.", 404)

    return category, None


def get_question_or_404(question_id):
    """Retrieve a question by ID."""
    question = db.session.get(Question, question_id)

    if question is None:
        return None, error_response("Question not found.", 404)

    return question, None


def check_category_ownership(category, user_id):
    """Ensure the authenticated user owns the specified category."""
    if category.user_id != user_id:
        return error_response(
            "You do not have permission to access this category.",
            403,
        )

    return None


def check_question_ownership(question, user_id):
    """Check question ownership through its associated category."""
    if question.category is None:
        return error_response(
            "The question's category could not be found.",
            404,
        )

    return check_category_ownership(question.category, user_id)


def validate_question_category(data, user_id):
    """Validate that a question references a category owned by the user."""
    category_id = data.get("category_id")

    if category_id is None:
        return error_response(
            "category_id is required.",
            400,
        )

    category, error = get_category_or_404(category_id)

    if error:
        return error

    return check_category_ownership(category, user_id)


# ---------------------------------------------------------------------------
# Category endpoints
# ---------------------------------------------------------------------------

@api_bp.route("/categories", methods=["GET"])
@jwt_required()
def list_categories():
    """Return a paginated list of categories."""
    pagination, error = get_pagination_args()

    if error:
        return error

    page, per_page = pagination

    result = (
        Category.query
        .order_by(Category.id.asc())
        .paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
    )

    return pagination_response(result, categories_schema)


@api_bp.route("/categories/<int:category_id>", methods=["GET"])
@jwt_required()
def get_category(category_id):
    """Return a single category by its ID."""
    category, error = get_category_or_404(category_id)

    if error:
        return error

    return jsonify(category_schema.dump(category)), 200


@api_bp.route("/categories", methods=["POST"])
@jwt_required()
def create_category():
    """Create a category owned by the authenticated user."""
    data, error = read_json_object()

    if error:
        return error

    try:
        validated_data = category_schema.load(data)

    except ValidationError as exc:
        return error_response(
            "Validation failed.",
            400,
            exc.messages,
        )

    category = Category(
        **validated_data,
        user_id=get_current_user_id(),
    )

    db.session.add(category)
    error = commit_changes()

    if error:
        return error

    return jsonify(category_schema.dump(category)), 201


def update_category_record(category_id, partial=False):
    """Shared implementation for category PUT and PATCH operations."""
    category, error = get_category_or_404(category_id)

    if error:
        return error

    ownership_error = check_category_ownership(
        category,
        get_current_user_id(),
    )

    if ownership_error:
        return ownership_error

    data, error = read_json_object()

    if error:
        return error

    # Do not permit clients to transfer category ownership.
    if "user_id" in data:
        return error_response(
            "user_id cannot be changed.",
            400,
        )

    try:
        validated_data = category_schema.load(
            data,
            partial=partial,
        )

    except ValidationError as exc:
        return error_response(
            "Validation failed.",
            400,
            exc.messages,
        )

    for key, value in validated_data.items():
        setattr(category, key, value)

    error = commit_changes()

    if error:
        return error

    return jsonify(category_schema.dump(category)), 200


@api_bp.route("/categories/<int:category_id>", methods=["PUT"])
@jwt_required()
def replace_category(category_id):
    """Replace a category's editable fields."""
    return update_category_record(category_id, partial=False)


@api_bp.route("/categories/<int:category_id>", methods=["PATCH"])
@jwt_required()
def patch_category(category_id):
    """Partially update a category."""
    return update_category_record(category_id, partial=True)


@api_bp.route("/categories/<int:category_id>", methods=["DELETE"])
@jwt_required()
def delete_category(category_id):
    """Delete a category owned by the authenticated user."""
    category, error = get_category_or_404(category_id)

    if error:
        return error

    ownership_error = check_category_ownership(
        category,
        get_current_user_id(),
    )

    if ownership_error:
        return ownership_error

    db.session.delete(category)
    error = commit_changes()

    if error:
        return error

    return jsonify({"message": "Category deleted successfully."}), 200


# ---------------------------------------------------------------------------
# Question endpoints
# ---------------------------------------------------------------------------

@api_bp.route("/questions", methods=["GET"])
@jwt_required()
def list_questions():
    """
    Return a paginated list of questions.

    Optional filters:
        category_id
        difficulty
        question_type
    """
    pagination, error = get_pagination_args()

    if error:
        return error

    page, per_page = pagination

    query = Question.query

    # Apply optional category filtering.
    category_id = request.args.get("category_id")

    if category_id is not None:
        if not category_id.isdigit() or int(category_id) < 1:
            return error_response(
                "category_id must be a positive integer.",
                400,
            )

        query = query.filter(
            Question.category_id == int(category_id)
        )

    # Apply optional difficulty filtering.
    difficulty = request.args.get("difficulty")

    if difficulty is not None:
        if difficulty not in ("easy", "medium", "hard"):
            return error_response(
                "difficulty must be easy, medium, or hard.",
                400,
            )

        query = query.filter(
            Question.difficulty == difficulty
        )

    # Apply optional question-type filtering.
    question_type = request.args.get("question_type")

    if question_type is not None:
        if question_type not in ("multiple", "boolean"):
            return error_response(
                "question_type must be multiple or boolean.",
                400,
            )

        query = query.filter(
            Question.question_type == question_type
        )

    result = (
        query
        .order_by(Question.id.asc())
        .paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
    )

    return pagination_response(result, questions_schema)


@api_bp.route("/questions/<int:question_id>", methods=["GET"])
@jwt_required()
def get_question(question_id):
    """Return a single question by ID."""
    question, error = get_question_or_404(question_id)

    if error:
        return error

    return jsonify(question_schema.dump(question)), 200


@api_bp.route("/questions", methods=["POST"])
@jwt_required()
def create_question():
    """Create a question in a category owned by the authenticated user."""
    data, error = read_json_object()

    if error:
        return error

    user_id = get_current_user_id()

    # Prevent users from adding questions to categories they do not own.
    category_error = validate_question_category(data, user_id)

    if category_error:
        return category_error

    try:
        validated_data = question_schema.load(data)

    except ValidationError as exc:
        return error_response(
            "Validation failed.",
            400,
            exc.messages,
        )

    question = Question(**validated_data)

    db.session.add(question)
    error = commit_changes()

    if error:
        return error

    return jsonify(question_schema.dump(question)), 201


# ---------------------------------------------------------------------------
# AI question generation
# ---------------------------------------------------------------------------

@api_bp.route("/questions/generate", methods=["POST"])
@jwt_required()
def generate_question():
    """
    Generate one AI trivia question and save it.

    Expected JSON:
        {
            "category_id": 1,
            "difficulty": "medium",
            "question_type": "multiple"
        }
    """
    data, error = read_json_object()

    if error:
        return error

    # Validate category ID strictly before database lookup.
    category_id = data.get("category_id")

    if type(category_id) is not int or category_id < 1:
        return error_response(
            "category_id must be a positive integer.",
            400,
        )

    # Apply defaults and validate options before calling the AI service.
    difficulty = data.get("difficulty", "medium")
    question_type = data.get("question_type", "multiple")

    if difficulty not in ("easy", "medium", "hard"):
        return error_response(
            "difficulty must be easy, medium, or hard.",
            400,
        )

    if question_type not in ("multiple", "boolean"):
        return error_response(
            "question_type must be multiple or boolean.",
            400,
        )

    # Confirm the category exists.
    category, error = get_category_or_404(category_id)

    if error:
        return error

    # Verify ownership before making a potentially billable AI request.
    user_id = get_current_user_id()
    ownership_error = check_category_ownership(category, user_id)

    if ownership_error:
        return ownership_error

    # Generate one question using the existing external API service.
    try:
        generated_data = generate_ai_question(
            category_name=category.name,
            difficulty=difficulty,
            question_type=question_type,
        )

    except ValueError as exc:
        return error_response(str(exc), 400)

    except AITriviaError as exc:
        # Keep provider internals and API credentials out of responses.
        if "not configured" in str(exc).lower():
            return error_response(
                "AI question generation is not configured.",
                503,
            )

        return error_response(
            "Unable to generate a question right now.",
            502,
        )

    # Check the AI response before attempting database insertion.
    if not isinstance(generated_data, dict):
        return error_response(
            "The AI service returned an invalid question.",
            502,
        )

    if (
        generated_data.get("difficulty") != difficulty
        or generated_data.get("question_type") != question_type
    ):
        return error_response(
            "The AI service returned a question with unexpected settings.",
            502,
        )

    # Always use the verified category ID, never one supplied by the AI.
    generated_data["category_id"] = category.id

    # Validate the AI-generated data using the existing question schema.
    try:
        validated_data = question_schema.load(generated_data)

    except ValidationError as exc:
        return error_response(
            "The AI service generated an invalid question.",
            502,
            exc.messages,
        )

    # Save the question only after successful schema validation.
    question = Question(**validated_data)
    db.session.add(question)

    error = commit_changes()

    if error:
        return error

    return jsonify(question_schema.dump(question)), 201


def update_question_record(question_id, partial=False):
    """
    Shared implementation for question PUT and PATCH operations.

    Verify ownership before updating. If category_id changes, the new
    category must also belong to the authenticated user.
    """
    question, error = get_question_or_404(question_id)

    if error:
        return error

    user_id = get_current_user_id()

    ownership_error = check_question_ownership(question, user_id)

    if ownership_error:
        return ownership_error

    data, error = read_json_object()

    if error:
        return error

    # Prevent clients from changing IDs, timestamps, or ownership.
    protected_fields = {
        "id",
        "created_at",
        "updated_at",
        "user_id",
    }

    if protected_fields.intersection(data):
        return error_response(
            "Protected fields cannot be changed.",
            400,
        )

    # Merge PATCH data with existing values for complete validation.
    if partial:
        current_data = question_schema.dump(question)
        current_data.update(data)

        # Only allow fields that the schema accepts as input.
        data_to_validate = {
            key: value
            for key, value in current_data.items()
            if key in question_schema.load_fields
        }
    else:
        data_to_validate = data

    # Validate the target category and ownership.
    category_error = validate_question_category(
        data_to_validate,
        user_id,
    )

    if category_error:
        return category_error

    try:
        validated_data = question_schema.load(
            data_to_validate,
            partial=False,
        )

    except ValidationError as exc:
        return error_response(
            "Validation failed.",
            400,
            exc.messages,
        )

    # Apply only validated values to the existing record.
    for key, value in validated_data.items():
        setattr(question, key, value)

    error = commit_changes()

    if error:
        return error

    return jsonify(question_schema.dump(question)), 200


@api_bp.route("/questions/<int:question_id>", methods=["PUT"])
@jwt_required()
def replace_question(question_id):
    """Replace a question's editable fields."""
    return update_question_record(question_id, partial=False)


@api_bp.route("/questions/<int:question_id>", methods=["PATCH"])
@jwt_required()
def patch_question(question_id):
    """Partially update a question."""
    return update_question_record(question_id, partial=True)


@api_bp.route("/questions/<int:question_id>", methods=["DELETE"])
@jwt_required()
def delete_question(question_id):
    """Delete a question owned by the authenticated user."""
    question, error = get_question_or_404(question_id)

    if error:
        return error

    ownership_error = check_question_ownership(
        question,
        get_current_user_id(),
    )

    if ownership_error:
        return ownership_error

    db.session.delete(question)
    error = commit_changes()

    if error:
        return error

    return jsonify({"message": "Question deleted successfully."}), 200
