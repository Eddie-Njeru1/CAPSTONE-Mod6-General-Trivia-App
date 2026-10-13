# This file defines the authentication blueprint for signup, login, logout and retrieving the logged-in user details.
# This is a stub placeholder and will be developed further once Austin finishes the db.py file in the models directory
# It needs to be a stub for now in order to make sure app.py imports auth_bp when the server starts. 
# If this file is empty, the import would fail and crash the backend.  

from flask import Blueprint 

auth_bp = Blueprint("auth", __name__)