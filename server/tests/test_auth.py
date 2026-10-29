# This tests for authentication by testing user registration, login, logout, token validation, password security and user model validation. 

from datetime import datetime, timedelta
import pytest
from flask_jwt_extended import create_access_token
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from models import User, db

# Test user registration: POST /api/auth/signup
class TestSignup:
    def test_signup_creates_user(self, client, user_data):
        response = client.post("/api/auth/signup", json=user_data) # Check that valid registration creates a user successfully
        assert response.status_code == 201
        # Check that the response contains the expected user details.
        user = response.get_json()["user"]
        assert user["username"] == "edd"
        assert user["email"] == "edd@email.com"
        assert "id" in user and "created_at" in user

    def test_signup_returns_a_working_token(self, client, user_data):
        body = client.post("/api/auth/signup", json=user_data).get_json() # Check that registration also provides a usable login token
        assert body["access_token"]
        # Send the token to a protected endpoint to confirm it works.
        headers = {"Authorization": f"Bearer {body['access_token']}"}
        me = client.get("/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.get_json()["user"]["username"] == "edd"

    def test_signup_never_returns_the_password_or_hash(self, client, user_data):
        body = client.post("/api/auth/signup", json=user_data).get_json()["user"] # Ensure the response never exposes the password or its hash.
        assert "password" not in body
        assert "password_hash" not in body

    def test_signup_stores_a_hash_not_the_password(self, client, user_data):
        client.post("/api/auth/signup", json=user_data) # Check that the database stores a hashed password.
        user = User.query.filter_by(username="edd").first()
        # The stored value must differ from the original password.
        assert user.password_hash != user_data["password"]
        # The hash must still allow the correct password to be verified.
        assert user.check_password(user_data["password"])

    def test_signup_lowercases_and_trims_input(self, client, user_data):
        user_data.update(username="  edd  ", email="  Edd@Email.COM ") # Check that extra spaces are removed and email is lowercased.
        user = client.post("/api/auth/signup", json=user_data).get_json()["user"]
        assert user["username"] == "edd"
        assert user["email"] == "edd@email.com"

    # Run this test separately for each required field.
    @pytest.mark.parametrize("missing", ["username", "email", "password"])
    def test_signup_requires_every_field(self, client, user_data, missing):
        del user_data[missing] # Reject registration when a required field is missing.
        response = client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 400
        assert missing in response.get_json()["error"]

    # Test different invalid values using the same test function.
    @pytest.mark.parametrize(
        "field, value",
        [
            ("username", "ab"),          # Username is too short.
            ("username", "x" * 51),      # Username is too long.
            ("email", "not-an-email"),   # Email format is invalid.
            ("email", "missing@tld"),    # Email domain is invalid.
            ("password", "short"),       # Password is too short.
        ],
    )
    def test_signup_rejects_invalid_values(
        self, client, user_data, field, value
    ):
       
        user_data[field] = value # Reject values that do not meet the validation rules.
        response = client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 400
        assert "error" in response.get_json()

    def test_signup_rejects_non_text_values(self, client, user_data):
        user_data["username"] = 12345 # Reject fields containing values of the wrong data type.
        response = client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 400

    def test_signup_rejects_a_body_that_is_not_json(self, client):
        response = client.post("/api/auth/signup", data="just text") # Reject requests whose body is not valid JSON input.
        assert response.status_code == 400
        assert "json" in response.get_json()["error"].lower()

    def test_signup_rejects_duplicate_username(self, client, registered_user):
        duplicate = {**registered_user, "email": "other@mail.com"} # Prevent two accounts from using the same username.
        response = client.post("/api/auth/signup", json=duplicate)
        assert response.status_code == 409
        assert "username" in response.get_json()["error"].lower()

    def test_signup_rejects_duplicate_email_in_any_case(
        self, client, registered_user
    ):
        # Prevent duplicate emails even when letter casing differs.
        duplicate = {
            **registered_user,
            "username": "bob",
            "email": "EDD@EMAIL.COM",
        }
        response = client.post("/api/auth/signup", json=duplicate)
        assert response.status_code == 409
        assert "email" in response.get_json()["error"].lower()

    def test_signup_handles_a_duplicate_that_slips_past_the_checks(
        self, client, user_data, mocker
    ):
        """Check that a database uniqueness error returns a clean response.

        Two requests could pass the initial duplicate checks simultaneously.
        The database UNIQUE constraint must still prevent duplicate records.
        """
        # Simulate the database rejecting a duplicate during commit.
        mocker.patch.object(
            db.session,
            "commit",
            side_effect=IntegrityError("stmt", {}, Exception("dup")),
        )
        response = client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 409

# Test user login: POST /api/auth/login. Login uses email and password.
class TestLogin:
    def test_login_returns_token_and_user(self, client, registered_user):
        response = client.post(
            "/api/auth/login",
            json={"email": "edd@email.com", "password": "secret123"},
        ) # Check that valid credentials return a token and user details.
        assert response.status_code == 200
        body = response.get_json()
        assert body["access_token"]
        assert body["user"]["username"] == "edd"
        # Password hashes must never be included in the response.
        assert "password_hash" not in body["user"]

    def test_login_email_is_not_case_sensitive(self, client, registered_user):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "  EDD@Email.com ",
                "password": "secret123",
            },
        ) # Allow login when the email contains different letter casing.
        assert response.status_code == 200

    def test_login_rejects_wrong_password(self, client, registered_user):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "edd@email.com",
                "password": "wrong-password",
            },
        ) # Reject a login attempt with an incorrect password.
        assert response.status_code == 401
        assert "error" in response.get_json()

    def test_login_gives_the_same_error_for_an_unknown_email(
        self, client, registered_user
    ):
        # Avoid revealing whether an email address has an account.
        wrong_password = client.post(
            "/api/auth/login",
            json={
                "email": "edd@email.com",
                "password": "wrong-password",
            },
        )

        unknown_email = client.post(
            "/api/auth/login",
            json={
                "email": "ghost@email.com",
                "password": "secret123",
            },
        )
        # Both failures should return the same status and error response.
        assert unknown_email.status_code == 401
        assert unknown_email.get_json() == wrong_password.get_json()

    @pytest.mark.parametrize("missing", ["email", "password"])
    def test_login_requires_both_fields(
        self, client, registered_user, missing
    ):
        # Reject login requests missing either required field.
        credentials = {
            "email": "edd@email.com",
            "password": "secret123",
        }
        del credentials[missing]
        response = client.post("/api/auth/login", json=credentials)
        assert response.status_code == 400

    def test_login_does_not_accept_a_username_in_place_of_the_email(
        self, client, registered_user
    ):
        # Ensure the login endpoint requires an email, not a username.
        response = client.post(
            "/api/auth/login",
            json={"username": "ann", "password": "secret123"},
        )
        assert response.status_code == 400

