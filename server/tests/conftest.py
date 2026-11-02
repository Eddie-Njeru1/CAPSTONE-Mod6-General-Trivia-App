# This contains shared pytest fixtures for the app's tests. 
# Creates a test app, provides a test client and supplies test users(regular, admin, other and deactivated) and authentication tokens so tests can reuse setup.

import pytest # create reusable test fixtures 
from flask_jwt_extended import create_access_token # create login tokens directly for users made in the database
from app import create_app # creates Flask application
from config import TestConfig # test configuration
from models import User, db # user model and databse object

# Use fewer bcrypt rounds to make password hashing faster during tests
class FastTestConfig(TestConfig):
    BCRYPT_LOG_ROUNDS = 4 

# Create a fresh Flask app and database for each test that uses this fixture
@pytest.fixture
def app():
    app = create_app(FastTestConfig) # create the app with test settings
    with app.app_context(): # set up the app context for database operations 
        db.create_all() # create database tables 
        yield app # allow the test to run using the app
        db.session.remove() # remove the current database after test
        db.drop_all() # delete the test tables and their data

# Create test client for sending requests without starting a server 
@pytest.fixture
def client(app):
    return app.test_client()

# Sample details for creating a test user 
@pytest.fixture
def user_data():
    return {
        "username": "edd", 
        "email": "edd@email.com", 
        "password": "secret123",
        }

# Register a test user through the signup endpoint
@pytest.fixture
def registered_user(client, user_data):
    response = client.post("/api/auth/signup", json=user_data)
    assert response.status_code == 201 # confirm a successful registration 
    return user_data # return the user's signup details for other fixtures 

# Log in the registered user and return their access token 
@pytest.fixture
def access_token(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": registered_user["email"],
              "password": registered_user["password"]
              },
    )
    assert response.status_code ==200 # confirm successful login 
    return response.get_json()["access_token"] # extract and return the JWT from the response 

# Provide headers for requests that require authentication 
@pytest.fixture
def auth_headers(access_token):
    return {"Authorization": f"Bearer {access_token}"}

# Create a user straight in the database. signup can't seta role or deactivate an account
@pytest.fixture
def make_user(app):
    def _make_user(username, email, password="secret123", role="user", is_active=True):
        user = User(username=username, email=email) # build the user 
        user.set_password(password) # hash the password
        user.role = role # user or admin
        user.is_active = is_active # false makes a deactivated account
        db.session.add(user)
        db.session.commit() # save so the user gets an id
        return user
    return _make_user

# Build request headers with a valid token for any user
@pytest.fixture
def headers_for():
    def _headers_for(user):
        token = create_access_token(identity=str(user.id)) # token for this user's id
        return {"Authorization": f"Bearer {token}"}
    return _headers_for

# An admin account and its headers
@pytest.fixture
def admin_user(make_user):
    return make_user("admin", "admin@email.com", role="admin")

@pytest.fixture
def admin_headers(admin_user, headers_for):
    return headers_for(admin_user)

# A second regualr user and their headers. For ownership and 403 tests
@pytest.fixture
def other_user(make_user):
    return make_user("sam", "sam@email.com")

@pytest.fixture
def other_headers(other_user, headers_for):
    return headers_for(other_user)

# A deactivated account and its headers. Valid token that must be refused
@pytest.fixture
def inactive_user(make_user):
    return make_user("gone","gone@email.com", is_active=False)

@pytest.fixture
def inactive_headers(inactive_user, headers_for):
    return headers_for(inactive_user)
