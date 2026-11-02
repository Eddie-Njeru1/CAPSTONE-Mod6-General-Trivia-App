"""
Trivia API Routes
=================

This module defines the REST API endpoints for managing trivia categories
and questions.

Features:
    - JWT authentication for every endpoint.
    - Category CRUD (Create, Read, Update, Delete).
    - Question CRUD (Create, Read, Update, Delete).
    - Ownership checks to prevent users modifying another user's data.
    - Pagination for category and question lists.
    - Optional category filtering: ?mine=true returns only the categories
      owned by the authenticated user (used by the dashboard).
    - Optional question filtering by category, difficulty, and type.
    - Marshmallow schema validation for incoming data.
    - Consistent JSON responses and database error handling.

Blueprint registration:
    The application registers this blueprint with the /api URL prefix.

    Example endpoints:
        GET    /api/categories
        POST   /api/categories
        GET    /api/questions
        POST   /api/questions

Authentication:
    Requests must include a valid JWT access token in the Authorization header.

    Example:
        Authorization: Bearer <access_token>

Ownership:
    Categories belong to the user who created them.
    Questions inherit ownership through their associated category.
    A user can modify or delete only their own categories and questions.
"""

from flask import Blueprint, jsonify, request
from utils.auth import (
    active_user_required,
    get_current_user,
    get_current_user_id,
)
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from models import Category, Question, db
from schemas.quiz_schemas import CategorySchema, QuestionSchema



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
        tuple: (parsed_data, None) on success, or (None, error_response)
        when the request body is invalid.
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
        tuple: JSON containing the records and pagination metadata.
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
    Commit pending database changes and handle expected database errors.

    Returns:
        None when the commit succeeds, or an error response on failure.

    A rollback is performed whenever the commit fails so the session is
    not left in a failed transaction state.
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
    """
    Retrieve a category by ID.

    Args:
        category_id (int): ID of the category to retrieve.

    Returns:
        tuple: (category, None) if found, or (None, error_response).
    """
    category = db.session.get(Category, category_id)

    if category is None:
        return None, error_response("Category not found.", 404)

    return category, None


def get_question_or_404(question_id):
    """
    Retrieve a question by ID.

    Args:
        question_id (int): ID of the question to retrieve.

    Returns:
        tuple: (question, None) if found, or (None, error_response).
    """
    question = db.session.get(Question, question_id)

    if question is None:
        return None, error_response("Question not found.", 404)

    return question, None


def check_category_ownership(category, user_id):
    """
    Allow the resource owner or an administrator to manage a category.

    The current user's role is retrieved from the database rather than
    trusted from the JWT token.
    """
    current_user = get_current_user()

    # Allow the owner or an active administrator to proceed.
    if category.user_id != user_id and current_user.role != "admin":
        return jsonify({
            "error": "You do not have permission to access this category."
        }), 403

    return None


def check_question_ownership(question, user_id):
    """
    Check ownership of a question through its associated category.

    Questions do not store their own user ID. Their category determines
    which user is allowed to manage them.

    Args:
        question: Question database model instance.
        user_id (int): ID of the authenticated user.

    Returns:
        None when the user owns the question, or an error response.
    """
    if question.category is None:
        return error_response(
            "The question's category could not be found.",
            404,
        )

    return check_category_ownership(question.category, user_id)


def validate_question_category(data, user_id):
    """
    Validate that a question references a category owned by the user.

    This check is used during question creation and updates, including
    attempts to move a question into a different category.
    """
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
@active_user_required
def list_categories():
    """
    GET /api/categories

    Return a paginated list of categories.

    By default every category is returned, because any authenticated user
    may read them. Use mine=true to see only the categories the current
    user owns, which is what a "my categories" screen needs.

    Query parameters:
        page (optional): Page number; defaults to 1.
        per_page (optional): Page size; defaults to 10.
        mine (optional): Set to "true" to return only the authenticated
            user's own categories. Any other value returns all categories.

    Returns:
        200: Serialized categories and pagination metadata.
        400: Invalid pagination parameters.
        401: Missing or invalid authentication token.
    """
    pagination, error = get_pagination_args()

    if error:
        return error

    page, per_page = pagination

    # Start with every category. When the client asks for mine=true, keep only
    # the categories owned by the user in the verified JWT.
    query = Category.query

    if request.args.get("mine") == "true":
        query = query.filter_by(user_id=get_current_user_id())

    result = (
        query
        .order_by(Category.id.asc())
        .paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )
    )

    return pagination_response(result, categories_schema)


