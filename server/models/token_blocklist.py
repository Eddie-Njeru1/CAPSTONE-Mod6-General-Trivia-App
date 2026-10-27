# TokenBlocklist: login tokens that were revoked (logged out).
#
# Tokens are kept in the database instead of in server memory, so a logout
# still counts after the server restarts or redeploys.
#
# jti        the token's unique ID (every JWT has one)
# expires_at when the token would have expired anyway; after that the row
#            is no longer needed and remove_expired() deletes it
# created_at when the token was revoked

from datetime import datetime, timezone

from .db import db


def _utc_now():
    # Naive UTC, to match how the other DateTime columns are stored.
    return datetime.now(timezone.utc).replace(tzinfo=None)


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"

    JTI_MAX_LENGTH = 36  

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(JTI_MAX_LENGTH), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

    @classmethod
    def revoke(cls, jti, expires_at):
        """Add a token to the blocklist. Safe to call twice for the same token.

        The caller commits (so it can be part of a bigger transaction).
        """
        if not jti:
            raise ValueError("jti is required.")
        if not isinstance(expires_at, datetime):
            raise ValueError("expires_at must be a datetime.")
        if expires_at.tzinfo is not None:  # store as naive UTC like other columns
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)

        existing = cls.query.filter_by(jti=jti).first()
        if existing:
            return existing
        entry = cls(jti=jti, expires_at=expires_at)
        db.session.add(entry)
        return entry

    @classmethod
    def is_revoked(cls, jti):
        """True if this token was logged out."""
        return db.session.query(cls.id).filter_by(jti=jti).first() is not None

    @classmethod
    def remove_expired(cls, now=None):
        """Delete rows for tokens that have expired anyway. Returns how many.

        An expired token is rejected on its own, so its row is no longer needed.
        The caller commits.
        """
        now = now or _utc_now()
        return cls.query.filter(cls.expires_at < now).delete(synchronize_session=False)

    def __repr__(self):
        return f"<TokenBlocklist jti={self.jti!r} expires_at={self.expires_at}>"
