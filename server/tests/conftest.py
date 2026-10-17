# This contains shared pytest fixtures for the app's tests. 
# Creates a test app, provides a test client and supplies test users and authentication tokens so tests can reuse setup.

import pytest # create reusable test fixtures 
from app import create_app # creates Flask application
from config import TestConfig # test configuration
from models import db # databse object
from utils.auth import revoked_tokens # set used to store revoked login tokens  

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

# Clear revoked tokens before and after evert test 
@pytest.fixture(autouse=True)
def clear_revoked_tokens():
    revoked_tokens.clear() # remove tokens left over from previous tests
    yield # run test
    revoked_tokens.clear() # clear the tokens again after testing

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
