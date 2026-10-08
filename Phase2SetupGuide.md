# General Trivia App — Phase 2 (Full-Stack)

A full-stack trivia application built with **React** and **Flask + PostgreSQL**. Phase 1 consumed the public Open Trivia DB API; Phase 2 replaces it with our own REST API and database, so users can create an account and manage their own trivia content.

## Core functionality

- Sign up, log in and log out (JWT authentication, bcrypt-hashed passwords)
- Create, view, edit and delete custom quiz **categories** and **questions**
- Users can only change or delete their own data
- Paginated lists (`?page=1&per_page=10`)
- Loading and error feedback in the UI
- Quiz play, scoring and scoreboard from Phase 1

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Axios, Vitest |
| Backend | Flask, Flask-SQLAlchemy, Flask-Migrate, Flask-Bcrypt, Flask-JWT-Extended, Marshmallow |
| Database | PostgreSQL |
| Testing | pytest, pytest-mock (backend); Vitest (frontend) |
| Tooling | Git/GitHub, pipenv, Postman, GitHub Actions |

## Project structure

```
.
├── client/                  # React app (run all frontend commands from here)
│   ├── vite.config.js       # Vite/Vitest config + /api proxy to Flask
│   └── src/
│       ├── components/      # NavBar, ProtectedRoute, Resource* components, ...
│       ├── context/         # AuthContext.js, ScoreContext.js
│       ├── pages/           # DashboardPage, LoginPage, SignupPage, ...
│       ├── services/        # api.js (Axios instance)
│       └── tests/           # Vitest tests
├── server/                  # Flask API (run all backend commands from here)
│   ├── app.py               # create_app factory
│   ├── config.py            # Config and TestConfig
│   ├── models/              # db.py, user.py, category.py, question.py
│   ├── routes/              # auth_routes.py, api_routes.py
│   ├── schemas/             # Marshmallow schemas
│   ├── services/            # external_api.py (optional integrations)
│   ├── utils/               # auth.py, seed.py
│   ├── migrations/          # database migrations
│   ├── tests/               # pytest tests
│   ├── Pipfile              # backend dependencies
│   └── .env.example         # environment variable template
└── README.md
```

## Prerequisites

| Tool | Check it is installed |
|---|---|
| Git | `git --version` |
| Node.js (LTS) and npm | `node --version` and `npm --version` |
| Python 3 | `python3 --version` |
| pipenv | `pipenv --version` |
| PostgreSQL | `psql --version` (installed in Setup, step 2) |

If `pipenv` is missing: `pip install --user pipenv` (or `pipx install pipenv`).

PostgreSQL is a database server installed on your machine. It is **not** installed through pipenv. pipenv only installs the Python packages, including the `psycopg2-binary` driver Flask uses to talk to it.

## Setup

### 1. Get the code and update `main` and `development`

Do this **before** anything else. Phase 2 builds on the latest code in the remote repo, so both branches must be up to date on your machine.

```bash
git clone <repo-url>            # skip if you already have the repo
cd CAPSTONE-Mod6-General-Trivia-App

git status                      # commit or stash any local changes first
git fetch origin                # download the latest branches from GitHub

git switch main
git pull origin main            # update main

git switch development
git pull origin development     # update development (stay on this branch)
```

Confirm you are on `development` and up to date:

```bash
git branch --show-current       # should print: development
git status                      # should say: Your branch is up to date with 'origin/development'
```

If `git pull` reports conflicts or your branch has diverged, stop and ask Eddie before continuing. Do not start Phase 2 work on an out-of-date branch. Repeat the `git pull origin development` step any time a teammate's pull request is merged.

### 2. Install PostgreSQL and create your local database

Every teammate runs their own local database.

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

### 3. Set up the backend

```bash
cd server
pipenv install --dev            # installs all backend and test dependencies
cp .env.example .env            # then edit .env (see below)
```

Edit `server/.env`:

```
DATABASE_URL=postgresql://trivia_user:your_password@localhost:5432/trivia_dev
JWT_SECRET_KEY=<long random string>
```

Generate a secret key with:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

`.env` is ignored by Git. Never commit it.

Create the tables and load demo data. Do this once the models, first migration and seed script have been merged into `development`; until then, skip these two commands:

```bash
pipenv run flask db upgrade     # creates the tables
pipenv run python -m utils.seed # loads demo data; safe to re-run
```

Start the API:

