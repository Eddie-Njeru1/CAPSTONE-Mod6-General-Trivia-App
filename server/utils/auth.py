# This sets up authentication for the app. Handles password security, login tokens, logout support, authentication error messages and helpersfor identifying currently logged in user

from flask import jsonify # sends error messages as JSON responses
from flask_bcrypt import Bcrypt # hashes passwods and checks submitted passwords 
from flask_jwt_extended import JWTManager, get_jwt_identity # manage login tokens and get_jwt_identity to retrieve user ID stored in a token 

bcrypt = Bcrypt() # password security extension to be connected to the Flask app
jwt = JWTManager() # extension to manage login tokens to be connected to Flask app
revoked_tokens = set() # this set will store IDs of tokens that have been revoked 

# Check if a token has been revoked
@jwt.token_in_blocklist_loader
def is_token_revoked(jwt_header, jwt_payload):
    return jwt_payload["jti"] in revoked_tokens # return True if token's unique ID is in the revoked tokens set

# Handle requests that don't include a login token
@jwt.unauthorized_loader
def missing_token(reason):
    return jsonify({"error": "Authentication required"}), 401

# Handle tokens that are invalid or incorrectly formatted 
@jwt.invalid_token_loader
def invalid_token(reason):
    return jsonify({"error": "Invalid token"}), 401

# Handle tokens that have passed their expiry time 
@jwt.expired_token_loader
def expired_token(jwt_header, jwt_payload):
    return jsonify({"error": "Token has expired"}), 401

# Handle tokens that have been revoked 
@jwt.revoked_token_loader
def revoked_token(jwt_header, jwt_payload):
    return jsonify({"error": "Token has been revoked"}), 401

# Get the ID of user who is currently logged in 
def get_current_user_id(): # read user ID stored in login token 
    return int(get_jwt_identity()) # convert it to an integer for database queries

# Get full User object for the currently logged-in user 
def get_current_user():
    from models import db # import database to avoid circular imports
    from models.user import User # bring in the User model which represents user in databse 
    return db.session.get(User, get_current_user_id()) # find and return user whose ID matches the token identity


