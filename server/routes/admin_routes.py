# Owner: Emmanuel
# Admin endpoints under /api/admin: stats, users (list, update, delete), categories and questions across all users. Every route uses @admin_required from utils/auth.py.
# STATUS: placeholder created during the Phase 3 setup. The owner replaces this comment when building the file.

from flask import Blueprint

admin_bp = Blueprint("admin", __name__) # register in app.py with url_prefix="/api/admin"