@api_bp.route("/categories/<int:category_id>", methods=["GET"])
@active_user_required
def get_category(category_id):
    """
    GET /api/categories/<category_id>

    Return a single category by its ID.

    Returns:
        200: Serialized category.
        401: Missing or invalid authentication token.
        404: Category does not exist.
    """
    category, error = get_category_or_404(category_id)

    if error:
        return error

    return jsonify(category_schema.dump(category)), 200


@api_bp.route("/categories", methods=["POST"])
@active_user_required
def create_category():
    """
    POST /api/categories

    Create a category owned by the authenticated user.

    The user's ID comes from the verified JWT, not the request body.

    Returns:
        201: Newly created category.
        400: Invalid JSON or schema validation failure.
        401: Missing or invalid authentication token.
        409: Database uniqueness or integrity conflict.
    """
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
    """
    Shared implementation for category PUT and PATCH operations.

    Args:
        category_id (int): ID of the category to update.
        partial (bool): True for partial updates, False for full updates.

    Returns:
        200: Updated category.
        400: Invalid request data.
        403: Category belongs to another user.
        404: Category does not exist.
        409: Database conflict.
    """
    category, error = get_category_or_404(category_id)

    if error:
        return error

    # Verify ownership before changing any category fields.
    ownership_error = check_category_ownership(
        category,
        get_current_user_id(),
    )

    if ownership_error:
        return ownership_error

    data, error = read_json_object()

    if error:
        return error

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

    # Apply only the fields accepted by the schema.
    for key, value in validated_data.items():
        setattr(category, key, value)

    error = commit_changes()

    if error:
        return error

    return jsonify(category_schema.dump(category)), 200


@api_bp.route("/categories/<int:category_id>", methods=["PUT"])
@active_user_required
def replace_category(category_id):
    """
    PUT /api/categories/<category_id>

    Replace the editable fields of a category.

    The request must provide all required schema fields.
    """
    return update_category_record(category_id, partial=False)


@api_bp.route("/categories/<int:category_id>", methods=["PATCH"])
@active_user_required
def edit_category(category_id):
    """
    PATCH /api/categories/<category_id>

    Update only the category fields supplied in the request.
    """
    return update_category_record(category_id, partial=True)


@api_bp.route("/categories/<int:category_id>", methods=["DELETE"])
@active_user_required
def delete_category(category_id):
    """
    DELETE /api/categories/<category_id>

    Delete a category owned by the authenticated user.

    Related questions may also be deleted according to the configured
    SQLAlchemy relationships and database foreign-key behavior.
    """
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
@active_user_required
def list_questions():
    """
    GET /api/questions

    Return a paginated list of questions.

    Optional query parameters:
        page: Page number, starting at 1.
        per_page: Number of records per page, from 1 to 100.
        category_id: Filter questions by category ID.
        difficulty: Filter questions by difficulty.
        question_type: Filter questions by question type.

    Returns:
        200: Serialized questions and pagination metadata.
        400: Invalid pagination or category filter.
        401: Missing or invalid authentication token.
    """
    pagination, error = get_pagination_args()

    if error:
        return error

    page, per_page = pagination
    query = Question.query

    category_id = request.args.get("category_id")
    difficulty = request.args.get("difficulty")
    question_type = request.args.get("question_type")

    # Validate the category filter before using it in the query.
    if category_id is not None:
        if not category_id.isdigit() or int(category_id) < 1:
            return error_response(
                "category_id must be a positive integer.",
                400,
            )

        query = query.filter(
            Question.category_id == int(category_id)
        )

    # Apply optional filters. The schema and model validate allowed values
    # when records are created or updated.
    if difficulty:
        query = query.filter(
            Question.difficulty == difficulty
        )

    if question_type:
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
@active_user_required
def get_question(question_id):
    """
    GET /api/questions/<question_id>

    Return a single question by ID.
    """
    question, error = get_question_or_404(question_id)

    if error:
        return error

    return jsonify(question_schema.dump(question)), 200


