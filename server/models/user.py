# This file defines the User model for storing user account details 

import re # check whether email address follows expected format
from sqlalchemy.orm import validates # check values when they are assigned to model fields 
from utils.auth import bcrypt # hash passowrds and verify login credentials
from .db import db # databse object used to define User model

# Define basic pattern for checking email address formats
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Define User model
class User(db.Model): 
    __tablename__ = "users" # set databsase table name 

    # Phase 3: the only roles a user can have. "user" is the default.
    ROLES = ("user", "admin")

    __table_args__ = (
        db.CheckConstraint("length(username) >=3", name="username_length"),
        # Phase 3: database backstops for the role and login tracking rules
        db.CheckConstraint("role IN ('user', 'admin')", name="valid_role"),
        db.CheckConstraint("login_count >= 0", name="login_count_not_negative"),
    ) # requires usernames to contain at least 3 characters 

    id = db.Column(db.Integer, primary_key=True) # Assign unique ID to each user 
    username = db.Column(db.String(50), nullable=False, unique=True) # store required username with upto 50 characters 
    email = db.Column(db.String(120), nullable=False, unique=True) # store required unique email address upto 120 characters 
    password_hash = db.Column(db.String(255), nullable=False) # store hashed password 
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now()) # store the date and time user account was created 

    # ---- Phase 3: roles, deactivation and login tracking ----
    # Each has a Python default (new users made in code) AND a server_default
    # (existing rows when the migration adds the column), so nothing is ever empty.
    role = db.Column(db.String(10), nullable=False, default="user", server_default="user")
    is_active = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())
    last_login_at = db.Column(db.DateTime) # empty until the first login
    login_count = db.Column(db.Integer, nullable=False, default=0, server_default="0")

    @validates("username") # validate usernames when values are assigned 
    def validate_username(self, key, value):
        value = (value or "").strip() # removes spaces at from the beginning and the end 
        if not 3 <= len(value) <= 50: # reject usernames shorter than 3 or longer than 50
            raise ValueError("username must be between 3 and 50 characters")
        return value # cleaned username 

    @validates("email") # validate emails when values are assigned
    def validate_email(self, key, value):
        value = (value or "").strip().lower() # removes surrounding spaces and converts email to lowercase 
        if len(value) > 120 or not EMAIL_PATTERN.match(value):
            raise ValueError("enter a valid email address")
        return value # cleaned email address

    @validates("role") # only "user" or "admin"
    def validate_role(self, key, value):
        if value not in self.ROLES:
            raise ValueError(f"role must be one of: {', '.join(self.ROLES)}")
        return value

    @validates("is_active") # a real True/False, never 0/1 or "yes"
    def validate_is_active(self, key, value):
        if not isinstance(value, bool):
            raise ValueError("is_active must be true or false")
        return value

    @validates("login_count") # a whole number, never negative
    def validate_login_count(self, key, value):
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError("login_count must be a whole number of at least 0")
        return value

    @property
    def is_admin(self): # handy shortcut: user.is_admin
        return self.role == "admin"

# Hash a password before storing it in database 
    def set_password(self, password): # require passwords to contain at least 8 characters 
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8") # hash password and store the resulting string

    def check_password(self, password): # check whether a sunmitted password matches stored hash
        return bcrypt.check_password_hash(self.password_hash, password) # return True if passowrd matches

    def __repr__(self): # how a user object appears when printed or logged 
        return f"<User {self.id} {self.username}>" # show user's ID and username without exposing password 
