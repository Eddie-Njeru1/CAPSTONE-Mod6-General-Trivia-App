# Logout is stored in the token_blocklist table (not in memory),
# so a logged-out token stays blocked after the server restarts.

import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app import create_app
from models import TokenBlocklist, User, db
from tests.conftest import FastTestConfig


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def test_logout_saves_the_token_in_the_database(client, auth_headers):
    client.post("/api/auth/logout", headers=auth_headers)

    entry = TokenBlocklist.query.one()
    assert entry.jti  # the token's unique ID
    # It is kept until the token would have expired anyway (1 hour).
    assert utc_now() < entry.expires_at <= utc_now() + timedelta(hours=1, minutes=1)


def test_logout_removes_rows_for_tokens_that_expired_already(client, auth_headers):
    db.session.add(TokenBlocklist(jti="old-token", expires_at=utc_now() - timedelta(minutes=5)))
    db.session.commit()

    client.post("/api/auth/logout", headers=auth_headers)

    assert TokenBlocklist.is_revoked("old-token") is False
    assert TokenBlocklist.query.count() == 1  # only the token that was just logged out


# Runs in a brand-new Python process, exactly like the server after a restart:
# nothing from the first process is left in memory, only the database file.
CHECK_AFTER_RESTART = """
import sys
from app import create_app
from tests.conftest import FastTestConfig

class FileDbConfig(FastTestConfig):
    SQLALCHEMY_DATABASE_URI = sys.argv[1]

response = create_app(FileDbConfig).test_client().get(
    "/api/auth/me", headers={"Authorization": "Bearer " + sys.argv[2]}
)
print(response.status_code)
"""


def test_a_logged_out_token_stays_blocked_after_a_restart(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'restart.db'}"

    class FileDbConfig(FastTestConfig):
        SQLALCHEMY_DATABASE_URI = database_url

    app = create_app(FileDbConfig)
    with app.app_context():
        db.create_all()
        user = User(username="restart", email="restart@email.com")
        user.set_password("secret123")
        db.session.add(user)
        db.session.commit()

    client = app.test_client()
    token = client.post(
        "/api/auth/login", json={"email": "restart@email.com", "password": "secret123"}
    ).get_json()["access_token"]
    assert client.post(
        "/api/auth/logout", headers={"Authorization": f"Bearer {token}"}
    ).status_code == 200

    # "Restart": ask a fresh process whether the logged-out token still works.
    server_folder = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "-c", CHECK_AFTER_RESTART, database_url, token],
        cwd=server_folder, capture_output=True, text=True, check=True,
    )

    assert result.stdout.strip().splitlines()[-1] == "401"  # still logged out
