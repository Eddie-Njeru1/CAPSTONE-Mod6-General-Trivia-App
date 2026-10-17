# Database Guide

How the General Trivia App stores its data: the tables, how they connect, why
they are designed this way, and how to set up and change the database.

Owner: Austin (Database and Data Modeling). For a model or column change,
see [Changing the database](#changing-the-database).

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
        datetime created_at
    }
    categories {
        int id PK
        string name "required, max 80"
        string description "optional, max 255"
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
```

| Table | One row is... | Model file |
|---|---|---|
| `users` | an account | `models/user.py` (Eddie) |
| `categories` | a user's quiz category, e.g. "Kenyan History" | `models/category.py` |
| `questions` | one question in a category | `models/question.py` |
| `quiz_attempts` | one finished round, for history and the leaderboard | `models/quiz_attempt.py` |

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
the app or directly in SQL.

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
| Category | name required, trimmed, max 80; blank description stored as empty (NULL) |
| Question | type is `multiple` or `boolean`; difficulty is `easy`, `medium` or `hard`; text max 500; multiple choice has exactly 3 incorrect answers; true/false answers are `"True"`/`"False"` with the opposite as the incorrect one; the correct answer can't also be an incorrect one; answers don't repeat |
| QuizAttempt | all numbers are whole numbers, never negative; `total_questions` at least 1; `score` no more than `total_questions`; `best_streak` no more than `score` |

**Constraint names follow one pattern.**
`models/db.py` sets a naming convention, so every constraint gets a
predictable name such as `fk_questions_category_id_categories` or
`ck_quiz_attempts_score_in_range`. Predictable names keep migrations
reliable when a constraint is changed or removed later.

**Passwords are never stored.**
`users.password_hash` holds a bcrypt hash. `user.set_password()` creates it
and `user.check_password()` checks a login attempt against it.

## Setting up your database

Run everything from the `server/` folder. This assumes PostgreSQL is
installed and `server/.env` exists (see `Phase2SetupGuide.md`, steps 2 and 3).

```bash
cd server
pipenv install --dev
pipenv run flask db upgrade        # creates all tables
pipenv run python -m utils.seed    # loads demo data; safe to re-run
```

The seed adds one demo user who owns 6 categories with 30 questions
(5 per category, every difficulty, both question types):

- Email: `demo@trivia.app`
- Password: `demo-password-123` (set `SEED_DEMO_PASSWORD` in `.env` to change it)

Running the seed again adds nothing; it skips anything that already exists.

Check it worked:

```bash
pipenv run flask db check    # expect: No new upgrade operations detected.
psql -h localhost -U trivia_user -d trivia_dev -c "\dt"
```

`\dt` should list `alembic_version`, `categories`, `questions`,
`quiz_attempts` and `users`.

### Your `.env` settings

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://trivia_user:your_password@localhost:5432/trivia_dev` | Must start with `postgresql+psycopg2://` (see Troubleshooting) |
| `JWT_SECRET_KEY` | 64 random characters | Generate with `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `SEED_DEMO_PASSWORD` | optional | Overrides the demo password |

Never commit `.env`. It is already in `.gitignore`.

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

## Viewing the data in pgAdmin

Register a server in pgAdmin with:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Maintenance database | `trivia_dev` |
| Username | `trivia_user` |
| Password | the one in your `DATABASE_URL` (between `trivia_user:` and `@`) |

Then open **Databases → trivia_dev → Schemas → public → Tables**. Right-click
a table and choose **View/Edit Data → All Rows** to see its rows, or
right-click `trivia_dev` and choose **ERD For Database** to see the diagram.

## Scoreboard API

These routes use the `quiz_attempts` table (`routes/quiz_attempt_routes.py`).

| Method and path | Login | What it does |
|---|---|---|
| `POST /api/quiz-attempts` | Required | Saves a finished round for the logged-in user. Returns it with `201`. |
| `GET /api/quiz-attempts?page=1&per_page=10` | Required | The logged-in user's own rounds, newest first (`per_page` max 50) |
| `GET /api/leaderboard?limit=10` | Not required | Top players by total points (max 50) |

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
`401` (not logged in) or `404` (not found). The user always comes from the
login token, never from the request body, so nobody can save a score as
someone else.

### Notes for the category and question routes

These routes live in `routes/api_routes.py` (Emmanuel).

- Any logged-in user can **read** every category and question, so everyone
  can play the seed categories.
- Only the **owner** (`category.user_id`) can edit or delete a category or
  its questions; anyone else gets `403`.
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
| `Can't locate revision identified by ...` | Your database is on a migration your branch doesn't have. Pull the latest `development`, then run `flask db upgrade` |
| `InsecureKeyLengthWarning: The HMAC key is ... bytes long` | `JWT_SECRET_KEY` is too short. Generate a new one (see the `.env` table above) |
| `NOT NULL constraint failed: categories.user_id` in a test | Categories need an owner. Create a `User` and pass `user=...` |
| `Creating a Pipfile for this project...` | You ran pipenv outside `server/`. Press Ctrl+C, `cd server`, and run it again |

## Tests

```bash
cd server
pipenv run pytest -q
```

| File | Covers |
|---|---|
| `tests/test_models.py` | Every model rule, relationship, cascade and the leaderboard query |
| `tests/test_seed_data.py` | The seed content passes the model rules; the seed is safe to re-run |
| `tests/test_quiz_attempt_routes.py` | The scoreboard routes and pagination, using real signup tokens |

Each test gets a fresh in-memory SQLite database, so tests never touch your
PostgreSQL data.