@api_bp.route("/questions", methods=["POST"])
@active_user_required
def create_question():
    """
    POST /api/questions

    Create a question in a category owned by the authenticated user.

    Returns:
        201: Newly created question.
        400: Invalid JSON, schema data, or category reference.
        401: Missing or invalid authentication token.
        403: Category belongs to another user.
        404: Referenced category does not exist.
        409: Database integrity conflict.
    """
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


def update_question_record(question_id, partial=False):
    """
    Shared implementation for question PUT and PATCH operations.

    Before updating, this function verifies that the authenticated user
    owns the question's category. If category_id changes, the new category
    must also belong to that user.

    Args:
        question_id (int): ID of the question to update.
        partial (bool): True for PATCH, False for PUT.

    Returns:
        200: Updated question.
        400: Invalid request data.
        403: User does not own the question or target category.
        404: Question or category does not exist.
        409: Database integrity conflict.
    """
    question, error = get_question_or_404(question_id)

    if error:
        return error

    user_id = get_current_user_id()

    # Check ownership of the question before accepting modifications.
    ownership_error = check_question_ownership(question, user_id)

    if ownership_error:
        return ownership_error

    data, error = read_json_object()

    if error:
        return error

    # Clients cannot assign identifiers, timestamps, or ownership fields.
    # Check submitted fields only, so existing database-generated fields
    # do not accidentally cause valid PATCH requests to fail.
    forbidden_fields = {
        "id",
        "created_at",
        "updated_at",
        "user_id",
    }

    if forbidden_fields.intersection(data):
        return error_response(
            "Identifier and ownership fields cannot be changed.",
            400,
        )

    if partial:
        # Serialize the existing question to preserve unchanged fields.
        dumped_data = question_schema.dump(question)

        # Keep only fields accepted by the input schema.
        # This excludes output-only fields such as id and timestamps.
        merged_data = {
            key: value
            for key, value in dumped_data.items()
            if key in question_schema.load_fields
        }

        # Apply the fields supplied in the PATCH request.
        merged_data.update(data)
    else:
        # PUT validates the complete request supplied by the client.
        merged_data = data
    # Verify ownership of the selected category, including if the client
    # attempts to move the question to a different category.
    category_error = validate_question_category(
        merged_data,
        user_id,
    )

    if category_error:
        return category_error

    try:
        validated_data = question_schema.load(merged_data)

    except ValidationError as exc:
        return error_response(
            "Validation failed.",
            400,
            exc.messages,
        )

    # Update only fields accepted by the schema.
    for key, value in validated_data.items():
        setattr(question, key, value)

    error = commit_changes()

    if error:
        return error

    return jsonify(question_schema.dump(question)), 200


@api_bp.route("/questions/<int:question_id>", methods=["PUT"])
@active_user_required
def replace_question(question_id):
    """
    PUT /api/questions/<question_id>

    Replace the editable fields of an existing question.

    All required question fields must be present in the request.
    """
    return update_question_record(question_id, partial=False)


@api_bp.route("/questions/<int:question_id>", methods=["PATCH"])
@active_user_required
def edit_question(question_id):
    """
    PATCH /api/questions/<question_id>

    Update selected fields of an existing question.

    Unchanged fields are preserved and the resulting complete question
    is validated before the database is updated.
    """
    return update_question_record(question_id, partial=True)


@api_bp.route("/questions/<int:question_id>", methods=["DELETE"])
@active_user_required
def delete_question(question_id):
    """
    DELETE /api/questions/<question_id>

    Delete a question only if its category belongs to the current user.
    """
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