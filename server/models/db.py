# Creates the single shared SQLAlchemy object that every model imports.
# app.py connects it to the Flask app with db.init_app(app).

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData

# Gives every constraint a predictable name, e.g. a foreign key from
# questions.category_id becomes "fk_questions_category_id_categories".
# Without names, Flask-Migrate can't reliably change or drop constraints later.
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

db = SQLAlchemy(metadata=MetaData(naming_convention=naming_convention))
