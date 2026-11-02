# General Trivia App

A full-stack, installable trivia quiz application. Players sign up, pick a category (or a mixed round), answer multiple-choice and true/false questions with instant feedback, earn points with streak bonuses, and compete on a public leaderboard. Signed-in users manage their own quiz categories and questions, administrators moderate the whole platform, and the app keeps working with **no internet connection** as a Progressive Web App (PWA).

**Live app:** <https://capstone-mod6-general-trivia-app.vercel.app/> (React front end on Vercel)
**API health check:** <https://capstone-mod6-general-trivia-app-1.onrender.com/api/health> (Flask back end on Render)

The Vercel site forwards every `/api/*` request to the Render service, so the two deployments behave as one website. The first request after a quiet period can be slow while the free Render service wakes up. Open the health check URL first, then reload the app.

## The project in three phases

| Phase | What was built |
|---|---|
| **Phase 1** | A React front end that turns questions from the [Open Trivia Database](https://opentdb.com/api_config.php) into a playable quiz: categories, instant feedback, difficulty-weighted points, streak bonuses, local round history, loading and error states, automated tests and CI. |
| **Phase 2** | Our own back end: a Flask REST API with PostgreSQL, JWT authentication, saved quiz results, a public leaderboard endpoint, category and question CRUD with ownership rules, a seed script, and a user Dashboard. Deployed to Vercel and Render. |
| **Phase 3** | Roles and an **admin portal**, account deactivation and login tracking, a redesigned app shell (landing page, side menu, avatar menu, 404 page), welcome banner and paginated category tiles with icons and colours, question management on the Dashboard, a live leaderboard, **PWA install and offline play** with an offline question pack and a sync queue for rounds played offline, database-backed logout (token blocklist), and back-end tests in CI. |

This README describes the final state of the project (Phase 3), which includes everything from the earlier phases.

## Contents

1. [Core functionality](#core-functionality)
2. [Technologies used](#technologies-used)
3. [How the pieces fit together](#how-the-pieces-fit-together)
4. [Project structure](#project-structure)
5. [Setup and run instructions](#setup-and-run-instructions)
6. [Running the tests](#running-the-tests)
7. [Using the app: roles and pages](#using-the-app-roles-and-pages)
8. [API reference](#api-reference)
9. [Database](#database)
10. [Progressive Web App and offline mode](#progressive-web-app-and-offline-mode)
11. [Deployment](#deployment)
12. [Error handling and validation](#error-handling-and-validation)
13. [Security](#security)
14. [Testing and CI](#testing-and-ci)
15. [Team workflow](#team-workflow)
16. [Challenges along the way](#challenges-along-the-way)
17. [Current limitations](#current-limitations)
18. [Troubleshooting](#troubleshooting)
19. [Contributors](#contributors)

## Core functionality

### Quiz

- **Questions from two sources.** Online, questions and categories come from the Open Trivia Database (free, no API key). Offline, they come from a bundled pack of our own questions (see [offline mode](#progressive-web-app-and-offline-mode)).
- **Category tiles and a Mixed / Random round.** The home page shows colour-coded category tiles, eight per page with Previous and Next buttons. "Mixed / Random" pulls from every category (the Open Trivia DB has no real "mixed" category; the app simply omits the category filter).
- **Multiple-choice and true/false questions**, handled by one shared question component. True/false buttons always appear as True then False; multiple-choice answers are shuffled once per question.
- **Instant feedback.** Correct answers turn green, a wrong pick turns red, and the right answer is always revealed.
- **Points and streaks.** Easy, medium and hard answers are worth 10, 20 and 30 points. Three or four correct in a row multiplies points by 1.5, and five or more by 2.
- **Rounds of 10 questions**, with a progress bar and a results page showing score and points.
- **Round history** (the 20 most recent rounds) is kept in the browser's local storage, so guests and offline players always see their own history.

### Accounts and access control

- **Sign up, log in and log out** with JWT authentication. Passwords are hashed with bcrypt and never stored or returned in plain text. Signing up logs the user in straight away, and users log in with their email and password.
- **Sessions survive a refresh.** The token and user are saved in the browser. On every load the app re-checks the session with `GET /api/auth/me`, so a changed role, an expired or revoked token, or a deactivated account is noticed immediately. If the server cannot be reached (for example, you are offline) the saved session is kept so the installed app still works.
- **Logout really logs out.** The server stores the token's ID in a `token_blocklist` table, so a logged-out token stays blocked even after the server restarts or redeploys.
- **Roles.** Every account is a `user` or an `admin`. Sign-up can never create an admin. The first admin is created on purpose with `flask create-admin`.
- **Deactivation.** An admin can deactivate an account. A deactivated user cannot log in, and an old token stops working on every protected route (403 "Account is deactivated"). Their data is kept, and they disappear from the leaderboard until reactivated.
- **Login tracking.** Each account records `last_login_at` and `login_count`, shown to admins.
- **Route guards.** Logged-out visitors are redirected to the login page and returned to the page they asked for after logging in. Non-admins who open `/admin` are sent to `/home`. The server enforces the same rules on every request, so hiding a link is never the only protection.

### Saved results and leaderboard

- **Finished rounds are saved to the database** for signed-in users (score, total, points, best streak) through `POST /api/quiz-attempts`. Saving happens in the background: if it fails or the token has expired, the round is still kept in the browser and the results page is never interrupted.
- **Rounds played offline are queued** and sent automatically when the connection returns (see [the sync queue](#the-sync-queue)).
- **Scoreboard page.** "Top players" shows the public leaderboard (rank, player, total points, games played, best streak) with the signed-in player's row highlighted. "Your rounds" shows the player's own history. The leaderboard section has its own loading, error (with retry) and empty states, so a failed request never hides the player's own rounds.

### Dashboard: your own categories and questions

The Dashboard is where a signed-in user manages their own content, all saved to the database:

- **Categories:** a paginated list (five per page), an add/edit form, and a detail view. Add, edit and delete call `POST`, `PATCH` and `DELETE` on `/api/categories`, and the list reloads after every change.
- **Questions:** choose **View Details** on a category to open its question manager. It lists the category's questions (10 per page) with Edit and Delete buttons, and an **Add Question** form for multiple-choice and true/false questions. The form checks the same rules as the back end (text length, exactly 3 different wrong answers, correct answer not repeated, true/false fills in the opposite answer automatically) so the user gets a clear message before anything is sent.
- Deleting a category also deletes its questions, and failures show the server's message without closing the form.

### Admin portal (`/admin`, admins only)

- **Overview:** statistic cards (total, active, deactivated and admin users; categories; questions; quiz attempts; new users and logins in the last 7 days).
- **Users:** searchable (username or email), filterable (role, status) and paginated table showing role, status, login count, last login and how many categories, questions and attempts each user has. Admins can make a user an admin or a regular user, activate or deactivate an account, or delete a user (which also deletes their categories, questions and rounds).
- **Questions:** a filterable (category, difficulty, type), paginated table of every question from every user, with delete for moderation.
- Safety rules are enforced by the server and mirrored in the interface: admins cannot change their own role, deactivate themselves or delete themselves, and the last administrator can never be demoted, deactivated or deleted.
- Admins can also edit or delete any user's categories and questions through the API.

### App shell and navigation

- **Public landing page** with a hero banner, a feature strip and an interactive "Try it" sample question, plus Log in and Sign up links. Signed-in users are redirected to `/home`.
- **Side menu** (Home, Scoreboard, Dashboard, and Admin for admins only) that becomes a bar along the bottom of the screen on phones.
- **Avatar menu** at the top right showing the username and role, with Log out (closes on outside click or Escape).
- **Welcome banner** on the home page greeting the player and showing their best streak.
- **404 page** for unknown URLs, with a link back to the right starting page for logged-in or logged-out visitors.

### Progressive Web App

- **Installable** on phones and desktops (Install App button when the browser offers it) and opens in its own window.
- **Works offline:** the app files, a bundled question pack and the offline categories are cached by a service worker.
- **Offline banner** appears while disconnected and disappears on reconnect.
- **Update prompt** lets the user choose when to load a new version, so nobody loses a quiz mid-round.

### Starter content

A seed script loads a demo user with **8 categories and 80 questions** (10 per category, every difficulty and both question types, each with an icon and a colour). It is safe to run more than once.

## Technologies used

| Layer | Technologies |
|---|---|
| Front end | React 19, Vite 8, React Router 7, Axios, plain CSS, `vite-plugin-pwa` (service worker and web app manifest), `@vite-pwa/assets-generator` (app icons) |
| Back end | Python 3.14, Flask, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-Bcrypt, Flask-JWT-Extended, Marshmallow, Requests, python-dotenv |
| Database | PostgreSQL (SQLite in memory for tests) |
| External API | [Open Trivia Database](https://opentdb.com/api_config.php) (free, keyless) |
| Testing | Vitest and React Testing Library (front end); pytest and pytest-mock (back end) |
| Tooling | Node.js 22, ESLint, pipenv, Git and GitHub, GitHub Actions (CI), Postman |
| Hosting | Vercel (front end), Render (Flask API with gunicorn, and PostgreSQL) |

## How the pieces fit together

```
Browser ──> Vercel (React app, static files, service worker)
               │  requests to /api/*  are forwarded by a rewrite in client/vercel.json
               ▼
            Render web service (Flask + gunicorn) ──> Render PostgreSQL

Browser ──> Open Trivia DB (quiz questions and categories, called directly from the front end)

Offline  ──> bundled offline question pack (client/src/data/offlineQuestions.json)
             + sync queue in localStorage, sent to the API when the connection returns
```

- The front end always calls **relative** paths such as `/api/auth/login`. It never hard-codes a server address.
- **In development**, Vite's dev server forwards `/api` to Flask on port 5555 (`client/vite.config.js`).
- **In production**, a Vercel rewrite forwards `/api` to the Render service, so no CORS setup is needed.
- Open Trivia DB categories are not rows in our database. That is why a saved round has no category and is stored as a **Mixed** round.
- Custom categories and questions created on the Dashboard are stored in our database and managed through our API. The quiz plays Open Trivia DB questions online and the bundled pack offline.

### Front-end state

| Context or module | Holds |
|---|---|
| `AuthProvider` (`useAuth()`) | `user`, `token`, `isAuthenticated`, `isAdmin`, `initializing` (a saved token is being checked), `loading`, `error`, `login`, `signup`, `logout`, `clearError` |
| `ScoreProvider` (`useScore()`) | `score`, `points`, `streak`, `bestStreak`, `totalQuestions`, `history`, `saveStatus` (`idle`, `saving`, `saved`, `queued`, `guest`), `startRound`, `recordAnswer`, `finishRound` |
| `services/api.js` | One Axios client that attaches the JWT to every request and, on a 401 from a protected request, clears the session and sends the user to `/login` |
| `services/scoreApi.js` | Saves finished rounds with plain Axios (never redirects, so a round can't interrupt the results page) |
| `services/syncQueue.js` | The outbox for rounds that could not be saved |
| `services/offlineQuestions.js` | Reads the offline pack and returns questions in the same shape as the online API |

## Project structure

```
CAPSTONE-Mod6-General-Trivia-App/
├── client/                              # React app (run all front-end commands from here)
│   ├── public/
│   │   └── icons/                       # icon.svg (source), favicon, PWA and Apple touch icons
│   ├── src/
│   │   ├── api/                         # triviaApi.js: Open Trivia DB fetch functions
│   │   ├── components/
│   │   │   ├── admin/                   # AdminOverview, AdminUsers, AdminQuestions
│   │   │   ├── landing/                 # Hero, FeatureStrip, TryItQuestion
│   │   │   ├── layout/                  # AppLayout, SideMenu, UserMenu
│   │   │   ├── pwa/                     # OfflineBanner, InstallButton, UpdatePrompt
│   │   │   ├── AdminRoute.jsx, ProtectedRoute.jsx        # route guards
│   │   │   ├── CategoryGrid.jsx, CategoryTile.jsx        # paginated category tiles
│   │   │   ├── QuestionCard.jsx, AnswerOption.jsx, Feedback.jsx
│   │   │   ├── QuestionManager.jsx, QuestionList.jsx, QuestionForm.jsx
│   │   │   ├── ResourceList.jsx, ResourceForm.jsx, ResourceDetail.jsx
│   │   │   ├── WelcomeBanner.jsx, Loader.jsx, ErrorMessage.jsx
│   │   │   └── NavBar.jsx, CategoryCard.jsx              # earlier versions, superseded by SideMenu and CategoryTile
│   │   ├── context/                     # AuthContext.js + AuthProvider.jsx, useScore.js + ScoreContext.jsx
│   │   ├── data/                        # offlineQuestions.json (generated, do not edit by hand)
│   │   ├── hooks/                       # useCategories, useQuestions, useLeaderboard, useAdminData,
│   │   │                                # useOnlineStatus, usePwaInstall
│   │   ├── pages/                       # LandingPage, LoginPage, SignupPage, HomePage, QuizPage,
│   │   │                                # ResultsPage, ScoreboardPage, DashboardPage, AdminPage, NotFoundPage
│   │   ├── services/                    # api.js, adminApi.js, scoreApi.js, syncQueue.js, offlineQuestions.js
│   │   ├── styles/                      # global.css, categories.css, layout.css, admin.css
│   │   ├── tests/                       # Vitest test suite
│   │   ├── utils/                       # quizHelpers.js, categoryIcons.js, questionRules.js
│   │   ├── App.jsx                      # route map: public, logged-in and admin routes
│   │   └── main.jsx                     # app entry point
│   ├── pwa-assets.config.js             # icon generation settings
│   ├── vercel.json                      # /api rewrite, SPA fallback, no-cache for sw.js
│   ├── vite.config.js                   # Vitest settings, PWA plugin, /api dev proxy
│   └── package.json
├── server/                              # Flask API (run all back-end commands from here)
│   ├── app.py                           # create_app factory, blueprints, health check, JSON error handlers
│   ├── cli.py                           # `flask create-admin`
│   ├── config.py                        # Config and TestConfig (reads server/.env)
│   ├── models/                          # db.py, user.py, category.py, question.py,
│   │                                    # quiz_attempt.py, token_blocklist.py
│   ├── routes/                          # auth_routes.py, api_routes.py, quiz_attempt_routes.py, admin_routes.py
│   ├── schemas/                         # user_schema.py, quiz_schemas.py, admin_schemas.py (Marshmallow)
│   ├── services/                        # external_api.py: server-side Open Trivia DB client
│   ├── utils/                           # auth.py (bcrypt, JWT, access decorators), seed.py, seed_data.py,
│   │                                    # export_offline_pack.py
│   ├── migrations/                      # Alembic migrations
│   ├── tests/                           # conftest.py and test files
│   ├── docs/erd.png                     # database diagram
│   ├── DATABASE.md                      # database guide
│   ├── Pipfile / Pipfile.lock           # back-end dependencies
│   ├── requirements.txt                 # what Render installs from (runtime packages only)
│   ├── pytest.ini
│   └── .env.example                     # environment variable template
├── .github/workflows/ci.yml             # front-end and back-end checks on every push and pull request
├── ManualQAChecklist.md                 # manual QA results (desktop, mobile, auth, installed PWA)
└── README.md
```

## Setup and run instructions

These steps run the whole application on your own machine: the database, the Flask API and the React app.

### Prerequisites

| Tool | Check |
|---|---|
| Git | `git --version` |
| Node.js 22 (LTS) and npm | `node --version` and `npm --version` |
| Python 3.14 | `python3 --version` |
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

(Team members working on features branch from `development` instead; see [Team workflow](#team-workflow).)

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

Use letters and numbers only in the password: `@ # / :` break the connection URL.

### 3. Set up the back end

```bash
cd server
pipenv install --dev            # installs all back-end and test dependencies
cp .env.example .env            # then edit .env (see below)
```

Edit `server/.env`:

```
DATABASE_URL=postgresql+psycopg2://trivia_user:your_password@localhost:5432/trivia_dev
JWT_SECRET_KEY=<long random string>

# Optional: password for the demo user created by the seed script
SEED_DEMO_PASSWORD=choose-a-demo-password

# Optional: the first admin account (all three are needed)
ADMIN_USERNAME=boss
ADMIN_EMAIL=boss@example.com
ADMIN_PASSWORD=choose-a-strong-password
```

Generate a secret key with `python3 -c "import secrets; print(secrets.token_hex(32))"`. `.env` is ignored by Git; never commit it.

Create the tables, load the starter content and create your admin:

```bash
pipenv run flask db upgrade             # creates all tables (both migrations); safe to repeat
pipenv run python -m utils.seed         # optional: demo user, 8 categories, 80 questions; safe to repeat
pipenv run flask --app app create-admin # optional: the admin from the ADMIN_* variables; safe to repeat
```

The seed adds anything that is missing and skips what already exists, so running it twice never creates duplicates. It creates one demo user:

| Field | Value |
|---|---|
| Email | `demo@trivia.app` |
| Username | `demo` |
| Password | `demo-password-123` (development default; set `SEED_DEMO_PASSWORD` in `.env` to use your own) |

`create-admin` never promotes an existing account: if someone already signed up with the admin email, it stops with an error instead of handing them admin access. It never prints or resets a password.

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
2. Open <http://localhost:5173/>. You should see the public landing page.
3. Click **Sign up**, create an account, and you land on the home page (or log in as the demo user if you ran the seed).
4. Refresh the page. You should still be logged in.
5. Pick a category, play a round and open the results. Your finished round is saved to the database and appears on the Scoreboard.
6. Open **Dashboard**, add a category, open **View Details** and add a question to it.
7. Log in as the admin and open **Admin**. You should see the Overview, Users and Questions tabs. A normal user who visits `/admin` is sent back to the home page.
8. Click your avatar, then **Log out**. You should be back on the landing page.

### Trying the PWA locally

The service worker is switched off in `npm run dev` so you never see stale pages while coding. To test installing and offline mode, build and preview the production app:

```bash
cd client
npm run build
npm run preview        # serves the production build, usually at http://localhost:4173
```

Open it in Chrome, install the app from the address bar or the **Install App** button, then turn on "Offline" in DevTools (Network tab) and reload. See [offline mode](#progressive-web-app-and-offline-mode) for what to expect.

### Useful commands

| Where | Command | What it does |
|---|---|---|
| `client/` | `npm run dev` | Start the development server |
| `client/` | `npm run build` | Production build (also generates the manifest and service worker) |
| `client/` | `npm run preview` | Serve the production build locally |
| `client/` | `npm run lint` | Check the code with ESLint |
| `client/` | `npm test` | Run the front-end tests once |
| `client/` | `npm run generate-pwa-assets` | Re-create every app icon size from `public/icons/icon.svg` |
| `server/` | `pipenv run flask db upgrade` | Apply database migrations |
| `server/` | `pipenv run flask db migrate -m "message"` | Create a migration after a model change (Austin only, see [Database](#changing-the-database)) |
| `server/` | `pipenv run python -m utils.seed` | Load the starter content |
| `server/` | `pipenv run flask --app app create-admin` | Create the admin account |
| `server/` | `pipenv run python -m utils.export_offline_pack` | Rebuild the offline question pack from the seed data |
| `server/` | `pipenv run python -m utils.export_offline_pack --check` | Fail if the offline pack is out of date (also runs in CI) |
| `server/` | `pipenv run pytest -v` | Run the back-end tests |

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `server/.env` (local) and Render (production) | PostgreSQL connection URL. `postgres://` and `postgresql://` URLs are converted to `postgresql+psycopg2://` automatically in `config.py`. |
| `JWT_SECRET_KEY` | `server/.env` (local) and Render (production) | Secret used to sign login tokens. Use a long random value and never commit it. |
| `SEED_DEMO_PASSWORD` | `server/.env` (optional) | Password for the demo user created by the seed script. |
| `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `server/.env` (optional) | The admin account created by `flask create-admin` (and by the seed script when all three are set). |
| `PYTHON_VERSION` | Render | Python version used for the hosted build. |

No API key is needed for Open Trivia DB.

## Running the tests

```bash
# Back end (from server/)
pipenv run pytest -v

# Front end (from client/)
npm test         # run the suite once
npm run lint     # ESLint
npm run build    # production build
```

Back-end tests use an in-memory SQLite database (`TestConfig`), so they never touch your PostgreSQL data. Front-end tests mock the APIs, so they run offline and never touch Open Trivia DB's rate limit.

## Using the app: roles and pages

| Page | URL | Who can open it |
|---|---|---|
| Landing | `/` | Everyone (signed-in users are redirected to `/home`) |
| Log in, Sign up | `/login`, `/signup` | Everyone |
| Home (categories) | `/home` | Signed-in users |
| Quiz | `/quiz?category=<id or mixed>` | Signed-in users |
| Results | `/results` | Signed-in users |
| Scoreboard | `/scoreboard` | Signed-in users |
| Dashboard | `/dashboard` | Signed-in users |
| Admin | `/admin` | Admins only (everyone else goes to `/home`) |
| Not found | any other URL | Everyone |

What each kind of visitor can do:

| | Guest | Signed-in user | Admin |
|---|---|---|---|
| See the landing page and try the sample question | yes | redirected to Home | redirected to Home |
| Play quizzes | no (log in first) | yes | yes |
| Rounds saved to the database | no | yes | yes |
| Read all categories and questions | no | yes | yes |
| Create categories and questions | no | yes (own) | yes |
| Edit or delete categories and questions | no | own only | any |
| View the leaderboard | API is public; the page needs a login | yes | yes |
| Manage users, view statistics, moderate questions | no | no | yes |

## API reference

All endpoints are under `/api`. Request and response bodies are JSON. Errors have the form `{"error": "message"}` (validation errors may add a `"details"` field). Protected endpoints need the header `Authorization: Bearer <token>`.

**Authentication errors (every protected endpoint):**

| Status | `error` | Meaning |
|---|---|---|
| 401 | `Authentication required` | No token sent |
| 401 | `Invalid token` | Token is malformed |
| 401 | `Token has expired` | Tokens last one hour |
| 401 | `Token has been revoked` | The user logged out |
| 401 | `User not found` | The account was deleted after the token was issued |
| 403 | `Account is deactivated` | An admin deactivated the account |
| 403 | `Admin access required` | Admin-only endpoint, regular user |

Roles are always read from the database, never trusted from the token, so a demotion or deactivation takes effect immediately.

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Confirms the server is running: `{"status": "ok"}` |

### Authentication

| Method | Endpoint | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{username, email, password}` | 201 `{access_token, user}` | 400 invalid or missing field, 409 username or email taken |
| POST | `/api/auth/login` | `{email, password}` | 200 `{access_token, user}` | 400 missing field, 401 wrong credentials, 403 account deactivated |
| POST | `/api/auth/logout` | none (token header) | 200 `{message}`; the token is revoked | 401 |
| GET | `/api/auth/me` | none (token header) | 200 `{user}` | 401, 403 |

The `user` object is `{id, username, email, role, created_at}`. Rules: usernames are 3 to 50 characters; emails must be valid and are stored in lowercase; passwords must be at least 8 characters. Sign-up ignores any `role` in the body. Login gives the same 401 for an unknown email and a wrong password, and only reveals a deactivated account once the password is correct. Signing up and logging in each add one to `login_count` and update `last_login_at`.

### Categories

All category endpoints need a token for an active account. Reading is open to any signed-in user. Changing or deleting is limited to the owner, or an admin.

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/api/categories` | Paginated list. Add `?mine=true` to return only your own | 200 | 400 bad pagination, 401, 403 |
| GET | `/api/categories/<id>` | One category | 200 | 401, 403, 404 |
| POST | `/api/categories` | Create a category (owned by you) | 201 | 400 invalid, 401, 403, 409 duplicate name, 415 not JSON |
| PUT | `/api/categories/<id>` | Replace a category (a missing `icon` or `color` is cleared) | 200 | 400, 401, 403 not the owner, 404, 409 |
| PATCH | `/api/categories/<id>` | Update only the fields sent | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/categories/<id>` | Delete a category and its questions | 200 `{message}` | 401, 403, 404 |

Fields: `name` (required, up to 80 characters), `description` (optional, up to 255), `icon` (optional key such as `globe`: lowercase letters, numbers and hyphens, up to 40) and `color` (optional `#RRGGBB`, stored in capitals). The owner always comes from the token, never from the request body. A user cannot have two categories with the same name.

### Questions

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/api/questions` | Paginated list; filters `category_id`, `difficulty`, `question_type` | 200 | 400 bad pagination or filter, 401, 403 |
| GET | `/api/questions/<id>` | One question | 200 | 401, 403, 404 |
| POST | `/api/questions` | Create a question in a category you own | 201 | 400 invalid, 401, 403 category not yours, 404 category not found, 409, 415 |
| PUT | `/api/questions/<id>` | Replace a question | 200 | 400, 401, 403, 404, 409 |
| PATCH | `/api/questions/<id>` | Update only the fields sent | 200 | 400, 401, 403, 404, 409 |
| DELETE | `/api/questions/<id>` | Delete a question | 200 `{message}` | 401, 403, 404 |

Fields: `text` (1 to 500 characters), `question_type` (`multiple` or `boolean`), `difficulty` (`easy`, `medium` or `hard`), `correct_answer`, `incorrect_answers` (a list) and `category_id`. Multiple-choice questions need exactly 3 incorrect answers; true/false questions use `"True"` or `"False"` with the opposite as the single incorrect answer. Answers must not repeat and the correct answer cannot also be an incorrect one. `id`, `created_at`, `updated_at` and `user_id` cannot be sent on an update, and a question can only be moved into a category you own (or any category, for admins).

**Pagination** (categories, questions and admin lists). `?page=` starts at 1 (default 1) and `?per_page=` defaults to 10 with a maximum of 100. Anything else returns 400. The response is:

```json
{
  "items": [ ... ],
  "pagination": { "page": 1, "per_page": 10, "total": 42, "pages": 5, "has_next": true, "has_prev": false }
}
```

(The admin lists use the keys `users`, `categories` and `questions` instead of `items`.)

### Quiz attempts and leaderboard

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| POST | `/api/quiz-attempts` | Save a finished round for the signed-in user. Body: `score`, `total_questions` (required), `points`, `best_streak`, and an optional `category_id` (leave it out for a Mixed round) | 201 with the saved attempt | 400 invalid numbers or body, 401, 403, 404 unknown category |
| GET | `/api/quiz-attempts` | The signed-in user's own rounds, newest first. `?page=` and `?per_page=` (default 10, capped at 50) | 200 `{items, page, per_page, total, pages}` | 400 bad page numbers, 401, 403 |
| GET | `/api/leaderboard` | Top players ranked by total points (public). `?limit=` defaults to 10, capped at 50 | 200, a list of `{rank, username, total_points, games_played, best_streak}` | 400 bad limit |

A saved attempt looks like `{id, score, total_questions, points, best_streak, category_id, category_name, created_at}`; `category_name` is `"Mixed"` when there is no category. A page past the end returns an empty list, not an error. Ties on the leaderboard are broken by fewer games played, then alphabetically. Deactivated players are left out.

### Admin API

Every admin endpoint needs a token for an **active admin**. They live under `/api/admin`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | `total_users`, `active_users`, `inactive_users`, `admin_users`, `total_categories`, `total_questions`, `total_quiz_attempts`, `new_users_7d`, `logins_7d` |
| GET | `/api/admin/users` | Paginated users with `category_count`, `question_count`, `attempt_count`, `login_count` and `last_login_at`. Filters: `role`, `is_active`, `q` (username or email search), `page`, `per_page` |
| PATCH | `/api/admin/users/<id>` | Change `role` (`user` or `admin`) and/or `is_active` |
| DELETE | `/api/admin/users/<id>` | Delete a user and everything they own |
| GET | `/api/admin/categories` | Paginated categories from all users; optional `user_id` filter |
| GET, PATCH, DELETE | `/api/admin/categories/<id>` | Read, update or delete any category |
| POST | `/api/admin/categories` | Create a category owned by the admin |
| GET | `/api/admin/questions` | Paginated questions from all users; filters `category_id`, `difficulty`, `question_type` |
| GET, PATCH, DELETE | `/api/admin/questions/<id>` | Read, update or delete any question |
| POST | `/api/admin/questions` | Create a question in any existing category |

Errors: 400 for a bad filter, bad pagination or a broken safety rule, 401, 403, 404, 409 for database conflicts and 422 for invalid request bodies. The safety rules that return 400: an admin cannot remove their own admin role, deactivate their own account or delete their own account, and the last administrator (or the last active one) cannot be demoted, deactivated or deleted. Passwords and password hashes are never included in any response.

## Database

Five tables, plus `alembic_version` (Flask-Migrate's own record of which migration the database is on). The full guide, with design decisions and troubleshooting, is in [`server/DATABASE.md`](server/DATABASE.md).

```mermaid
erDiagram
    users ||--o{ categories : "owns"
    users ||--o{ quiz_attempts : "plays"
    categories ||--o{ questions : "contains"
    categories |o--o{ quiz_attempts : "played in (optional)"

    users {
        int id PK
        string username UK
        string email UK
        string password_hash
        string role "user or admin"
        boolean is_active
        datetime last_login_at
        int login_count
        datetime created_at
    }
    categories {
        int id PK
        string name
        string description
        string icon
        string color
        int user_id FK
        datetime created_at
        datetime updated_at
    }
    questions {
        int id PK
        string text
        string question_type
        string difficulty
        string correct_answer
        json incorrect_answers
        int category_id FK
        datetime created_at
        datetime updated_at
    }
    quiz_attempts {
        int id PK
        int user_id FK
        int category_id FK "null = Mixed round"
        int score
        int total_questions
        int points
        int best_streak
        datetime created_at
    }
    token_blocklist {
        int id PK
        string jti UK
        datetime expires_at
        datetime created_at
    }
```

| Table | One row is... | Notes |
|---|---|---|
| `users` | an account | Passwords are bcrypt hashes only. `role` is `user` or `admin`; `is_active`, `last_login_at` and `login_count` support deactivation and login tracking |
| `categories` | a user's quiz category | Unique per `(user_id, name)`. Optional `icon` key and `color` hex code for the tiles. Deleting a user deletes their categories |
| `questions` | one question in a category | Ownership flows from user to category to question. Deleting a category deletes its questions |
| `quiz_attempts` | one finished round | `category_id` is empty for a Mixed round and becomes empty (the round is kept) if its category is deleted. CHECK constraints keep the numbers valid |
| `token_blocklist` | one logged-out token | Stores the token's ID (`jti`) until it would have expired anyway; cleaned up on each logout |

**Validation happens at three levels:** database constraints (unique names, NOT NULL, foreign keys with cascading deletes, CHECK rules), model rules (`@validates` methods and save-time checks that raise clear errors), and request schemas (Marshmallow). Even raw SQL cannot save an invalid row.

**Migrations** live in `server/migrations/`:

| Revision | What it does |
|---|---|
| `85ac05da5624` | Phase 2: `users`, `categories`, `questions`, `quiz_attempts` |
| `9a276177eee4` | Phase 3: user roles and login tracking, category `icon` and `color`, the `token_blocklist` table |

New required columns have a database default, so the hosted database (which already had users) upgraded cleanly. Nobody is made an admin by a migration. Apply migrations with `flask db upgrade` (Render does this on every deploy). Check where your database is with `pipenv run flask db current`.

### Changing the database

Only one person (Austin) creates migrations, so the project never ends up with two competing migration histories. To request a change (a new column, table or rule), open a GitHub Issue with what needs storing, which table it belongs to and whether it is required. After pulling a branch that contains a new migration, everyone runs `pipenv run flask db upgrade`. Never edit a merged migration file, never run `flask db init` again, and commit the migration together with the model change.

## Progressive Web App and offline mode

### What makes it a PWA

- `vite-plugin-pwa` generates a web app manifest (name, colours, standalone display, icons) and a service worker at build time. The Vite configuration is in `client/vite.config.js`.
- The service worker saves the built app files, icons and the offline question pack, so the app opens with no connection. Opening any page while offline loads the saved app, except `/api` requests, which always go to the network.
- Icons in every size come from one drawing, `client/public/icons/icon.svg`. Regenerate them with `npm run generate-pwa-assets` after changing it.
- `client/vercel.json` sends `Cache-Control: no-cache` for `sw.js`, so browsers always check for a new version.
- **Update flow:** a new version waits until the user clicks **Update now** in the update prompt (or **Later**), so a quiz is never reloaded mid-round.
- **Install flow:** when the browser says the app is installable, an **Install App** button appears. It disappears once the app is installed.
- Online or offline status is read from the browser and shown by the offline banner.

### The offline question pack

- `client/src/data/offlineQuestions.json` holds **8 categories with 10 questions each**. It is generated from the same seed data as the database (`server/utils/seed_data.py`), so players get the same questions offline as online.
- After changing `seed_data.py`, rebuild and commit the pack:

  ```bash
  cd server
  pipenv run python -m utils.export_offline_pack
  ```

  CI runs `python -m utils.export_offline_pack --check` and fails if the pack is out of date. The exporter refuses to write fewer than 8 categories or fewer than 10 questions per category.
- Each pack category has a `slug` (for example `african-geography`) that the front end uses as its ID. Open Trivia DB categories are numbers, so the two can never be confused.

### How the app behaves offline

| Situation | What happens |
|---|---|
| The browser is offline when the home page loads | The category tiles show the offline pack's categories, with their icons and colours |
| The internet drops while a request is in flight | The app falls back to the offline pack instead of showing an error |
| An offline category is chosen, or "Mixed" while offline | Questions come from the pack, and a notice says you are playing saved questions |
| An Open Trivia DB category number is requested while offline | The round plays mixed questions from the pack |
| Open Trivia DB answers with a problem (for example its rate limit) | The real error is shown with a Try again button. It is **not** treated as being offline |
| The saved login cannot be re-checked because the server is unreachable | The session is kept, so the installed app still opens and plays |
| The connection returns | The banner disappears, online questions are used again, and queued rounds are sent |

### The sync queue

A finished round cannot be saved to the database while offline, so:

1. The round is kept in `localStorage` (`trivia.syncQueue.v1`), oldest first, with at most the newest 50 rounds.
2. When the browser comes back online (and when the app starts), the queue sends each round to `POST /api/quiz-attempts` in the order it was played and removes it once the server has saved it. Two flushes never run at the same time, so a round is never sent twice.
3. If nobody is logged in, the rounds wait. If the server keeps refusing one round, it is dropped after 5 tries so it cannot block the others. Failures while offline are not counted as tries.
4. Synced rounds are ordinary `quiz_attempts` rows, so no database change was needed.

## Deployment

| Part | Host | Link |
|---|---|---|
| Front end (React PWA) | Vercel | <https://capstone-mod6-general-trivia-app.vercel.app/> |
| Back end (Flask API) | Render web service | <https://capstone-mod6-general-trivia-app-1.onrender.com> (health check: `/api/health`) |
| Database | Render PostgreSQL | internal to Render (not public) |

**How they are linked.** The front end only calls relative `/api/...` paths. `client/vercel.json` forwards `/api/*` from the Vercel URL to the Render service, sends all other paths to `index.html` so refreshing a React Router page does not 404, and disables caching for the service worker file. To the user, the whole app lives at the Vercel URL. Vercel serves the site over HTTPS, which browsers require for installing a PWA.

```json
{
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] }
  ],
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

The build command applies migrations on every deploy. The seed script and `create-admin` are not part of the build. To load the starter content and create the admin in the hosted database, run them once from your machine with the database's External URL:

```bash
cd server
export DATABASE_URL="<external URL>?sslmode=require"
export JWT_SECRET_KEY=x
export ADMIN_USERNAME=<name> ADMIN_EMAIL=<email> ADMIN_PASSWORD=<strong password>
pipenv run python -m utils.seed
pipenv run flask --app app create-admin
```

(Environment variables set in your terminal take priority over `server/.env`.)

**Updating the deployed app.** Merge into `main`. Vercel and Render both rebuild from it. If you add a Python package, regenerate the file Render installs from and commit it with the Pipfile:

```bash
cd server
pipenv install <package>
pipenv requirements > requirements.txt
```

**After a release,** open the health check URL, then the app, and run the [manual QA checklist](ManualQAChecklist.md) (desktop, mobile, logged-out, user and admin access, and the installed PWA).

**Free-tier notes.** A free Render web service sleeps after a period of inactivity, so the first request after a break is slow. Free Render PostgreSQL databases expire after 30 days.

## Error handling and validation

- **Open Trivia DB.** Every response includes a `response_code`; a non-zero code (no results, invalid parameters, rate limit and so on) is treated as a failure and shown with the shared `ErrorMessage` component and a retry button. HTTP 429 gets its own rate-limit message (the API allows roughly one request per 5 seconds per IP address). Network failures fall back to the offline pack. The server-side client in `services/external_api.py` applies the same checks and also handles timeouts, HTTP errors and invalid JSON.
- **Our API.** Every error is JSON (`{"error": "..."}`), including 404, 405 and all authentication failures. Category and question endpoints also return 415 when the body is not JSON, 403 for someone else's record and 409 for database conflicts. Failed saves are rolled back.
- **Front end.** Forms validate locally before sending anything (required fields, minimum password length, matching confirmation, question rules), and server errors are shown to the user. A 401 on a protected request clears the session and sends the user to the login page. Saving a finished round never interrupts the results page. Lists show loading, empty and error states, and admin actions show the server's message (for example when a safety rule blocks a change).

## Security

- Passwords are bcrypt hashes. Login gives the same response for an unknown email and a wrong password, so registered emails are not revealed.
- Tokens expire after one hour and are revoked on logout, with the revocation stored in the database.
- Role and account status are checked against the database on every protected request; a demoted or deactivated user loses access immediately, even with an old token.
- Sign-up ignores any requested role. `create-admin` never promotes an existing account.
- Record ownership comes from the token, never from the request body, so nobody can save a score or create a category as someone else.
- Secrets come from environment variables, never from the code. `.env` is ignored by Git.
- The leaderboard exposes usernames, points and counts only, never emails.

## Testing and CI

**Back end (pytest).** Test files live in `server/tests/`:

| File | Covers |
|---|---|
| `conftest.py` | Shared fixtures: test app, client, registered user, token and headers, plus user, admin, other-user and deactivated-user helpers |
| `test_auth.py` | Signup, login, logout and `/me` including every error case, roles in responses, login tracking, deactivated accounts, the access decorators and the `create-admin` command |
| `test_admin_routes.py` | Admin access control, statistics, user listing, filters, pagination, updates and deletion |
| `test_category_routes.py` | Category CRUD, validation, `?mine=true`, pagination and ownership (including admin access) |
| `test_question_routes.py` | Question CRUD, validation, filters, pagination, moving between categories and ownership |
| `test_models.py` | All model rules, relationships, cascades, the leaderboard query, roles, login tracking, icon and colour, and the token blocklist |
| `test_resource_routes.py` | Ownership and cascade rules at model level, including the database-enforced `CASCADE` and `SET NULL` rules |
| `test_quiz_attempt_routes.py` | Saving a round, history, pagination and the leaderboard, using real signup tokens |
| `test_logout_blocklist.py` | Logout is stored in the database and a logged-out token stays blocked after a server restart |
| `test_seed_data.py` | Seed content passes the model rules; 8 × 10 with unique icons and colours; seeding twice is safe |
| `test_api_endpoints.py` | The server-side Open Trivia DB client, with the network mocked |

**Front end (Vitest and React Testing Library).** Tests live in `client/src/tests/` and cover the quiz components and hooks, `AuthContext`, `LoginPage`, the route guards, navigation (side menu, avatar menu, 404 page, layout), the category tiles and icons, the welcome banner, the Dashboard page, the resource and question components and the question rules, `QuestionManager`, `ScoreContext` and `scoreApi`, the offline pack, the offline-aware hooks, and the sync queue.

**Continuous integration.** Every push and pull request into `development` or `main` runs `.github/workflows/ci.yml` (visible under the **Checks** tab of any pull request). Two jobs run in parallel:

| Job | Steps |
|---|---|
| `build-and-test` (front end, Node 22, in `client/`) | `npm ci`, lint, tests, production build |
| `backend-tests` (Python 3.14, in `server/`) | install `requirements.txt` plus pytest tools, run the full pytest suite, check the offline question pack is up to date |

The front-end job keeps the id `build-and-test` so any branch protection rule that requires it keeps working. No PostgreSQL service or secrets are needed in CI.

**Manual QA.** [`ManualQAChecklist.md`](ManualQAChecklist.md) records the manual pass over desktop and mobile layouts, logged-out, user and admin access, and the installed PWA (install, standalone mode, offline indicator, offline play, reconnecting, update prompt). Full user flows are verified manually; there are no end-to-end tests.

## Team workflow

- `main` is production: only stable, working code is merged here, and it deploys automatically.
- `development` is integration: all app work happens here.
- Nobody pushes directly to `main` or `development`. Every change goes through your own branch and a pull request.

```bash
git switch development
git pull origin development              # 1. start from the latest development
git switch -c feature/<area>-<short-name> # 2. create your own branch
git add .
git commit -m "feat: short description"  # 3. commit small changes often
git push -u origin feature/<area>-<short-name>
```

Then open a pull request into `development`, request a review from a teammate, merge once it is approved, and delete the finished branch. Before opening a pull request (and whenever `development` moves on), merge `development` into your branch and resolve any conflicts.

- **Commit prefixes:** `feat:` new feature, `fix:` bug fix, `docs:` documentation, `style:` styling, `test:` tests, `chore:` setup and tooling.
- **Only the owner edits a file.** To request a change in someone else's file, comment on their pull request or open a GitHub Issue. Tell the team before editing shared files such as `App.jsx`, `global.css` and `server/tests/conftest.py`.
- **Dependencies:** adding a back-end package means `pipenv install <package>` inside `server/` (`--dev` for test tools) and committing both `Pipfile` and `Pipfile.lock`; adding a front-end package means `npm install <package>` inside `client/` and committing both `package.json` and `package-lock.json`.

## Challenges along the way

**Phase 1**

- The Open Trivia DB API has no actual "mixed" category. It just means no category filter at all. The mixed/random option originally passed the literal string `"mixed"` through to the API, which returned nothing useful until it was fixed to omit the category parameter.
- With five people in one codebase, `App.jsx` and the shared stylesheet saw merge conflicts more than once, usually from two people touching the same area before syncing. They were resolved by comparing both versions and keeping whichever was more complete.
- The test suite briefly had a flaky issue where Vitest reported two otherwise-passing test files as failed ("No test found in suite"), traced to both files mocking the same API module.

**Phase 2**

- **Front end and back end disagreed on the contract.** The first review of the auth routes found different URLs (`/api/login` against `/api/auth/login`), different field names (`username` against `email` for login), and a signup response without a token. It was fixed by agreeing one API contract and updating the routes, the front end and the tests together.
- **Everything was built but nothing was connected.** After all roles were merged, the app still opened on the home page because `App.jsx` never mounted the auth provider or registered the new routes. Wiring them together was an unowned task that the team lead picked up.
- **Moving the React app into `client/` broke CI and the deployment.** The fixes were `working-directory: client` in the workflow and setting Vercel's Root Directory to `client`.
- **Small slips with big effects.** An empty `Pipfile` meant `pipenv install` installed nothing; a trailing comma in a model silently turned a column into a tuple and stopped the server starting; and compiled Python caches were committed before `.gitignore` had the right entry. Pull-request reviews caught all of them.
- **Logout had to become asynchronous.** Revoking the token on the server meant `logout()` waits for a request, which broke a test that expected an immediate result until the test waited for the update.
- **Hosted database URLs.** Hosts hand out `postgres://` URLs, which SQLAlchemy rejects, so `config.py` converts them to `postgresql+psycopg2://`.
- **The Dashboard started as a shell** built against local state while the endpoints were in progress. Connecting it needed a `?mine=true` filter on `GET /api/categories`.
- **A lint rule objected to loading data in an effect.** The Dashboard and the hooks now start their first load with a request chain that only updates state after the response arrives (and ignores late responses after the page is closed).

**Phase 3**

- **Logout did not survive a restart.** The Phase 2 blocklist lived in server memory, so a redeploy (or Render waking from sleep) let logged-out tokens work again. It now lives in the `token_blocklist` table, with a test that proves it using a fresh process.
- **New required columns on a table that already had rows.** The hosted database already had users, so `role`, `is_active` and `login_count` needed database defaults (`server_default`) or the migration would fail. Autogenerate also missed the new CHECK constraints, so they were added to the migration by hand.
- **Never trusting the token for roles.** Admin and deactivation checks read the database on every request, so demoting or deactivating someone takes effect at once. The front end re-checks a saved session with `/auth/me` before the admin page appears, so a stale "admin" is never shown, even briefly.
- **Telling "offline" apart from "the API said no".** A real offline failure must fall back to the question pack, but an Open Trivia DB rate limit must still show its error. Network failures (a rejected `fetch` or `navigator.onLine` being false) are the only trigger for the offline fallback.
- **Offline questions drifting from online ones.** The offline pack is generated from the seed data and CI fails if it is stale, so the two can't silently diverge.
- **Two flushes sending the same round.** The sync queue shares one in-progress flush, and a round is only removed once the server confirms the save. Rounds that keep failing are dropped after 5 tries so they cannot block the rest.
- **Service worker surprises.** The worker is disabled in development, `sw.js` is never cached, and updates wait for the user's approval so a quiz is never reloaded mid-round. API calls are excluded from the navigation fallback so they can never receive the app's HTML by mistake.

## Current limitations

- **Custom categories and questions are not playable in the quiz yet.** Categories and questions created on the Dashboard are stored, edited and moderated, but the quiz plays Open Trivia DB questions online and the bundled pack offline.
- Any signed-in user can read every category and question; only creating, editing and deleting are limited to the owner (and admins).
- The server-side Open Trivia DB client (`services/external_api.py`) is tested but not exposed through an endpoint.
- The offline pack has 8 categories × 10 questions, far fewer than the full Open Trivia DB. While offline, every Open Trivia DB category falls back to a mixed round from the pack.
- Open Trivia DB categories are not rows in our database, so a finished round is saved as a Mixed round, and the leaderboard ranks total points across all rounds.
- The Admin portal manages users and questions. Categories are available through the admin API but do not have their own tab.
- There are no end-to-end tests. Full user flows were verified manually (see the QA checklist).
- Narrower Open Trivia DB categories can occasionally return fewer questions than requested; the app plays the round with whatever comes back. Refreshing mid-quiz restarts the round, and switching categories quickly can hit the Open Trivia DB rate limit ("Try again" fixes it).
- A round whose save keeps failing is dropped from the sync queue after 5 attempts, and the queue holds at most the newest 50 rounds.
- On the free hosting tier the API can be slow on the first request after inactivity, and the free Render database expires after 30 days.

## Troubleshooting

| Problem | Fix |
|---|---|
| `connection refused` to PostgreSQL | The database is not running. WSL2: `sudo service postgresql start` |
| `password authentication failed` | The password in `server/.env` must match the one used in `CREATE USER` |
| `ArgumentError: Could not parse SQLAlchemy URL` or `Either SQLALCHEMY_DATABASE_URI ... needs to be set` | `server/.env` is missing or `DATABASE_URL` is empty. Run `cp .env.example .env` inside `server/` and fill it in |
| `database "trivia_user" does not exist` | The `DATABASE_URL` is missing `/trivia_dev` at the end |
| `ModuleNotFoundError: No module named 'flask'` | Dependencies are not installed. Run `pipenv install --dev` inside `server/` and start Flask with `pipenv run` |
| `ModuleNotFoundError: No module named 'models'` (or `app`, `config`) | Run back-end commands from inside `server/`, using `pipenv run` |
| `ModuleNotFoundError: No module named 'psycopg'` | Your `DATABASE_URL` uses a driver SQLAlchemy cannot find. Use `postgresql+psycopg2://` |
| `relation "categories" does not exist` or API returns 500 right after setup | The tables are missing. Run `pipenv run flask db upgrade` |
| `column users.role does not exist` or `relation "token_blocklist" does not exist` | Your database is still on Phase 2. Run `pipenv run flask db upgrade` |
| `Can't locate revision identified by ...` | Your database is on a migration your branch doesn't have. Pull the latest `development`, then run `flask db upgrade` |
| `create-admin` fails with "That email already belongs to a regular user" | Someone signed up with that email first. Use a different `ADMIN_EMAIL`; existing accounts are never promoted |
| `/admin` sends you to `/home` | The account is not an admin (the role is read from the server on every load). Create an admin with `flask create-admin` |
| "Account is deactivated" when logging in | An admin deactivated the account; another admin can turn it back on |
| `offlineQuestions.json is out of date` | `seed_data.py` changed. Run `pipenv run python -m utils.export_offline_pack` and commit the JSON |
| Old version of the app keeps showing | A cached service worker. Choose **Update now** in the prompt, or in DevTools go to Application, then Service Workers, then Unregister, and hard-refresh. The service worker is off in `npm run dev` |
| The Install App button never appears | The browser only offers installing over HTTPS (or `localhost`) from a production build, and not when the app is already installed |
| `apt update` ends with `No module named 'apt_pkg'` | The package lists still refreshed; only a command-not-found hook failed. Run the `apt install` line on its own, and make sure `/usr/bin/python3` is the Ubuntu system Python (`sudo update-alternatives --config python3`) |
| `pg_config executable not found` while installing | `sudo apt install libpq-dev`, then run `pipenv install --dev` again |
| `Creating a Pipfile for this project...` | You ran pipenv outside `server/`. Press Ctrl+C, `cd server`, and run it again |
| `Address already in use` on port 5555 | Another Flask process is running; stop it, or pick another port and update the proxy in `client/vite.config.js` |
| Front end shows network errors on `/api/...` | Flask is not running, or it is not on port 5555 |
| pgAdmin connection times out | Use host `127.0.0.1`, not `localhost` (WSL only forwards IPv4). If it still times out, run `wsl --shutdown` in PowerShell and reopen Ubuntu |
| Live app is slow or shows network errors on first load | The free Render service is waking up. Open `/api/health` on the Render URL, wait for `{"status": "ok"}`, then reload |

## Contributors

| Contributor | Phase 1 role | Phase 2 role | Phase 3 role |
|---|---|---|---|
| [Eddie Njeru](https://github.com/Eddie-Njeru1) | Team Lead: Repo, Git Workflow, Docs & Deployment | Team Lead, Auth Architect & Documentation Lead | Team Lead, Access Control & Release Manager |
| [Austin Atogo](https://github.com/austinatogo1) | Quiz Logic & State Engineer | Database & Data Modeling Specialist | Database Evolution, PWA & Offline Engineer |
| [Emmanuel Cheruiyot](https://github.com/emmanuelcheruiyot4-oss) | API & Data Engineer | API Endpoints & Serialization Specialist | Admin API, Data Services & Route Testing Engineer |
| [Gloria Chebet](https://github.com/Gloria-Chebet1) | Routing & Views Engineer | Frontend Auth & Client State Developer | App Shell, Navigation & Route Access Developer |
| [Sandra Keeru](https://github.com/keerusandra) | UI/UX, QA | Frontend UI & QA Lead | Landing, Welcome & Category Experience Lead (UI/UX & QA Lead) |

### Responsibilities by phase

**Phase 1**

| Role | Responsibility | Contributor |
|---|---|---|
| Team Lead: Repo, Git Workflow, Docs & Deployment | Repo, Git workflow, Vite scaffold, CI/CD pipeline, root app layout, deployment, README and final integration | [Eddie Njeru](https://github.com/Eddie-Njeru1) |
| API & Data Engineer | Open Trivia DB fetch layer, data hooks, HTML decoding, response codes and rate-limit handling, Postman testing | [Emmanuel Cheruiyot](https://github.com/emmanuelcheruiyot4-oss) |
| Quiz Logic & State Engineer | Quiz flow, scoring, points and streaks, shared score context, question card and end-of-round logic | [Austin Atogo](https://github.com/austinatogo1) |
| Routing & Views Engineer | React Router, app shell and navigation, Home, Category Select, Results and Scoreboard pages | [Gloria Chebet](https://github.com/Gloria-Chebet1) |
| UI/UX, QA | Styling system, responsive layout, accessibility basics, loading, error and empty states, component tests | [Sandra Keeru](https://github.com/keerusandra) |

**Phase 2**

| Role | Responsibility | Contributor |
|---|---|---|
| Team Lead, Auth Architect & Documentation Lead | Full-stack architecture and Flask server configuration, password security (Flask-Bcrypt), JWT authentication (Flask-JWT-Extended), connecting authentication to the front end, deployment to Vercel and Render, and the full-stack README | [Eddie Njeru](https://github.com/Eddie-Njeru1) |
| API Endpoints & Serialization Specialist (Backend) | Custom RESTful category and question endpoints, Marshmallow schemas, server-side pagination, record ownership checks, and the server-side trivia API client | [Emmanuel Cheruiyot](https://github.com/emmanuelcheruiyot4-oss) |
| Database & Data Modeling Specialist (Backend) | Relational models for users, categories, questions and quiz attempts, foreign keys, constraints and validation rules, seed data and migrations | [Austin Atogo](https://github.com/austinatogo1) |
| Frontend Auth & Client State Developer | Authentication context and route guards, Axios client that attaches the JWT and handles expired sessions, Login and Signup pages | [Gloria Chebet](https://github.com/Gloria-Chebet1) |
| Frontend UI & QA Lead | The Dashboard interface (paginated list, form and detail views, loading and error feedback) and the front-end component tests | [Sandra Keeru](https://github.com/keerusandra) |

**Phase 3**

| Role | Responsibility | Contributor |
|---|---|---|
| Team Lead, Access Control & Release Manager | Roles and account status (admin and active-user guards, deactivation, login tracking), the `create-admin` command, session validation with `/auth/me`, the admin route guard, CI pipeline for front end and back end, deployment and release, and the final README | [Eddie Njeru](https://github.com/Eddie-Njeru1) |
| Database Evolution, PWA & Offline Engineer | Phase 3 migration (roles, login tracking, category icon and colour, token blocklist), database-backed logout, the 8 × 10 seed data, the offline question pack and its exporter, the offline-aware hooks and sync queue, PWA setup (manifest, service worker, icons, install, offline and update UI), and the database guide | [Austin Atogo](https://github.com/austinatogo1) |
| Admin API, Data Services & Route Testing Engineer | Admin API (statistics, users, categories, questions) and its schemas, the front-end admin and leaderboard data layer (`adminApi`, `useAdminData`, `useLeaderboard`), and the route tests for categories, questions and the admin API | [Emmanuel Cheruiyot](https://github.com/emmanuelcheruiyot4-oss) |
| App Shell, Navigation & Route Access Developer | App layout, side menu, avatar menu, 404 page, public and protected routing, the landing route, the Admin portal (Overview, Users and Questions tabs), and the Scoreboard leaderboard section | [Gloria Chebet](https://github.com/Gloria-Chebet1) |
| Landing, Welcome & Category Experience Lead (UI/UX & QA Lead) | Landing page (hero, feature strip, try-it question), welcome banner, category grid and tiles with pagination, icons and colours, global styling and responsive polish, and manual and automated QA | [Sandra Keeru](https://github.com/keerusandra) |