```bash
pipenv run flask run --port 5555 --debug
```

### 4. Set up the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev                     # http://localhost:5173
```

In development, Vite forwards every request starting with `/api` to Flask on port 5555 (configured in `client/vite.config.js`), so frontend code always uses relative paths such as `/api/categories`. Keep the Flask server running while you use the app. Restart `npm run dev` if you change `vite.config.js`.

### 5. Check everything works

- Backend: open <http://localhost:5555/api/health> (available once the health route is merged) or run the backend tests below.
- Frontend: open <http://localhost:5173> and confirm the app loads.

## Running the tests

```bash
# Backend (from server/)
pipenv run pytest -v

# Frontend (from client/)
npm test
```

Backend tests use an in-memory SQLite database (`TestConfig`), so they never touch your PostgreSQL data.

## Daily workflow

```bash
sudo service postgresql start                       # WSL2 only
cd server && pipenv run flask run --port 5555 --debug   # terminal 1
cd client && npm run dev                                 # terminal 2
```

## Team roles and files

| Member | Role | Source files | Test files |
|---|---|---|---|
| Eddie | Team Lead, Auth Architect and Docs | `README.md`, `server/app.py`, `server/config.py`, `server/models/user.py`, `server/routes/auth_routes.py`, `server/utils/auth.py` | `server/tests/test_auth.py` |
| Austin | Database and Data Modeling | `server/models/db.py`, `server/models/__init__.py`, `server/models/category.py`, `server/models/question.py`, `server/utils/seed.py`, `server/migrations/` | `server/tests/test_models.py` |
| Emmanuel | API and Serialization | `server/schemas/user_schema.py`, `server/schemas/quiz_schemas.py`, `server/routes/api_routes.py`, `server/services/external_api.py` | `server/tests/test_api_endpoints.py` |
| Gloria | Frontend Auth and Client State | `client/src/services/api.js`, `client/src/context/AuthContext.js`, `client/src/components/ProtectedRoute.jsx`, `client/src/pages/LoginPage.jsx`, `client/src/pages/SignupPage.jsx` | `client/src/tests/AuthContext.test.jsx`, `client/src/tests/LoginPage.test.jsx` |
| Sandra | Frontend UI and QA | `client/src/pages/DashboardPage.jsx`, `client/src/components/NavBar.jsx` (existing Phase 1 file), `client/src/components/ResourceList.jsx`, `client/src/components/ResourceForm.jsx`, `client/src/components/ResourceDetail.jsx` | `client/src/tests/ResourceComponents.test.jsx` |

Only the owner edits a file. To request a change in someone else's file, comment on their pull request or open a GitHub Issue. Shared test fixtures live in `server/tests/conftest.py` (Eddie).

## Git workflow

- `main` holds stable code; `development` is where work is integrated.
- Pull the latest `main` and `development` before starting (Setup, step 1), then create a feature branch from `development`: `git checkout -b feature/<area>-<short-name>`.
- Commit small and often, with clear messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Open a pull request into `development`. Do not push directly to `development` or `main`.
- Delete your branch after it is merged.

## Troubleshooting

| Problem | Fix |
|---|---|
| `connection refused` to PostgreSQL | The database is not running. WSL2: `sudo service postgresql start` |
| `password authentication failed` | The password in `server/.env` must match the one used in `CREATE USER` |
| `Either SQLALCHEMY_DATABASE_URI or SQLALCHEMY_BINDS needs to be set` | `server/.env` is missing. Run `cp .env.example .env` inside `server/` |
| `ModuleNotFoundError: No module named 'models'` (or `app`, `config`) | Run backend commands from inside `server/`, using `pipenv run` |
| `apt update` ends with `No module named 'apt_pkg'` | The package lists still refreshed; only a command-not-found hook failed. Run the `apt install` line on its own. To remove the error, check `/usr/bin/python3 --version`: it should be the Ubuntu system Python (3.12 on Ubuntu 24.04); if not, run `sudo update-alternatives --config python3` and pick it |
| `pg_config executable not found` while installing | `sudo apt install libpq-dev`, then run `pipenv install --dev` again |
| `Address already in use` on port 5555 | Another Flask process is running; stop it or pick another port and update the proxy in `client/vite.config.js` |
| Frontend shows network errors on `/api/...` | Flask is not running, or it is not on port 5555 |

## Deployment

Not deployed yet. A live link will be added here if the team deploys.