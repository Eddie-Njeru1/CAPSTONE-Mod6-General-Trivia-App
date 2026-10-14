
"""
Marshmallow schemas for safely serializing user information.

This module exposes public user fields to API responses.
Password values and password hashes must never be returned.
"""

from marshmallow import Schema, fields, validate


class UserSchema(Schema):
    """Serialize public user information without sensitive credentials."""

    # The database assigns the user's ID.
    id = fields.Integer(dump_only=True)

    # Email is public account information, not an authentication secret.
    email = fields.Email(
        required=True,
        validate=validate.Length(max=254),
    )

    # Timestamps are generated and managed by the database.
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


# Reusable schema for serializing one user or validating public user data.
user_schema = UserSchema()

# Reusable schema for serializing a list of users.
users_schema = UserSchema(many=True)
