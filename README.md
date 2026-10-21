# General Trivia App

A full-stack trivia quiz application. **Phase 1** built a React front end that turns questions from the Open Trivia Database into a playable quiz with instant feedback, points and streak bonuses. **Phase 2** adds our own backend: a Flask REST API with a PostgreSQL database, JWT authentication, saved quiz results, an API for managing categories and questions, and a dashboard where each signed-in user manages their own categories.

**Live app:** <https://capstone-mod6-general-trivia-app.vercel.app/> (React front end on Vercel). Its API requests are forwarded to the Flask backend on Render: <https://capstone-mod6-general-trivia-app-1.onrender.com/api/health>.

## Contents

1. [Core functionality](#core-functionality)
2. [Technologies used](#technologies-used)
3. [How the pieces fit together](#how-the-pieces-fit-together)
4. [Project structure](#project-structure)
5. [Setup and run instructions](#setup-and-run-instructions)
6. [Running the tests](#running-the-tests)
7. [API reference](#api-reference)
8. [Database](#database)
9. [Deployment](#deployment)
10. [Error handling and validation](#error-handling-and-validation)
11. [Testing and CI](#testing-and-ci)
12. [Challenges along the way](#challenges-along-the-way)
13. [Current limitations](#current-limitations)
14. [Contributors](#contributors)

## Core functionality

### Quiz (Phase 1)

- Dynamic fetch of categories and questions from the Open Trivia Database API
- Category selection, including a "Mixed / Random" option that pulls from every category
- Multiple-choice and true/false questions, handled the same way through one shared component
- Instant answer feedback: correct answers highlight green, wrong picks highlight red, and the right answer is always revealed
- Points that scale with question difficulty, plus a multiplier for answer streaks
- Round history and running score, kept in the browser's local storage
- Loading and error states on every API call, with a retry option on failure

### Accounts and saved results (Phase 2)

- **Sign up, log in and log out** with JWT authentication. Passwords are hashed with bcrypt and never stored or returned in plain text. Signing up logs the user in straight away, and users log in with their email and password.
- **Session that survives a refresh.** The token and user are saved in the browser and restored on load.
- **Logout that really logs out.** The server revokes the token, so it cannot be reused.
- **Protected pages.** Logged-out visitors are redirected to the login page and returned to the page they asked for after logging in.
- **Finished rounds are saved to the database.** When a logged-in user finishes a quiz, the round (score, total, points, best streak) is saved through `POST /api/quiz-attempts`. Saving happens in the background: if it fails or the token has expired, the round is still kept in the browser and the results page is never interrupted. Guests keep their history in local storage only.
- **A public leaderboard endpoint** ranks players by total points.

### Categories and questions API (Phase 2)

- **Full CRUD** (create, read, update with PUT or PATCH, delete) on two related resources: **categories** and **questions**, where a category has many questions.
- **Ownership rules.** Any logged-in user can read categories and questions. Only the owner can change or delete them: a category belongs to the user who created it, and a question belongs to its category's owner. Everyone else gets a 403.
- **Pagination** on both lists (`?page=1&per_page=10`, at most 100 per page), **filters** on questions (`category_id`, `difficulty`, `question_type`), and a `?mine=true` filter on categories that returns only the logged-in user's own.
- **Validation at three levels** (database constraints, model rules, request schemas) with clear error messages.
- **Starter content.** A seed script loads a demo user with 6 categories and 30 questions, and is safe to run more than once.

### Dashboard (user interface)

The Dashboard is where a logged-in user manages their own **categories**. It shows a paginated list (five per page), a form to add or edit a category, and a detail view, and everything is saved to the database through `/api/categories`:

| Action | Request |
|---|---|
| Open the page | `GET /api/categories?mine=true&per_page=100` |
| Add | `POST /api/categories` |
| Edit | `PATCH /api/categories/<id>` |
| Delete (also removes the category's questions) | `DELETE /api/categories/<id>` |

The list is reloaded after every change so the screen always matches the database. A loading message shows while the list is fetched, a failed load shows its error in place of the list, and a failed add, edit or delete shows the server's message above the list while the form stays open. Questions are managed through the API; the Dashboard does not have a questions screen yet.

## Technologies used

| Layer | Technologies |
|---|---|
| Front end | React, Vite, React Router, Axios, plain CSS |
| Back end | Python, Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-Bcrypt, Flask-JWT-Extended, Marshmallow, Requests, python-dotenv |
| Database | PostgreSQL (SQLite in memory for tests) |
| External API | [Open Trivia Database](https://opentdb.com/api_config.php) (free, keyless) |
| Testing | Vitest and React Testing Library (front end); pytest and pytest-mock (back end) |
| Tooling | Git and GitHub, GitHub Actions (CI), pipenv, ESLint, Postman |
| Hosting | Vercel (front end), Render (Flask API and PostgreSQL), gunicorn (production server) |

## How the pieces fit together

```
Browser ──> Vercel (React app, static files)
               │  requests to /api/*  are forwarded by a rewrite in client/vercel.json
               ▼
            Render web service (Flask + gunicorn) ──> Render PostgreSQL

Browser ──> Open Trivia DB (quiz questions and categories, called directly from the front end)
```

- The front end always calls **relative** paths such as `/api/auth/login`. It never hard-codes a server address.
- **In development**, Vite's dev server forwards `/api` to Flask on port 5555 (`client/vite.config.js`).
- **In production**, a Vercel rewrite forwards `/api` to the Render service, so the two deployments behave as one site and no CORS setup is needed.
- Quiz questions come from Open Trivia DB, whose categories are not rows in our database. That is why a saved round has no category and is stored as a **Mixed** round.

## Project structure

```
CAPSTONE-Mod6-General-Trivia-App/
├── client/                          # React app (run all front-end commands from here)
│   ├── src/
│   │   ├── api/                     # triviaApi.js: Open Trivia DB fetch functions
│   │   ├── components/              # QuestionCard, AnswerOption, CategoryCard, NavBar, Loader,
│   │   │                            # ErrorMessage, Feedback, ProtectedRoute,
│   │   │                            # ResourceList, ResourceForm, ResourceDetail
│   │   ├── context/                 # AuthContext.js, AuthProvider.jsx (login state)
│   │   │                            # ScoreContext.jsx, useScore.js (score, points, streaks, history)
│   │   ├── hooks/                   # useCategories, useQuestions
│   │   ├── pages/                   # HomePage, QuizPage, ResultsPage, ScoreboardPage,
│   │   │                            # LoginPage, SignupPage, DashboardPage
│   │   ├── services/                # api.js: Axios instance (adds the JWT, handles 401)
│   │   │                            # scoreApi.js: saves finished rounds to the backend
│   │   ├── styles/                  # global.css
│   │   ├── tests/                   # Vitest test suite
│   │   ├── utils/                   # quizHelpers.js: scoring, shuffling, answer building
│   │   ├── App.jsx                  # routes: public and protected
│   │   └── main.jsx                 # app entry point
│   ├── vercel.json                  # forwards /api to the Render service
│   ├── vite.config.js               # Vitest settings and the /api dev proxy
│   └── package.json
├── server/                          # Flask API (run all back-end commands from here)
│   ├── app.py                       # create_app factory, blueprints, health check, JSON error handlers
│   ├── config.py                    # Config and TestConfig (reads server/.env)
│   ├── models/                      # db.py, user.py, category.py, question.py, quiz_attempt.py
│   ├── routes/                      # auth_routes.py, api_routes.py, quiz_attempt_routes.py
│   ├── schemas/                     # user_schema.py, quiz_schemas.py (Marshmallow)
│   ├── services/                    # external_api.py: server-side Open Trivia DB client
│   ├── utils/                       # auth.py (bcrypt, JWT, logout blocklist), seed.py, seed_data.py
│   ├── migrations/                  # database migrations
│   ├── tests/                       # conftest.py and test files
│   ├── Pipfile / Pipfile.lock       # back-end dependencies
│   ├── requirements.txt             # used by Render to install dependencies
│   └── .env.example                 # environment variable template
├── .github/workflows/ci.yml         # lint, test and build the front end on every push/PR
└── README.md
```

## Setup and run instructions

These steps run the whole application on your own machine: the database, the Flask API and the React app.

### Prerequisites

| Tool | Check |
|---|---|
| Git | `git --version` |
| Node.js (LTS) and npm | `node --version` and `npm --version` |
| Python 3 | `python3 --version` |
| pipenv | `pipenv --version` (install with `pip install --user pipenv` or `pipx install pipenv`) |
| PostgreSQL | installed in step 2 |

PostgreSQL is a database server installed on your machine. It is **not** installed through pipenv; pipenv only installs the Python packages, including the `psycopg2-binary` driver Flask uses to talk to it.

### 1. Get the code

```bash
git clone https://github.com/Eddie-Njeru1/CAPSTONE-Mod6-General-Trivia-App.git
cd CAPSTONE-Mod6-General-Trivia-App
git switch main
git pull origin main            # always pull before starting work
```

### 2. Install PostgreSQL and create your local database

```bash
# Ubuntu / WSL2 (run these as separate commands)
sudo apt update
sudo apt install -y postgresql postgresql-contrib libpq-dev
sudo service postgresql start   # WSL2 does not auto-start it; run this each session
sudo -u postgres psql -c "CREATE USER trivia_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE trivia_dev OWNER trivia_user;"
```

```bash
# macOS (Homebrew)
brew install postgresql@16 && brew services start postgresql@16
psql postgres -c "CREATE USER trivia_user WITH PASSWORD 'your_password';"
psql postgres -c "CREATE DATABASE trivia_dev OWNER trivia_user;"
```

### 3. Set up the back end

```bash
cd server
pipenv install --dev            # installs all back-end and test dependencies
cp .env.example .env            # then edit .env (see below)
```

Edit `server/.env`:

```
DATABASE_URL=postgresql://trivia_user:your_password@localhost:5432/trivia_dev
JWT_SECRET_KEY=<long random string>
```

Generate a secret key with `python3 -c "import secrets; print(secrets.token_hex(32))"`. `.env` is ignored by Git; never commit it.

Create the tables and (optionally) load the starter content:

```bash
pipenv run flask db upgrade      # creates the tables; safe to repeat
pipenv run python -m utils.seed  # optional: demo user, 6 categories and 30 questions; safe to repeat
```

The seed adds anything that is missing and skips what already exists, so running it twice never creates duplicates. It creates one demo user:

| Field | Value |
|---|---|
| Email | `demo@trivia.app` |
| Username | `demo` |
| Password | `demo-password-123` (development default; set `SEED_DEMO_PASSWORD` in `.env` to use your own) |

### 4. Set up the front end

```bash
cd ../client
npm install
```

### 5. Run the application

Use two terminals and leave both running.

```bash
# Terminal 1: back end (from server/)
sudo service postgresql start                  # WSL2 only
pipenv run flask run --port 5555 --debug       # API at http://localhost:5555
```

```bash
# Terminal 2: front end (from client/)
npm run dev                                    # app at http://localhost:5173
```

Vite forwards every request starting with `/api` to Flask on port 5555 (configured in `client/vite.config.js`), so keep the Flask server running while you use the app. Restart `npm run dev` if you change `vite.config.js`.

### 6. Check that it works

1. Open <http://localhost:5555/api/health>. You should see `{"status": "ok"}`.
2. Open <http://localhost:5173/>. You should be redirected to the login page.
3. Click **Sign up**, create an account, and you land on the home page (or log in as the demo user if you ran the seed).
4. Refresh the page. You should still be logged in.
5. Pick a category, play a round and open the results. Your finished round is saved to the database.
6. Click **Log out**. You should be back at the login page.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `server/.env` (local) and Render (production) | PostgreSQL connection URL. `postgres://` and `postgresql://` URLs are converted to `postgresql+psycopg2://` automatically in `config.py`. |
| `JWT_SECRET_KEY` | `server/.env` (local) and Render (production) | Secret used to sign login tokens. Use a long random value and never commit it. |
| `SEED_DEMO_PASSWORD` | `server/.env` (optional) | Password for the demo user created by the seed script. |

No API key is needed for Open Trivia DB.

### Troubleshooting

| Problem | Fix |
|---|---|
| `connection refused` to PostgreSQL | The database is not running. WSL2: `sudo service postgresql start` |
| `password authentication failed` | The password in `server/.env` must match the one used in `CREATE USER` |
| `ArgumentError: Could not parse SQLAlchemy URL` | `server/.env` is missing or `DATABASE_URL` is empty. Run `cp .env.example .env` inside `server/` and fill it in |
| `ModuleNotFoundError: No module named 'flask'` | Dependencies are not installed. Run `pipenv install --dev` inside `server/` and start Flask with `pipenv run` |
| `ModuleNotFoundError: No module named 'models'` (or `app`, `config`) | Run back-end commands from inside `server/`, using `pipenv run` |
| `apt update` ends with `No module named 'apt_pkg'` | The package lists still refreshed; only a command-not-found hook failed. Run the `apt install` line on its own. To remove the error, make sure `/usr/bin/python3` is the Ubuntu system Python (`sudo update-alternatives --config python3`) |
| `pg_config executable not found` while installing | `sudo apt install libpq-dev`, then run `pipenv install --dev` again |
| `Address already in use` on port 5555 | Another Flask process is running; stop it, or pick another port and update the proxy in `client/vite.config.js` |
| Front end shows network errors on `/api/...` | Flask is not running, or it is not on port 5555 |
| API returns 500 right after setup | The tables are missing. Run `pipenv run flask db upgrade` |

## Running the tests

```bash
# Back end (from server/)
pipenv run pytest -v

# Front end (from client/)
npm test         # run the suite once
npm run lint     # ESLint
npm run build    # production build
```

Back-end tests use an in-memory SQLite database (`TestConfig`), so they never touch your PostgreSQL data.

## API reference

All endpoints are under `/api`. Request and response bodies are JSON. Errors have the form `{"error": "message"}` (validation errors on categories and questions may add a `"details"` field). Protected endpoints need the header `Authorization: Bearer <token>`.

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Confirms the server is running: `{"status": "ok"}` |

### Authentication

| Method | Endpoint | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{username, email, password}` | 201 `{access_token, user}` | 400 invalid or missing field, 409 username or email taken |
| POST | `/api/auth/login` | `{email, password}` | 200 `{access_token, user}` | 400 missing field, 401 wrong credentials |
| POST | `/api/auth/logout` | none (token header) | 200 `{message}`; the token is revoked | 401 missing, invalid, expired or revoked token |
| GET | `/api/auth/me` | none (token header) | 200 `{user}` | 401 missing or invalid token, or the user no longer exists |

Rules: usernames are 3 to 50 characters; emails must be valid and are stored in lowercase; passwords must be at least 8 characters. Tokens last one hour.

### Categories

All category endpoints need a token. Reading is open to any logged-in user; changing or deleting is limited to the owner.

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/api/categories` | Paginated list of categories. Add `?mine=true` to return only your own | 200 | 400 bad pagination, 401 |
| GET | `/api/categories/<id>` | One category | 200 | 401, 404 |
| POST | `/api/categories` | Create a category (owned by the logged-in user) | 201 | 400 invalid, 401, 409 conflict (for example a duplicate name) |
| PUT | `/api/categories/<id>` | Replace a category (all required fields) | 200 | 400, 401, 403 not the owner, 404, 409 |
| PATCH | `/api/categories/<id>` | Update only the fields sent | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/categories/<id>` | Delete a category and its questions | 200 `{message}` | 401, 403, 404 |

Fields: `name` (required, up to 80 characters) and `description` (optional, up to 255). The owner comes from the token, never from the request body. A user cannot have two categories with the same name.

### Questions

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/api/questions` | Paginated list; filters `category_id`, `difficulty`, `question_type` | 200 | 400 bad pagination or filter, 401 |
| GET | `/api/questions/<id>` | One question | 200 | 401, 404 |
| POST | `/api/questions` | Create a question in a category you own | 201 | 400 invalid, 401, 403 category not yours, 404 category not found, 409 |
| PUT | `/api/questions/<id>` | Replace a question | 200 | 400, 401, 403, 404, 409 |
| PATCH | `/api/questions/<id>` | Update only the fields sent | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/questions/<id>` | Delete a question | 200 `{message}` | 401, 403, 404 |

Fields: `text` (1 to 500 characters), `question_type` (`multiple` or `boolean`), `difficulty` (`easy`, `medium` or `hard`), `correct_answer`, `incorrect_answers` (a list) and `category_id`. Multiple-choice questions need exactly 3 incorrect answers; true/false questions use `"True"` or `"False"` with one incorrect answer. Answers must not repeat and the correct answer cannot also be an incorrect one. Ownership fields cannot be changed, and a question can only be moved into a category you own.

**Pagination** (categories and questions). `?page=` starts at 1 (default 1) and `?per_page=` defaults to 10 with a maximum of 100. Anything else returns 400. The response is:

```json
{
  "items": [ ... ],
  "pagination": { "page": 1, "per_page": 10, "total": 42, "pages": 5, "has_next": true, "has_prev": false }
}
```

### Quiz attempts and leaderboard

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| POST | `/api/quiz-attempts` | Save a finished round for the logged-in user. Body: `score`, `total_questions` (required), `points`, `best_streak`, and an optional `category_id` (leave it out for a Mixed round) | 201 with the saved attempt | 400 invalid numbers or body, 401, 404 unknown category |
| GET | `/api/quiz-attempts` | The logged-in user's own rounds, newest first. `?page=` and `?per_page=` (default 10, capped at 50) | 200 `{items, page, per_page, total, pages}` | 400 bad page numbers, 401 |
| GET | `/api/leaderboard` | Top players ranked by total points (public). `?limit=` defaults to 10, capped at 50 | 200 | 400 bad limit |

A saved attempt looks like `{id, score, total_questions, points, best_streak, category_id, category_name, created_at}`; `category_name` is `"Mixed"` when there is no category. A page past the end returns an empty list, not an error.

## Database

Tables (see `server/models/`):

| Table | Columns | Notes |
|---|---|---|
| `users` | `id`, `username` (unique), `email` (unique), `password_hash`, `created_at` | Passwords are bcrypt hashes only; a CHECK keeps usernames at 3 characters or more |
| `categories` | `id`, `name`, `description`, `user_id` (FK), `created_at`, `updated_at` | Owned by one user; unique per `(user_id, name)`; deleting a user deletes their categories |
| `questions` | `id`, `text`, `question_type`, `difficulty`, `correct_answer`, `incorrect_answers` (JSON), `category_id` (FK), `created_at`, `updated_at` | Belongs to a category, so ownership flows from user to category to question; deleting a category deletes its questions |
| `quiz_attempts` | `id`, `user_id` (FK), `category_id` (FK, optional), `score`, `total_questions`, `points`, `best_streak`, `created_at` | One finished round; CHECK constraints keep the numbers valid (for example `total_questions > 0`, `points >= 0`) |

Relationships: a user has many categories and quiz attempts; a category has many questions. Migrations live in `server/migrations/` and are applied with `flask db upgrade`. After a model change, add a migration:

```bash
pipenv run flask db migrate -m "describe the change"
pipenv run flask db upgrade
```

## Deployment

| Part | Host | Link |
|---|---|---|
| Front end (React) | Vercel | <https://capstone-mod6-general-trivia-app.vercel.app/> |
| Back end (Flask API) | Render web service | <https://capstone-mod6-general-trivia-app-1.onrender.com> (health check: `/api/health`) |
| Database | Render PostgreSQL | internal to Render (not public) |

**How they are linked.** The front end only calls relative `/api/...` paths. `client/vercel.json` forwards `/api/*` from the Vercel URL to the Render service, and a second rule sends all other paths to `index.html` so that refreshing a React Router page does not 404. To the user, the whole app lives at the Vercel URL.

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://capstone-mod6-general-trivia-app-1.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Vercel (front end).** Root Directory is `client`. It deploys automatically from the `main` branch, and pull requests get preview deployments.

**Render (back end).** Root Directory is `server`.

| Setting | Value |
|---|---|
| Build command | `pip install -r requirements.txt && flask db upgrade` |
| Start command | `gunicorn "app:create_app()"` |
| Environment variables | `DATABASE_URL` (the Render database's Internal URL), `JWT_SECRET_KEY`, `PYTHON_VERSION` |

The build command applies migrations on every deploy. The seed script is not part of the build; to load the starter content into the hosted database, run it once from your machine with the database's External URL:

```bash
cd server
DATABASE_URL="<external URL>?sslmode=require" JWT_SECRET_KEY=x pipenv run python -m utils.seed
```

**Updating the deployed app.** Merge into `main`. Vercel and Render both rebuild from it. If you add a Python package, regenerate the file Render installs from and commit it with the Pipfile:

```bash
cd server
pipenv install <package>
pipenv requirements > requirements.txt
```

**Free-tier notes.** A free Render web service sleeps after a period of inactivity, so the first request after a break is slow. Open the health check URL first and then reload the app. Free Render PostgreSQL databases expire after 30 days.

## Error handling and validation

- **Open Trivia DB.** Every response includes a `response_code`; a non-zero code (empty results, invalid parameters, rate limit, etc.) is treated as a failure and surfaces the shared `ErrorMessage` component with a retry button. Network failures are caught the same way. The API's rate limit is roughly one request per 5 seconds per IP address. The server-side client in `services/external_api.py` applies the same checks and also handles timeouts, HTTP errors and invalid JSON.
- **Our API.** Every error is JSON (`{"error": "..."}`), including 404, 405 and all authentication failures (missing, invalid, expired and revoked tokens all return 401). Category and question endpoints also return 415 when the body is not JSON, 403 for someone else's record and 409 for database conflicts. Failed saves are rolled back.
- **Validation at three levels.**
  1. *Database constraints:* unique usernames, emails and per-user category names, NOT NULL columns, foreign keys with cascading deletes, and CHECK constraints.
  2. *Model rules:* `@validates` methods in the models (for example username length, email format, question type and answer rules) that raise errors the routes turn into 400 responses.
  3. *Request schemas:* Marshmallow schemas validate incoming category and question data before it reaches the database.
- **Front end.** Forms validate locally before sending anything (required fields, minimum password length, matching confirmation), and server errors are shown to the user. A 401 on a protected request clears the session and sends the user to the login page. Saving a finished round never interrupts the results page. Lists show loading, empty and error states.
- **Security.** Passwords are bcrypt hashes. Login gives the same response for an unknown email and a wrong password, so registered emails are not revealed. Secrets come from environment variables, never from the code.

## Testing and CI

**Back end (pytest).** Test files live in `server/tests/`:

| File | Covers |
|---|---|
| `conftest.py` | Shared fixtures: test app, client, registered user, access token and auth headers |
| `test_auth.py` | Signup, login, logout and `/me` including every error case, plus password hashing and User model constraints |
| `test_models.py` | Category, Question and QuizAttempt models: validation, constraints and relationships |
| `test_quiz_attempt_routes.py` | Saving a round, history, pagination and the leaderboard, using the real app and real signup tokens |
| `test_seed_data.py` | Seed content passes the model rules, and seeding twice is safe |
| `test_api_endpoints.py` | The server-side Open Trivia DB client (`services/external_api.py`), with the network mocked |

**Front end (Vitest and React Testing Library).** Tests live in `client/src/tests/` and cover `AnswerOption`, `QuestionCard`, `useCategories`, `useQuestions`, `ScoreContext`, `scoreApi`, `AuthContext`, `LoginPage`, the resource components and the Dashboard page. The API is mocked, so tests run offline and never touch Open Trivia DB's rate limit.

**CI.** Every push and pull request into `development` or `main` runs `.github/workflows/ci.yml`, which installs dependencies in `client/`, lints, tests and builds the front end. It is visible under the **Checks** tab of any pull request. The back-end tests are run locally with `pipenv run pytest`; they are not part of CI yet.

## Challenges along the way

**Phase 1**

- The Open Trivia DB API has no actual "mixed" category. It just means no category filter at all. The mixed/random option originally passed the literal string `"mixed"` through to the API, which returned nothing useful until it was fixed to omit the category parameter.
- With five people in one codebase, `App.jsx` and the shared stylesheet saw merge conflicts more than once, usually from two people touching the same area before syncing. They were resolved by comparing both versions and keeping whichever was more complete.
- The test suite briefly had a flaky issue where Vitest reported two otherwise-passing test files as failed ("No test found in suite"), traced to both files mocking the same API module.

**Phase 2**

- **Front end and back end disagreed on the contract.** The first review of the auth routes found different URLs (`/api/login` against `/api/auth/login`), different field names (`username` against `email` for login), and a signup response without a token. It was fixed by agreeing one API contract and updating the routes, the front end and the tests together.
- **Everything was built but nothing was connected.** After all roles were merged, the app still opened on the home page because `App.jsx` never mounted the auth provider or registered the new routes, and the navigation bar had no login links. Wiring them together was an unowned task that the team lead picked up.
- **Moving the React app into `client/` broke CI and the deployment.** The workflow still ran at the repo root and Vercel still looked for `package.json` there. The fixes were `working-directory: client` in the workflow and setting Vercel's Root Directory to `client`.
- **Small slips with big effects.** An empty `Pipfile` meant `pipenv install` installed nothing; a trailing comma in a model silently turned a column into a tuple and stopped the server starting; and compiled Python caches were committed before `.gitignore` had the right entry. Pull-request reviews caught all of them.
- **Logout had to become asynchronous.** Revoking the token on the server meant `logout()` waits for a request, which broke a test that expected an immediate result and caused `act(...)` warnings until the test waited for the update.
- **Hosted database URLs.** Hosts hand out `postgres://` URLs, which SQLAlchemy rejects, so `config.py` converts them to `postgresql+psycopg2://`.
- **The Dashboard started as a shell.** It was first built against local state while the endpoints were still in progress. Connecting it needed a `?mine=true` filter on `GET /api/categories`, because the list returned every user's categories and a category carries no owner field.
- **A lint rule objected to loading data in an effect.** ESLint's `react-hooks` rule flags state updates made directly inside an effect, so the Dashboard starts its first load with a request chain that only updates state after the response arrives (and ignores late responses after the page is closed).
- **Quiz categories are not our categories.** Open Trivia DB's categories are not rows in our database, so a finished round is saved without a category and shows up as a Mixed round.

## Current limitations

- **The Dashboard only manages categories.** The question endpoints (create, read, update, delete, filters) are complete and tested on the model level, but there is no screen for adding or editing the questions inside a category yet.
- Custom categories and questions stored in the database are not playable in the quiz yet. The quiz plays Open Trivia DB questions.
- The scoreboard page shows the browser's local round history. Finished rounds are saved to the database and the public leaderboard endpoint exists, but the interface does not display the leaderboard yet.
- Category and question endpoints do not have their own automated tests yet; the back-end suite covers authentication, models, quiz attempts, seed data and the external API client.
- Any logged-in user can read every category and question; only creating, editing and deleting are limited to the owner.
- The server-side Open Trivia DB client (`services/external_api.py`) is tested but not exposed through an endpoint.
- The logout blocklist is kept in server memory. A server restart or redeploy clears it, so a token revoked before the restart works again until it expires (tokens last one hour). A database table would make revocation permanent.
- On the free hosting tier the API can be slow on the first request after inactivity, and the free Render database expires after 30 days.
- Back-end tests are not part of the CI workflow yet, and there are no end-to-end tests. Full user flows were verified manually.
- Narrower Open Trivia DB categories can occasionally return fewer questions than requested; the app plays the round with whatever comes back. Refreshing mid-quiz restarts the round, and switching categories quickly can hit the Open Trivia DB rate limit ("Try again" fixes it).

## Contributors

| Phase 1 Role | Phase 1 Responsibility | Phase 2 Role | Phase 2 Responsibility | Contributor |
|---|---|---|---|---|
| Team Lead | Repo, Git workflow, Vite scaffold, CI/CD pipeline, root app layout, deployment, README and final integration | Team Lead, Auth Architect and Documentation Lead | Full-stack architecture and Flask server configuration, password security (Flask-Bcrypt), JWT authentication (Flask-JWT-Extended), connecting authentication to the front end, deployment to Vercel and Render, and the full-stack README | [Eddie Njeru](https://github.com/Eddie-Njeru1) |
| API and Data Engineer | Open Trivia DB fetch layer, data hooks, HTML decoding, response codes and rate-limit handling, Postman testing | API Endpoints and Serialization Specialist (Backend) | Custom RESTful category and question endpoints, Marshmallow schemas, server-side pagination, record ownership checks, and the server-side trivia API client | [Emmanuel Cheruiyot](https://github.com/emmanuelcheruiyot4-oss) |
| Quiz Logic and State Engineer | Quiz flow, scoring, points and streaks, shared score context, question card and end-of-round logic | Database and Data Modeling Specialist (Backend) | Relational models for users, categories, questions and quiz attempts, foreign keys, constraints and validation rules, seed data and migrations | [Austin Atogo](https://github.com/austinatogo1) |
| Routing and Views Engineer | React Router, app shell and navigation, Home, Category Select, Results and Scoreboard pages | Frontend Auth and Client State Developer | Authentication context and route guards, Axios client that attaches the JWT and handles expired sessions, Login and Signup pages | [Gloria Chebet](https://github.com/Gloria-Chebet1) |
| UI/UX, QA and Presentation Lead | Styling system, responsive layout, accessibility basics, loading, error and empty states, component tests | Frontend UI and QA Lead | The Dashboard interface (paginated list, form and detail views, loading and error feedback) and the front-end component tests | [Sandra Keeru](https://github.com/keerusandra) |
