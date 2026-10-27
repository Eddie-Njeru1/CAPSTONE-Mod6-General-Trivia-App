# Flask command `flask create-admin`: creates the first admin from ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD. Safe to run more than once.


import click # builds the command line and prints output
from flask.cli import with_appcontext # run the command inside the Flask app so it can use the database 
from models import db # databse object used to save the new admin
from utils.seed import get_or_create_admin # shared helper that creates the admin only if it doesn't exist

@click.command("create-admin") # run with flask --app app create-admin
@with_appcontext
def create_admin_command():
    try:
        user, created = get_or_create_admin() # read the three ADMIN_* environment variables
    except ValueError as exc: #missing variables, invalid values, or an account that can't be safely reused
        raise click.ClickException(str(exc)) # print message and exit with an error code 
    db.session.commit() # save the new admin
    if created:
        click.echo(f"Admin '{user.username}' created.") # password is never printed
    else:
        click.echo(f"Admin '{user.username}' already exists. Nothing changed.") 
