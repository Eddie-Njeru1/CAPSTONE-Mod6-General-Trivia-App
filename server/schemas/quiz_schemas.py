
"""
Marshmallow schemas for trivia categories and questions.

Purpose:
    Validate incoming JSON payloads before API routes save data to the
    database, and serialize database objects for the React frontend.

Responsibilities:
    - Validate category names and descriptions.
    - Validate question fields, types, difficulty, and answer rules.
    - Reject empty or whitespace-only text.
    - Keep database-generated fields read-only.
    - Leave authentication, authorization, category ownership, and database
      operations to the API routes.
"""

from marshmallow import (
    Schema,
    fields,
    validate,
    validates_schema,
    ValidationError,
)


def validate_not_blank(value):
    """Reject strings containing only whitespace."""
    if not value.strip():
        raise ValidationError("This field cannot be blank.")


def validate_optional_description(value):
    """
    Convert a blank optional description to None.

    This matches the Category model's handling of empty descriptions.
    """
    if value is not None and not value.strip():
        return None
    return value


class CategorySchema(Schema):
    """
    Validate category input and serialize category objects.

    Names are required. Descriptions are optional. IDs and timestamps
    are managed by the database and cannot be supplied as writable fields.
    """

    # The database generates the category ID.
    id = fields.Integer(dump_only=True)

    # Category names must be nonblank and no longer than 80 characters.
    name = fields.String(
        required=True,
        validate=[
            validate.Length(
                min=1,
                max=80,
                error="Name must contain 1 to 80 characters.",
            ),
            validate_not_blank,
        ],
    )

    # Descriptions are optional, nullable, and limited to 255 characters.
    description = fields.String(
        allow_none=True,
        load_default=None,
        validate=[
            validate.Length(max=255),
            validate_optional_description,
        ],
    )

    # Timestamps are generated and updated by the database.
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class QuestionSchema(Schema):
    """
    Validate question input and serialize question objects.

    Checks required fields, supported types and difficulty levels, answer
    lengths, and relationships between correct and incorrect answers.

    The API route must separately verify category existence and ownership.
    """

    # The database generates the question ID.
    id = fields.Integer(dump_only=True)

    # Question text must be nonblank and no longer than 500 characters.
    text = fields.String(
        required=True,
        validate=[
            validate.Length(min=1, max=500),
            validate_not_blank,
        ],
    )

    # Only multiple-choice and true/false question types are supported.
    question_type = fields.String(
        required=True,
        validate=validate.OneOf(["multiple", "boolean"]),
    )

    # Only the supported difficulty levels are accepted.
    difficulty = fields.String(
        required=True,
        validate=validate.OneOf(["easy", "medium", "hard"]),
    )

    # The correct answer must be nonblank and no longer than 255 characters.
    correct_answer = fields.String(
        required=True,
        validate=[
            validate.Length(min=1, max=255),
            validate_not_blank,
        ],
    )

    # Incorrect answers must be a list of nonblank strings.
    # Cross-field validation below enforces the correct number for each type.
    incorrect_answers = fields.List(
        fields.String(
            validate=[
                validate.Length(min=1, max=255),
                validate_not_blank,
            ]
        ),
        required=True,
        validate=validate.Length(min=1, max=3),
    )

    # A positive category ID is required.
    # The API route must also verify that the category exists and belongs
    # to the authenticated user.
    category_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
    )

    # Timestamps are generated and updated by the database.
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    @validates_schema
    def validate_answer_rules(self, data, **kwargs):
        """
        Validate rules involving multiple question fields.

        Multiple-choice questions need exactly three incorrect answers.
        True/false questions need one incorrect answer opposite to the correct
        answer. The correct answer cannot also appear among incorrect answers,
        and incorrect answers cannot repeat.
        """
        question_type = data.get("question_type")
        correct_answer = data.get("correct_answer")
        incorrect_answers = data.get("incorrect_answers")

        # Let Marshmallow report missing or invalid fields separately.
        if (
            question_type is None
            or correct_answer is None
            or incorrect_answers is None
        ):
            return

        # Trim whitespace before comparing answers.
        correct_answer = correct_answer.strip()
        cleaned_incorrect = [
            answer.strip() for answer in incorrect_answers
        ]

        # The correct answer must not also be listed as incorrect.
        if correct_answer in cleaned_incorrect:
            raise ValidationError(
                {
                    "incorrect_answers": [
                        "The correct answer cannot also be an incorrect answer."
                    ]
                }
            )

        # Incorrect answers must remain unique after trimming whitespace.
        if len(set(cleaned_incorrect)) != len(cleaned_incorrect):
            raise ValidationError(
                {
                    "incorrect_answers": [
                        "Incorrect answers must not repeat."
                    ]
                }
            )

        # Multiple-choice questions require exactly three incorrect answers.
        if question_type == "multiple" and len(cleaned_incorrect) != 3:
            raise ValidationError(
                {
                    "incorrect_answers": [
                        "Multiple-choice questions need exactly 3 incorrect answers."
                    ]
                }
            )

        # True/false answers must use the capitalization expected by the model.
        if question_type == "boolean":
            if correct_answer not in ("True", "False"):
                raise ValidationError(
                    {
                        "correct_answer": [
                            'True/false answers must be "True" or "False".'
                        ]
                    }
                )

            # The only incorrect answer must be the opposite of the correct one.
            expected_incorrect = [
                "False" if correct_answer == "True" else "True"
            ]

            if cleaned_incorrect != expected_incorrect:
                raise ValidationError(
                    {
                        "incorrect_answers": [
                            "For this true/false question, the incorrect answer "
                            f"must be {expected_incorrect}."
                        ]
                    }
                )


# Reusable instances keep validation and serialization consistent across routes.
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)

question_schema = QuestionSchema()
questions_schema = QuestionSchema(many=True)
