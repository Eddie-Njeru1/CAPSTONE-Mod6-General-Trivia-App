"""
Marshmallow schemas for the Phase 3 admin API.

This module defines the response schemas used by the administrator
endpoints for:

- User management and user-related counts
- Dashboard statistics
- User filtering
- Pagination metadata

Sensitive fields such as password_hash are intentionally excluded
from every response schema.
"""

from marshmallow import Schema, fields, validate


class AdminUserSchema(Schema):
    """
    Serialize user information for the admin user-management view.

    The schema exposes account information that an administrator needs
    while deliberately excluding password_hash.
    """

    id = fields.Int(dump_only=True)

    username = fields.Str(
        dump_only=True,
    )

    email = fields.Email(
        dump_only=True,
    )

    role = fields.Str(
        dump_only=True,
        validate=validate.OneOf(["user", "admin"]),
    )

    is_active = fields.Bool(
        dump_only=True,
    )

    created_at = fields.DateTime(
        dump_only=True,
    )

    last_login_at = fields.DateTime(
        dump_only=True,
        allow_none=True,
    )

    login_count = fields.Int(
        dump_only=True,
    )

    # These fields represent the amount of data owned by the user.
    # They are populated by the admin API query when available.
    category_count = fields.Int(
        dump_only=True,
    )

    question_count = fields.Int(
        dump_only=True,
    )


class AdminUserUpdateSchema(Schema):
    """
    Validate fields that an administrator can change on a user.

    This schema is intended for PATCH requests, so all fields are
    optional. The administrator can change account status or role
    without submitting the user's complete record.
    """

    role = fields.Str(
        validate=validate.OneOf(["user", "admin"]),
    )

    is_active = fields.Bool()


class AdminUserFilterSchema(Schema):
    """
    Validate optional filters used when listing users.

    These filters allow the admin endpoint to narrow the user list
    by role and account status.
    """

    role = fields.Str(
        allow_none=True,
        validate=validate.OneOf(["user", "admin"]),
    )

    is_active = fields.Bool(
        allow_none=True,
    )

    search = fields.Str(
        allow_none=True,
        validate=validate.Length(max=120),
    )


class AdminStatsSchema(Schema):
    """
    Serialize the statistics displayed by the admin dashboard.

    The values are calculated by the admin API from the current
    database contents.
    """

    total_users = fields.Int(
        dump_only=True,
    )

    active_users = fields.Int(
        dump_only=True,
    )

    inactive_users = fields.Int(
        dump_only=True,
    )

    admin_users = fields.Int(
        dump_only=True,
    )

    total_categories = fields.Int(
        dump_only=True,
    )

    total_questions = fields.Int(
        dump_only=True,
    )


class AdminPaginationSchema(Schema):
    """
    Serialize pagination information returned by admin list endpoints.
    """

    page = fields.Int(
        dump_only=True,
    )

    per_page = fields.Int(
        dump_only=True,
    )

    total = fields.Int(
        dump_only=True,
    )

    pages = fields.Int(
        dump_only=True,
    )

    has_next = fields.Bool(
        dump_only=True,
    )

    has_prev = fields.Bool(
        dump_only=True,
    )


class AdminUserListSchema(Schema):
    """
    Serialize a paginated administrator user-list response.

    The users field contains the individual user records while the
    pagination field describes the current result set.
    """

    users = fields.List(
        fields.Nested(AdminUserSchema),
        dump_only=True,
    )

    pagination = fields.Nested(
        AdminPaginationSchema,
        dump_only=True,
    )


# Reusable schema instances.
admin_user_schema = AdminUserSchema()
admin_users_schema = AdminUserSchema(many=True)

admin_user_update_schema = AdminUserUpdateSchema()

admin_user_filter_schema = AdminUserFilterSchema()

admin_stats_schema = AdminStatsSchema()

admin_user_list_schema = AdminUserListSchema()