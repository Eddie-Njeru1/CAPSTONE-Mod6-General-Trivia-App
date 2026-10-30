# Database Guide

How the General Trivia App stores its data: the tables, how they connect, why
they are designed this way, and how to set up and change the database.

Owner: Austin (Database Evolution, PWA and Offline). For a model or column
change, see [Changing the database](#changing-the-database).

**What changed in Phase 3**
- `users` has roles, deactivation and login tracking: `role`, `is_active`,
  `last_login_at`, `login_count`
- `categories` has an optional `icon` and `color` for the category tiles
- New table `token_blocklist`: logouts are saved in the database, so they
  still count after the server restarts
- The seed is now 8 categories × 10 questions, and the same content is
  exported as the **offline question pack** the app uses with no internet
- Rounds played offline wait in a **sync queue** in the browser and are sent
  to `quiz_attempts` when the connection returns

## The tables at a glance

```mermaid
erDiagram
    users ||--o{ categories : "owns"
    users ||--o{ quiz_attempts : "plays"
    categories ||--o{ questions : "contains"
    categories |o--o{ quiz_attempts : "played in (optional)"

    users {
        int id PK
        string username UK "3-50 chars"
        string email UK "lowercased"
        string password_hash "bcrypt, never the password"
        string role "user or admin, default user"
        boolean is_active "default true"
        datetime last_login_at "empty until first login"
        int login_count "default 0, never negative"
        datetime created_at
    }
    categories {
        int id PK
        string name "required, max 80"
        string description "optional, max 255"
        string icon "optional key, e.g. globe"
        string color "optional hex, e.g. #2E86C1"
        int user_id FK "owner, required"
        datetime created_at
        datetime updated_at
    }
    questions {
        int id PK
        string text "required, max 500"
        string question_type "multiple or boolean"
        string difficulty "easy, medium or hard"
        string correct_answer "max 255"
        json incorrect_answers "list of strings"
        int category_id FK "required"
        datetime created_at
        datetime updated_at
    }
    quiz_attempts {
        int id PK
        int user_id FK "required"
        int category_id FK "null = Mixed round"
        int score "correct answers"
        int total_questions "at least 1"
        int points "incl. streak bonus"
        int best_streak
        datetime created_at
    }
    token_blocklist {
        int id PK
        string jti UK "the logged-out token's ID"
        datetime expires_at "indexed; row can go after this"
        datetime created_at "when it was logged out"
    }
```

The same diagram as an image, for slides or viewers that can't draw Mermaid:
[![Database ERD](docs/erd.png)](docs/erd.png)

| Table | One row is... | Model file |
|---|---|---|
| `users` | an account | `models/user.py` |
| `categories` | a user's quiz category, e.g. "Kenyan History" | `models/category.py` |
| `questions` | one question in a category | `models/question.py` |
| `quiz_attempts` | one finished round, for history and the leaderboard | `models/quiz_attempt.py` |
| `token_blocklist` | one logged-out login token | `models/token_blocklist.py` |

`token_blocklist` has no lines to the other tables on purpose: it stores a
token's ID (`jti`), not a user, so it doesn't need a foreign key.

`alembic_version` also appears in the database. It is Flask-Migrate's own
table and records which migration the database is on. Never edit it.

## Relationships and what happens on delete

| Relationship | In Python | When the parent is deleted |
|---|---|---|
| A user owns many categories | `user.categories`, `category.user` | The user's categories are deleted (`CASCADE`) |
| A category contains many questions | `category.questions`, `question.category` | Its questions are deleted (`CASCADE`) |
| A user has many quiz attempts | `user.quiz_attempts`, `attempt.user` | The user's attempts are deleted (`CASCADE`) |
| A category has many quiz attempts | `category.quiz_attempts`, `attempt.category` | Attempts are **kept**; `category_id` becomes empty (`SET NULL`) |

Why the last one is different: a player's score history should survive if a
category is removed later. The attempt then shows as "Mixed".

The delete rules exist in two places on purpose: in the database
(`ondelete=...` on the foreign key) and in SQLAlchemy (`cascade=...` on the
relationship). So the result is the same whether a row is deleted through
the app or directly in SQL. This also covers the admin API: deleting a user
there removes their categories, questions and rounds in one go.
`tests/test_resource_routes.py` checks both: once through SQLAlchemy, and
once with bulk deletes that skip it, so only the database's own rules apply.

## Design decisions

**Category names are unique per user, not globally.**
A `UNIQUE (user_id, name)` constraint (`uq_categories_user_id_name`) means one
user can't have two "Science" categories, but two different users can each
have their own.

**Validation happens in two layers.**
1. **Python** (`@validates` and save-time checks) gives clear error messages
   the API can send straight back as a 400, e.g. "Difficulty must be one of:
   easy, medium, hard."
2. **Database** (`CHECK` constraints) is the backstop: even raw SQL that skips
   Python can't save an invalid row.

Rules enforced:

| Model | Rules |
|---|---|
| User | username 3–50 characters; valid, lowercased email; `role` is `user` or `admin`; `is_active` is a real true/false (not `1` or `"yes"`); `login_count` is a whole number, never negative |
| Category | name required, trimmed, max 80; blank description stored as empty (NULL); `icon` optional, lowercase letters, numbers and hyphens, max 40 (`"  Globe "` is stored as `globe`); `color` optional, `#` plus 6 hex digits, stored in capitals (`#2e86c1` → `#2E86C1`) |
| Question | type is `multiple` or `boolean`; difficulty is `easy`, `medium` or `hard`; text max 500; multiple choice has exactly 3 incorrect answers; true/false answers are `"True"`/`"False"` with the opposite as the incorrect one; the correct answer can't also be an incorrect one; answers don't repeat |
| QuizAttempt | all numbers are whole numbers, never negative; `total_questions` at least 1; `score` no more than `total_questions`; `best_streak` no more than `score` |
| TokenBlocklist | `jti` required and unique; `expires_at` required |

**New required columns have a database default.**
`role`, `is_active` and `login_count` are required, but the hosted database
already had users when Phase 3 arrived. A required column with no value would
make the migration fail on those rows. So each one has a `server_default`
(`'user'`, `true`, `0`) that the database fills in for existing rows, as
well as a Python `default` for new users created in code. Existing users
became regular, active users with 0 logins. **Nobody is made an admin by the
migration**; the first admin is created on purpose with `flask create-admin`.

**Roles are a column, not a table.**
There are only two roles (`user`, `admin`), and a CHECK constraint
(`ck_users_valid_role`) keeps it that way. A separate roles table would only
be worth it with many roles or per-role permissions. `user.is_admin` is a
shortcut for `user.role == "admin"`.

**Deactivating is not deleting.**
`is_active = false` blocks login and every protected route (403), but keeps
the account, its categories and its score history. An admin can turn it back
on later. Deactivated players are also left out of the public leaderboard;
their rounds are kept, so they come back if the account is turned on again.
Deleting a user removes everything (see the delete rules above).

**Logouts are stored in the database.**
A login token (JWT) can't be "taken back", so on logout the server saves the
token's unique ID (`jti`) in `token_blocklist` and refuses that token from
then on. This used to be a Python `set()` in memory, which was emptied every
time the server restarted or redeployed (Render's free plan also sleeps after
about 15 minutes idle), so logged-out tokens worked again. A table survives
restarts.

- `TokenBlocklist.revoke(jti, expires_at)`: on logout (safe to call twice)
- `TokenBlocklist.is_revoked(jti)`: on every request with a token
- `TokenBlocklist.remove_expired()`: deletes rows for tokens that would have
  expired anyway (tokens last 1 hour). It runs on each logout, and the index
  on `expires_at` keeps it fast, so the table stays small.

**Icons are keys, not pictures.**
`categories.icon` stores a short word like `globe` or `music`; the frontend
maps it to the actual image. Pictures can then change without touching the
database, and a key is tiny to store and to put in the offline pack.

**Constraint names follow one pattern.**
`models/db.py` sets a naming convention, so every constraint gets a
predictable name such as `fk_questions_category_id_categories` or
`ck_users_valid_role`. Predictable names keep migrations reliable when a
constraint is changed or removed later.

**Passwords are never stored.**
`users.password_hash` holds a bcrypt hash. `user.set_password()` creates it
and `user.check_password()` checks a login attempt against it.

## Migration history

| Revision | What it does |
|---|---|
| `85ac05da5624` | Phase 2: `users`, `categories`, `questions`, `quiz_attempts` |
| `9a276177eee4` | Phase 3: user roles and login tracking, category `icon` and `color`, new `token_blocklist` table |

Check which one your database is on with `pipenv run flask db current`.

The Phase 3 migration was tested on PostgreSQL over a database that already
had users and categories (as on Render): upgrade, downgrade and upgrade again
all work, and `flask db check` is clean afterwards.

## Setting up your database

Run everything from the `server/` folder. This assumes PostgreSQL is
installed and `server/.env` exists (see `Phase2SetupGuide.md`, steps 2 and 3).

```bash
cd server
pipenv install --dev
pipenv run flask db upgrade        # creates all tables
pipenv run python -m utils.seed    # loads demo data; safe to re-run
pipenv run flask create-admin      # optional: the first admin (see below)
```

The seed adds one demo user who owns **8 categories with 10 questions each**
(80 in total; every category has every difficulty and both question types,
plus an icon and a colour):

- Email: `demo@trivia.app`
- Password: `demo-password-123` (set `SEED_DEMO_PASSWORD` in `.env` to change it)

Running the seed again adds nothing; it skips anything that already exists.
On a database seeded before Phase 3, it adds the 2 new categories and 50 new
questions, and fills in the icon and colour of the old 6 categories (only if
they are still empty, so it never overwrites a change).

`flask create-admin` creates the admin from `ADMIN_USERNAME`, `ADMIN_EMAIL`
and `ADMIN_PASSWORD` in `.env`. It is safe to run twice, and it never
promotes an existing account (if someone already signed up with that email,
it stops with an error instead of handing them admin access).

Check it worked:

```bash
pipenv run flask db check    # expect: No new upgrade operations detected.
psql -h localhost -U trivia_user -d trivia_dev -c "\dt"
```

`\dt` should list `alembic_version`, `categories`, `questions`,
`quiz_attempts`, `token_blocklist` and `users`.

### Your `.env` settings

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://trivia_user:your_password@localhost:5432/trivia_dev` | Must start with `postgresql+psycopg2://` (see Troubleshooting) |
| `JWT_SECRET_KEY` | 64 random characters | Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `SEED_DEMO_PASSWORD` | optional | Overrides the demo password |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | optional | Used by `flask create-admin` (and by the seed, if all three are set) |

Never commit `.env`. It is already in `.gitignore`.

## Seed data and the offline question pack

The starter questions live in one place, `utils/seed_data.py`, and feed two
things:

```mermaid
flowchart LR
    S["utils/seed_data.py<br/>8 categories × 10 questions"] -->|python -m utils.seed| DB[("PostgreSQL<br/>categories + questions")]
    S -->|python -m utils.export_offline_pack| P["client/src/data/<br/>offlineQuestions.json"]
    P -->|bundled into the app| SW["Service worker cache<br/>(works offline)"]
```

So the questions a player gets offline are the same as the seed questions
online. After changing `seed_data.py`, rebuild the pack and commit both:

```bash
pipenv run python -m utils.export_offline_pack          # rewrites the JSON
pipenv run python -m utils.export_offline_pack --check  # "up to date", or exits with an error
```

The exporter refuses to write fewer than 8 categories or fewer than 10
questions per category. Each category in the pack has a `slug` (e.g.
`african-geography`) that the frontend uses as its offline ID.

### Rounds played offline (the sync queue)

The browser can't reach the server offline, so a finished round can't be
saved to `quiz_attempts` straight away. Instead:

1. The round is kept in the browser's localStorage (`trivia.syncQueue.v1`),
   oldest first, newest 50 at most.
2. When the browser comes back online, the queue sends each round to
   `POST /api/quiz-attempts` in the order it was played, and removes it once
   the server has saved it.
3. If nobody is logged in, the rounds wait. If the server keeps refusing one
   round, it is dropped after 5 tries so it can't block the others.

Code: `client/src/services/syncQueue.js` and
`client/src/services/offlineQuestions.js`. Nothing new is needed in the
database: synced rounds are ordinary `quiz_attempts` rows.

## Changing the database

**Only Austin creates migrations.** If two people create migrations at the
same time, Flask-Migrate ends up with two competing histories ("multiple
heads") that have to be fixed by hand.

To request a change (a new column, a new table, a different rule), open a
GitHub Issue or message Austin with:
- what you need stored, and why
- which table it belongs to
- whether it is required or optional

How a change is made (for reference):

```bash
# 1. Edit the model in models/
pipenv run flask db migrate -m "describe the change"
# 2. Read the new file in migrations/versions/ before applying it
pipenv run flask db upgrade
pipenv run pytest -q
```

After pulling a branch that contains a new migration, everyone runs:

```bash
pipenv run flask db upgrade
```

Rules:
- Never edit a migration file once it has been merged; make a new one.
- Never run `flask db init` again; `migrations/` already exists.
- Commit the migration file together with the model change.
- **Check the generated file for CHECK constraints.** Autogenerate does not
  notice a CHECK constraint added to an existing table, so the Phase 3 ones
  (`ck_users_valid_role`, `ck_users_login_count_not_negative`,
  `ck_categories_color_length`) were added to the migration by hand.
- **A new required column on a table that has rows needs a
  `server_default`**, or the upgrade fails on the hosted database.

## Viewing the data in pgAdmin

Register a server in pgAdmin with:

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `5432` |
| Maintenance database | `trivia_dev` |
| Username | `trivia_user` |
| Password | the one in your `DATABASE_URL` (between `trivia_user:` and `@`) |

Use `127.0.0.1` rather than `localhost`: when PostgreSQL runs in WSL,
Windows only forwards IPv4, so `localhost` (which can mean IPv6 `::1`) may
time out.

Then open **Databases → trivia_dev → Schemas → public → Tables**. Right-click
a table and choose **View/Edit Data → All Rows** to see its rows, or
right-click `trivia_dev` and choose **ERD For Database** to see the diagram.

## API notes for the database

### Scoreboard

These routes use the `quiz_attempts` table (`routes/quiz_attempt_routes.py`).

| Method and path | Login | What it does |
|---|---|---|
| `POST /api/quiz-attempts` | Required (active account) | Saves a finished round for the logged-in user. Returns it with `201`. |
| `GET /api/quiz-attempts?page=1&per_page=10` | Required (active account) | The logged-in user's own rounds, newest first (`per_page` max 50) |
| `GET /api/leaderboard?limit=10` | Not required | Top players by total points (max 50); deactivated accounts are left out |

Body for `POST /api/quiz-attempts`:

```json
{ "score": 8, "total_questions": 10, "points": 150, "best_streak": 5 }
```

- `score` and `total_questions` are required; `points` and `best_streak`
  default to 0.
- `category_id` is optional. Leave it out for an Open Trivia DB round (it is
  saved as "Mixed"). Only send it for one of our own categories; an unknown
  id returns `404`.

The history comes back one page at a time:

```json
{ "items": [ ...rounds... ], "page": 1, "per_page": 10, "total": 23, "pages": 3 }
```

A page past the end returns an empty `items` list, not an error.

Each leaderboard row looks like:

```json
{ "rank": 1, "username": "demo", "total_points": 150, "games_played": 1, "best_streak": 5 }
```

Errors always come back as `{"error": "..."}` with status `400` (bad input),
`401` (not logged in), `403` (account deactivated) or `404` (not found). The
user always comes from the login token, never from the request body, so
nobody can save a score as someone else.

### Categories and questions

These routes live in `routes/api_routes.py` and `routes/admin_routes.py`
(Emmanuel).

- Any logged-in user can **read** every category and question, so everyone
  can play the seed categories. Categories now include `icon` and `color`.
- Only the **owner** (`category.user_id`) can edit or delete a category or
  its questions; anyone else gets `403`. Admins can manage any of them
  through `/api/admin/...`.
- `PUT` replaces a whole category, so an `icon` or `color` left out of a
  `PUT` is cleared. Use `PATCH` to change only some fields.
- Wrap saves in `try/except ValueError` and return the message as a `400`;
  the models already produce clear messages.
- On `IntegrityError` (for example, a duplicate category name for the same
  user), call `db.session.rollback()` and return `409`.
- To add a question, append it through its category,
  `category.questions.append(question)`, or add it to the session directly.
  Creating `Question(category=category)` alone does not save it when the
  category was loaded earlier.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'psycopg'` | Your `DATABASE_URL` starts with `postgresql://`. Change it to `postgresql+psycopg2://`. SQLAlchemy 2.1 uses a different driver by default. |
| `database "trivia_user" does not exist` | The `DATABASE_URL` is missing `/trivia_dev` at the end |
| `relation "categories" does not exist` | The tables haven't been created yet. Run `pipenv run flask db upgrade` |
| `column users.role does not exist` / `relation "token_blocklist" does not exist` | Your database is still on Phase 2. Run `pipenv run flask db upgrade` |
| `Can't locate revision identified by ...` | Your database is on a migration your branch doesn't have. Pull the latest `development`, then run `flask db upgrade` |
| `offlineQuestions.json is out of date` | `seed_data.py` changed. Run `pipenv run python -m utils.export_offline_pack` and commit the JSON |
| `InsecureKeyLengthWarning: The HMAC key is ... bytes long` | `JWT_SECRET_KEY` is too short. Generate a new one (see the `.env` table above) |
| `NOT NULL constraint failed: categories.user_id` in a test | Categories need an owner. Create a `User` and pass `user=...` |
| pgAdmin: `password authentication failed` though the password is right | Another PostgreSQL (e.g. a Windows install) is using port 5432. Stop it, or check which server you are connecting to |
| pgAdmin: connection timeout | Use host `127.0.0.1`, not `localhost`. If it still times out, run `wsl --shutdown` in PowerShell and reopen Ubuntu |
| `Creating a Pipfile for this project...` | You ran pipenv outside `server/`. Press Ctrl+C, `cd server`, and run it again |

## Tests

```bash
cd server
pipenv run pytest -q
```

| File | Covers |
|---|---|
| `tests/test_models.py` | Every model rule, relationship and cascade, the leaderboard query, roles and login tracking, category icon and colour, and the token blocklist |
| `tests/test_seed_data.py` | The seed content passes the model rules; 8 × 10 with valid, unique icons and colours; safe to re-run; fills in icons on older categories without overwriting |
| `tests/test_logout_blocklist.py` | Logout is saved in `token_blocklist`, expired rows are cleaned up, and a logged-out token is still refused after a restart |
| `tests/test_quiz_attempt_routes.py` | The scoreboard routes and pagination, using real signup tokens; a player an admin deactivates disappears from the leaderboard |
| `tests/test_resource_routes.py` | Ownership and cascade rules at model level, including the database-enforced `CASCADE` / `SET NULL` rules |

Each test gets a fresh in-memory SQLite database, so tests never touch your
PostgreSQL data.

Front-end tests for the offline side (`cd client && npm test`):
`offlineQuestions.test.js` (the pack and the questions it returns),
`syncQueue.test.js` (the outbox) and `offlineMode.test.jsx` (the quiz
switching to offline and queuing unsaved rounds). `QuestionComponents.test.jsx`
covers QuestionList, QuestionForm and the question rules in
`utils/questionRules.js`, which mirror the Question model's rules.
