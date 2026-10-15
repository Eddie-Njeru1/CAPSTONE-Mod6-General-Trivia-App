"""
Marshmallow schema for safely serializing user information.

This module exposes the public user fields needed by the API.
Password hashes are never returned in serialized responses.
"""

from marshmallow import Schema, fields, validate


class UserSchema(Schema):
    """Serialize public user information without sensitive credentials."""

    # The database assigns the user's ID.
    id = fields.Integer(dump_only=True)

    # Username is part of the public user profile.
    username = fields.String(
        required=True,
        validate=validate.Length(min=1, max=80),
    )

    # Email is public account information.
    email = fields.Email(
        required=True,
        validate=validate.Length(max=254),
    )

    # Password hashes must never appear in API responses.
    password_hash = fields.String(load_only=True)

    # The database manages the creation timestamp.
    created_at = fields.DateTime(dump_only=True)


# Reusable schema for one user.
user_schema = UserSchema()

# Reusable schema for multiple users.
users_schema = UserSchema(many=True)