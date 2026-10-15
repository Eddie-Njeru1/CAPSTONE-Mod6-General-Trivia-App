# This file defines the authentication blueprint for signup, login, logout and retrieving the logged-in user details.

from flask import Blueprint, jsonify, request # creates routes handling requests and returning JSON
from flask_jwt_extended import create_access_token, get_jwt, jwt_required # functions that create and check login tokens 
from sqlalchemy.exc import IntegrityError # raised when a database constraint is violated 
from models.db import db # database cpnnection
from models.user import User # User model
from utils.auth import get_current_user, revoked_tokens # helpers for retrieving users and tracking revoked tokens 

auth_bp = Blueprint("auth", __name__) # Blueprint to group authentication routes 

def serialize_user(user): # convert User object into a dictionary for JSON response
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    } # return public user details without exposing password hash

def error(message, status): # standard JSON error message with HTTP code 
    return jsonify({"error": message}), status

def read_fields(*names): # reuired fields from a JSON request body
    data = request.get_json(silent=True) # read the request body. return NOne if it isn't valid JSON
    if not isinstance(data, dict): # Ensure request body contains a JSON object
        return None, error("request body must be JSON", 400)

    values =[] # check that every required field has a valid value 
    for name in names:
        value = data.get(name)
        if value is None or value == "": # reject missing or empty fields 
            return None, error(f"{name} is required", 400)
        if not isinstance(value, str): # reject values that are not strings 
            return None, error(f"{name} must be text", 400)
        values.append(value) # store each valid field value 
    return values, None # return the collected values if all fields are valid 

# Create new user account
@auth_bp.post("/signup")
def signup():
    fields, problem = read_fields("username", "email", "password") # read and validate the required signup fields 
    if problem:
        return problem
    username, email, password = fields # separate the submitted values 

    # create the user and hash their password 
    try:
        user = User(username=username, email=email)
        user.set_password(password)
    except ValueError as exc:
        return error(str(exc), 400)
    
    # check whether the username is already registered 
    if User.query.filter_by(username=user.username).first():
        return error("Username is already taken", 409)

    # check if the email is already registered 
    if User.query.filter_by(email=user.email).first():
        return error("email is already registered", 409)

    # Add new user to the database session
    db.session.add(user)

    # save the new account to the database
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback() # undo the failed transaction if a database constraint is violated 
        return error("username or email is already registered", 409)
    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": serialize_user(user)}), 201 # return new user public details with status code 

# Log in an existing user 
@auth_bp.post("/login")
def login():
    fields, problem = read_fields("email", "password") # read the email and password from the request
    if problem:
        return problem
    email, password = fields # separate the submitted credentials 
    user = User.query.filter_by(email=email.strip().lower()).first() # find the user by email after removing surrounding spaces 

    if user is None or not user.check_password(password): # reject incorrect credentials without rvealing whic value was wrong 
        return error("Invalid username or password", 401)
    
    # login token using the user ID as a string 
    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token, "user": serialize_user(user)}), 200 # tokken and the user's public details 

# Log out user by revoking their current token 
@auth_bp.post("/logout")
@jwt_required() # require a valid login token 
def logout():
    revoked_tokens.add(get_jwt()["jti"]) # add token's unique ID to the revoked token set
    return jsonify({"message": "Logged out"}), 200 # confirms successful log out

# Return details of currently logged in user 
@auth_bp.get("/me")
@jwt_required() # require a valid login token 
def me():
    user = get_current_user() # retrieve the user associated with the current token
    if user is None: # reject the request if the account no longer exists 
        return error("User not found", 401)
    return jsonify({"user": serialize_user(user)}), 200 # user public details 