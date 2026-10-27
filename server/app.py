# This creates and configures the Flask application. Connects database and authentication tools, registers the API routes and defines healllth check and error handling endpoints

from flask import Flask, jsonify # create the app and jsonify to return JSON responses 
from flask_migrate import Migrate # manages changes to the database structure 
from config import Config # default application settings 
from models import db # database objects used by the app
from utils.auth import bcrypt, jwt # extension for password security and login tokens  

# Database migration manager 
migrate = Migrate() # will be connected to the Flask app inside create_app()

def create_app(config_class=Config): # Creates and configures the Flas app
    app = Flask(__name__) # Flask app instance 
    app.config.from_object(config_class) # load settings from the selected config class

    db.init_app(app) # connect the database to Flask app
    migrate.init_app(app, db) #connect the database migration manager to the app and database
    bcrypt.init_app(app) # connect password hashing to the Flask app
    jwt.init_app(app) # connect JWT  authentication to the flask app

    from cli import create_admin_command # makes 'flask create-admin' available
    app.cli.add_command(create_admin_command) # makes 'flask create-admin' available
    from routes.auth_routes import auth_bp # authentication routes for signup, login, logout and user details
    from routes.api_routes import api_bp # API routes for categories and trivia questions 
    from routes.quiz_attempt_routes import quiz_attempt_bp # saving quiz rounds and the scoreboard

    app.register_blueprint(auth_bp, url_prefix="/api/auth") # register authentication routes 
    app.register_blueprint(api_bp, url_prefix="/api") # reguster trivia API routes 
    app.register_blueprint(quiz_attempt_bp, url_prefix="/api") # quiz attempts and leaderboard

# Endpoint to check whether the API is running
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"}), 200

# Handle requests for URLs that do not exist
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

# Handle requests that use an unsupported HTTP method
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method not allowed"}), 405

# Return fully configured Flask app
    return app 