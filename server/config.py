# This contains the app's configuration settings

import os # access environment variables 
from datetime import timedelta # sets duration for login token validity
from dotenv import load_dotenv # reads environment variables from .env file

load_dotenv() # load variables from .env file

# Config class for the main application
class Config: # settings used when running the app
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") # gets database connection URL from the environment
    SQLALCHEMY_TRACK_MODIFICATIONS = False # disables tracking of database changes the app doesn't need 
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") # get secret key used to sign and verify login tokens 
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1) # time befor login tokens expire 

# Test Config class that inherits settings fron config 
class TestConfig(Config): # settings used when running automated tests
    TESTING = True # enables testing mode in Flask
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:" # a temporary in-memory database for tests while keeping tests seperate from main app database 
    JWT_SECRET_KEY = "test-secret-key-used-only-by-pytest-0123456789" # sets a fixed secret key for generating and verifying test tokens only