# Test the current-user endpoint: GET /api/auth/me
class TestMe:

    def test_me_returns_the_logged_in_user(self, client, auth_headers):
        # Return the user details associated with a valid token.
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json()["user"]["username"] == "edd"

    def test_me_requires_a_token(self, client):
        # Reject requests that do not include an authentication token
        response = client.get("/api/auth/me")
        assert response.status_code == 401
        assert response.get_json()["error"] == "Authentication required"

    def test_me_rejects_a_garbage_token(self, client):
        # Reject an invalid token.
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid token"

    def test_me_rejects_an_expired_token(self, client, registered_user):
        # Reject a token that has already expired
        user = User.query.filter_by(username="edd").first()

        # Create a token that expired one second ago.
        expired = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(seconds=-1),
        )

        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired}"},
        )
        assert response.status_code == 401
        assert response.get_json()["error"] == "Token has expired"

    def test_me_rejects_a_token_for_a_deleted_user(self, client, auth_headers):
        # Reject a valid token if its associated user no longer exists
        db.session.delete(User.query.filter_by(username="edd").first())
        db.session.commit()
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 401
        assert response.get_json()["error"] == "User not found"

# Test logout: POST /api/auth/logout
class TestLogout:

    def test_logout_succeeds_with_a_valid_token(self, client, auth_headers):
        # Allow a logged-in user to log out.
        response = client.post("/api/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json()["message"] == "Logged out"

    def test_token_stops_working_after_logout(self, client, auth_headers):
        """Ensure a revoked token cannot access protected endpoints."""
        # Revoke the current token.
        client.post("/api/auth/logout", headers=auth_headers)

        # Try using the same token after logout.
        response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 401
        assert response.get_json()["error"] == "Token has been revoked"

    def test_logout_requires_a_token(self, client):
        # Reject logout requests without an authentication token.
        response = client.post("/api/auth/logout")
        assert response.status_code == 401

    def test_logging_in_again_after_logout_gives_a_working_token(
        self, client, auth_headers
    ):
        # Check that a new login works after the previous token is revoked.
        client.post("/api/auth/logout", headers=auth_headers)

        # Log in again to obtain a fresh token.
        login = client.post(
            "/api/auth/login",
            json={"email": "edd@email.com", "password": "secret123"},
        )
        new_headers = {
            "Authorization": f"Bearer {login.get_json()['access_token']}"
        }
        assert client.get("/api/auth/me", headers=new_headers).status_code == 200

# Test the User model: models/user.py
class TestUserModel:

    def test_set_password_hashes_and_check_password_verifies(self, app):
        # Check that passwords are hashed and can be verified."""
        user = User(username="edd", email="edd@email.com")
        user.set_password("secret123")
        assert user.password_hash != "secret123"

        # bcrypt hashes normally start with "$2".
        assert user.password_hash.startswith("$2")
        assert user.check_password("secret123") is True
        assert user.check_password("wrong") is False

    def test_same_password_gives_different_hashes(self, app):
        # Confirm that bcrypt uses a different salt for each hash.
        first = User(username="aaa", email="a@a.co")
        second = User(username="bbb", email="b@b.co")
        first.set_password("secret123")
        second.set_password("secret123")

        # The same password should produce different stored hashes.
        assert first.password_hash != second.password_hash

    def test_set_password_rejects_short_passwords(self, app):
        # Ensure the model rejects passwords shorter than the minimum.
        with pytest.raises(ValueError):
            User(username="edd", email="edd@email.com").set_password("short")

    def test_validators_reject_bad_username_and_email(self, app):
        # Check that the model rejects invalid usernames and email addresses.
        with pytest.raises(ValueError):
            User(username="ab", email="edd@email.com")
        with pytest.raises(ValueError):
            User(username="edd", email="not-an-email")

    def test_database_rejects_duplicate_usernames(self, app):
        # Check that the database prevents duplicate usernames.
        # Add two users with the same username but different emails.
        for email in ("one@mail.com", "two@mail.com"):
            user = User(username="edd", email=email)
            user.set_password("secret123")
            db.session.add(user)

        # The database UNIQUE constraint should reject the transaction.
        with pytest.raises(IntegrityError):
            db.session.commit()

        # Reset the failed transaction before continuing.
        db.session.rollback()

    def test_database_rejects_a_too_short_username_even_without_the_validator(
        self, app
    ):
        # Check that the database CHECK constraint rejects short usernames.
        with pytest.raises(IntegrityError):
            # Insert directly into the database, bypassing model validation.
            db.session.execute(
                text(
                    "INSERT INTO users (username, email, password_hash) "
                    "VALUES ('ab', 'x@y.co', 'h')"
                )
            )
            db.session.commit()

        # Recover the session after the expected database error.
        db.session.rollback()

# Roles, login tracking, account deactivation and admin access
# Test that signup and login responses include the user's role
class TestRoleInResponses:

    def test_signup_returns_the_user_role(self, client, user_data):
        user = client.post("/api/auth/signup", json=user_data).get_json()["user"] # A new account should report the default role.
        assert user["role"] == "user"

    def test_login_returns_the_user_role(self, client, registered_user):
        response = client.post(
            "/api/auth/login",
            json={"email": "edd@email.com", "password": "secret123"},
        ) # The login response should include the role for the frontend.
        assert response.get_json()["user"]["role"] == "user"

    def test_me_returns_the_user_role(self, client, admin_headers):
        user = client.get("/api/auth/me", headers=admin_headers).get_json()["user"] # An admin's role should come back from /me.
        assert user["role"] == "admin"

    def test_responses_follow_the_agreed_user_shape(self, client, user_data):
        user = client.post("/api/auth/signup", json=user_data).get_json()["user"] # Only the contract fields are returned.
        assert set(user) == {"id", "username", "email", "role", "created_at"}

# Test that signup can never be used to become an admin
class TestSignupIgnoresRole:

    @pytest.mark.parametrize("requested", ["admin", "ADMIN", "superuser"])
    def test_signup_ignores_a_requested_role(self, client, user_data, requested):
        user_data["role"] = requested # Try to sneak a role in through the request body.
        response = client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 201
        assert response.get_json()["user"]["role"] == "user"

    def test_stored_role_is_user_after_a_role_request(self, client, user_data):
        user_data["role"] = "admin"
        client.post("/api/auth/signup", json=user_data)
        assert User.query.filter_by(username="edd").first().role == "user" # Check the database, not just the response.

# Test login tracking: last_login_at and login_count
class TestLoginTracking:

    def test_signup_counts_as_the_first_login(self, client, user_data):
        client.post("/api/auth/signup", json=user_data)
        user = User.query.filter_by(username="edd").first()
        assert user.login_count == 1
        assert user.last_login_at is not None

    def test_each_login_adds_one_to_the_count(self, client, registered_user):
        for _ in range(2): # Log in twice after signing up.
            client.post(
                "/api/auth/login",
                json={"email": "edd@email.com", "password": "secret123"},
            )
        assert User.query.filter_by(username="edd").first().login_count == 3

    def test_login_updates_last_login_at(self, client, registered_user):
        user = User.query.filter_by(username="edd").first()
        user.last_login_at = datetime(2000, 1, 1) # Set an old time to compare against.
        db.session.commit()
        client.post(
            "/api/auth/login",
            json={"email": "edd@email.com", "password": "secret123"},
        )
        db.session.refresh(user) # Reload the values saved by the route.
        assert user.last_login_at > datetime(2000, 1, 1)

    def test_failed_login_does_not_change_tracking(self, client, registered_user):
        client.post(
            "/api/auth/login",
            json={"email": "edd@email.com", "password": "wrong-password"},
        ) # A wrong password must not count as a login.
        assert User.query.filter_by(username="edd").first().login_count == 1

# Test account deactivation on login and on existing tokens
class TestDeactivatedAccounts:

    def test_deactivated_user_cannot_log_in(self, client, inactive_user):
        response = client.post(
            "/api/auth/login",
            json={"email": "gone@email.com", "password": "secret123"},
        )
        assert response.status_code == 403
        assert response.get_json() == {"error": "Account is deactivated"}

    def test_deactivated_login_does_not_change_tracking(self, client, inactive_user):
        client.post(
            "/api/auth/login",
            json={"email": "gone@email.com", "password": "secret123"},
        ) # A blocked login must not be counted.
        db.session.refresh(inactive_user)
        assert inactive_user.login_count == 0
        assert inactive_user.last_login_at is None

    def test_wrong_password_on_a_deactivated_account_gets_the_normal_401(
        self, client, inactive_user
    ):
        response = client.post(
            "/api/auth/login",
            json={"email": "gone@email.com", "password": "wrong-password"},
        ) # Account status is only revealed once the password is correct.
        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid email or password"

    def test_existing_token_is_refused_once_the_account_is_deactivated(
        self, client, auth_headers
    ):
        assert client.get("/api/auth/me", headers=auth_headers).status_code == 200
        user = User.query.filter_by(username="edd").first()
        user.is_active = False # Deactivate after the token was issued.
        db.session.commit()
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 403
        assert response.get_json()["error"] == "Account is deactivated"

    def test_reactivated_user_can_log_in_again(self, client, inactive_user):
        inactive_user.is_active = True
        db.session.commit()
        response = client.post(
            "/api/auth/login",
            json={"email": "gone@email.com", "password": "secret123"},
        )
        assert response.status_code == 200

# Register two throwaway routes that use the decorators, so the decorators are tested here without depending on the admin routes built elsewhere
@pytest.fixture
def guarded_routes(app):
    from flask import jsonify
    from utils.auth import active_user_required, admin_required

    @active_user_required
    def active_only():
        return jsonify({"ok": True})

    @admin_required
    def admin_only():
        return jsonify({"ok": True})

    app.add_url_rule("/test/active-only", "active_only", active_only) # must be added before the first request
    app.add_url_rule("/test/admin-only", "admin_only", admin_only)


# Test the @admin_required decorator in utils/auth.py
class TestAdminRequired:

    def test_no_token_returns_401(self, client, guarded_routes):
        response = client.get("/test/admin-only")
        assert response.status_code == 401
        assert response.get_json()["error"] == "Authentication required"

    def test_garbage_token_returns_401(self, client, guarded_routes):
        response = client.get(
            "/test/admin-only",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert response.status_code == 401

    def test_regular_user_returns_403(self, client, guarded_routes, other_headers):
        response = client.get("/test/admin-only", headers=other_headers)
        assert response.status_code == 403
        assert response.get_json() == {"error": "Admin access required"}

    def test_admin_is_allowed(self, client, guarded_routes, admin_headers):
        response = client.get("/test/admin-only", headers=admin_headers)
        assert response.status_code == 200

    def test_deactivated_admin_returns_403(self, client, guarded_routes, make_user, headers_for):
        user = make_user("boss", "boss@email.com", role="admin", is_active=False)
        response = client.get("/test/admin-only", headers=headers_for(user))
        assert response.status_code == 403
        assert response.get_json()["error"] == "Account is deactivated"

    def test_role_is_checked_in_the_database_on_every_request(
        self, client, guarded_routes, admin_user, admin_headers
    ):
        assert client.get("/test/admin-only", headers=admin_headers).status_code == 200
        admin_user.role = "user" # Demote after the token was issued.
        db.session.commit()
        response = client.get("/test/admin-only", headers=admin_headers)
        assert response.status_code == 403 # The old token no longer grants admin access.

    def test_token_for_a_deleted_user_returns_401(
        self, client, guarded_routes, admin_user, admin_headers
    ):
        db.session.delete(admin_user)
        db.session.commit()
        assert client.get("/test/admin-only", headers=admin_headers).status_code == 401

    def test_revoked_admin_token_returns_401(
        self, client, guarded_routes, admin_headers
    ):
        client.post("/api/auth/logout", headers=admin_headers)
        response = client.get("/test/admin-only", headers=admin_headers)
        assert response.status_code == 401
        assert response.get_json()["error"] == "Token has been revoked"


# Test the @active_user_required decorator in utils/auth.py
class TestActiveUserRequired:

    def test_no_token_returns_401(self, client, guarded_routes):
        assert client.get("/test/active-only").status_code == 401

    def test_active_user_is_allowed(self, client, guarded_routes, other_headers):
        assert client.get("/test/active-only", headers=other_headers).status_code == 200

    def test_deactivated_user_returns_403(self, client, guarded_routes, inactive_headers):
        response = client.get("/test/active-only", headers=inactive_headers)
        assert response.status_code == 403
        assert response.get_json()["error"] == "Account is deactivated"


# Test the admin creation command: server/cli.py (`flask create-admin`)
class TestCreateAdminCommand:

    @pytest.fixture
    def admin_env(self, monkeypatch):
        monkeypatch.setenv("ADMIN_USERNAME", "boss") # the three variables the command reads
        monkeypatch.setenv("ADMIN_EMAIL", "Boss@Email.com")
        monkeypatch.setenv("ADMIN_PASSWORD", "admin-pass-123")

    @pytest.fixture
    def run(self, app):
        from cli import create_admin_command
        runner = app.test_cli_runner()
        return lambda: runner.invoke(create_admin_command) # run the command and return its result

    def test_creates_an_admin_from_the_environment(self, run, admin_env):
        result = run()
        assert result.exit_code == 0
        db.session.expire_all() # reload what the command saved
        admin = User.query.filter_by(email="boss@email.com").one()
        assert admin.role == "admin"
        assert admin.check_password("admin-pass-123")

    def test_never_prints_the_password(self, run, admin_env):
        assert "admin-pass-123" not in run().output

    def test_is_safe_to_run_twice(self, run, admin_env):
        run()
        second = run()
        assert second.exit_code == 0
        assert "already exists" in second.output
        assert User.query.count() == 1 # no duplicate admin

    def test_running_again_does_not_reset_the_password(self, run, admin_env, monkeypatch):
        run()
        monkeypatch.setenv("ADMIN_PASSWORD", "a-different-pass-1") # a changed value must not overwrite the admin
        run()
        db.session.expire_all()
        assert User.query.one().check_password("admin-pass-123")

    @pytest.mark.parametrize("missing", ["ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"])
    def test_fails_when_a_variable_is_missing(self, run, admin_env, monkeypatch, missing):
        monkeypatch.delenv(missing)
        result = run()
        assert result.exit_code != 0
        assert User.query.count() == 0

    def test_does_not_promote_an_existing_regular_user(self, run, admin_env, make_user):
        make_user("sneaky", "boss@email.com", password="their-own-pass-1") # someone registered the admin's email first
        result = run()
        assert result.exit_code != 0
        db.session.expire_all()
        user = User.query.filter_by(email="boss@email.com").one()
        assert user.role == "user" # still a regular user
        assert not user.check_password("admin-pass-123") # password untouched

    def test_fails_when_the_username_is_taken_by_someone_else(self, run, admin_env, make_user):
        make_user("boss", "other@email.com")
        assert run().exit_code != 0
        assert User.query.count() == 1

    def test_rejects_a_weak_password(self, run, admin_env, monkeypatch):
        monkeypatch.setenv("ADMIN_PASSWORD", "short")
        assert run().exit_code != 0
        assert User.query.count() == 0


# Test that deactivated users are blocked on the quiz attempt routes
class TestDeactivatedUsersOnQuizRoutes:

    def test_deactivated_user_cannot_save_a_round(self, client, inactive_headers):
        from models import QuizAttempt
        response = client.post(
            "/api/quiz-attempts",
            json={"score": 1, "total_questions": 2},
            headers=inactive_headers,
        )
        assert response.status_code == 403
        assert response.get_json()["error"] == "Account is deactivated"
        assert QuizAttempt.query.count() == 0 # nothing was saved

    def test_deactivated_user_cannot_read_their_history(self, client, inactive_headers):
        response = client.get("/api/quiz-attempts", headers=inactive_headers)
        assert response.status_code == 403
        assert response.get_json()["error"] == "Account is deactivated"

    def test_token_issued_before_deactivation_is_refused(self, client, other_user, other_headers):
        body = {"score": 1, "total_questions": 2}
        assert client.post("/api/quiz-attempts", json=body, headers=other_headers).status_code == 201
        other_user.is_active = False # deactivated after the token was issued
        db.session.commit()
        assert client.post("/api/quiz-attempts", json=body, headers=other_headers).status_code == 403

    def test_leaderboard_stays_public(self, client):
        assert client.get("/api/leaderboard").status_code == 200 # no token needed, as before
        