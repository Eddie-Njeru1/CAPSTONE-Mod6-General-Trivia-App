# General Trivia App

A React frontend Trivia Quiz application that fetches trivia questions from the Open Trivia Database and turns them into a playable quiz. Pick a category or go mixed, answer multiple-choice or true/false questions, get instant feedback, and build up points with a streak bonus for consecutive correct answers.

## Features

- Dynamic fetch of categories and questions from the Open Trivia Database API
- Category selection, including a "Mixed / Random" option that pulls from every category
- Multiple-choice and true/false question types, handled the same way through one shared component
- Instant answer feedback: correct answers highlight green, wrong picks highlight red, and the right answer is always revealed
- Points that scale with question difficulty, plus a multiplier for answer streaks
- Round history and running score, persisted to local storage
- Loading and error states on every API call, with a retry option on failure
- Automated test suite (Vitest + React Testing Library) and a GitHub Actions CI pipeline that lints, tests, and builds on every push and pull request

## Project Structure

```
CAPSTONE-Mod6-General-Trivia-App/
├── src/
│   ├── api/            # triviaApi.js — fetch functions for the Open Trivia DB
│   ├── components/     # reusable UI: QuestionCard, AnswerOption, CategoryCard, NavBar, Loader, ErrorMessage, Feedback
│   ├── context/         # ScoreContext, useScore — app-wide score, points, streaks, round history
│   ├── hooks/           # useCategories, useQuestions — data-fetching hooks
│   ├── pages/            # HomePage, QuizPage, ResultsPage, ScoreboardPage
│   ├── styles/           # global.css
│   ├── tests/            # Vitest test suite
│   ├── utils/            # quizHelpers.js — scoring, shuffling, answer building
│   ├── App.jsx           # routes and top-level layout
│   └── main.jsx          # app entry point
├── .github/
│   └── workflows/        # ci.yml — lint, test, and build on every push/PR
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## State Model

The app has no database. Aall state lives in React, with one piece persisted to the browser. `ScoreContext` (in `src/context/`) tracks:

- `score` — correct answers in the current round
- `points` — reward points for the current round, weighted by question difficulty
- `totalQuestions` — the size of the current round
- `history` — an array of past rounds (`{ category, score, total, points }`), capped at the 20 most recent and saved to `localStorage` so it survives a page refresh

Any component can read or update this through the `useScore()` hook rather than passing score data down through props.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version) and npm
- [Git](https://git-scm.com/)

## Installation and Dependencies

Clone the repository and install dependencies:

```bash
git clone https://github.com/Eddie-Njeru1/CAPSTONE-Mod6-General-Trivia-App.git
cd CAPSTONE-Mod6-General-Trivia-App
git switch development
npm install
```

`package.json` lists the project's dependencies, while `package-lock.json` locks exact versions so every machine installs the same thing.

- `react` / `react-dom` — the UI library and its DOM renderer
- `react-router-dom` — client-side routing between the home, quiz, results, and scoreboard pages
- `vite` — dev server and build tool
- `vitest` — test runner
- `@testing-library/react` — renders components and hooks for testing
- `@testing-library/jest-dom` — adds custom matchers (`toBeInTheDocument`, etc.) for test assertions
- `jsdom` — simulates a browser environment so component tests can run in Node
- `eslint` — lints the codebase

No `.env` file or API key is needed. The Open Trivia Database is free and unauthenticated.

## Running the Application

Start the dev server:

```bash
npm run dev
```

The app runs at http://localhost:5173.

A live deployed version is also available at: <https://capstone-mod6-general-trivia-app.vercel.app/>

(Hosted on Vercel, deploying automatically from the `main` branch.)

## API Used

Questions and categories come from the [Open Trivia Database](https://opentdb.com/api_config.php) — free, public, and keyless.

**Get categories**
```bash
curl https://opentdb.com/api_category.php
```

**Get questions**
```bash
curl "https://opentdb.com/api.php?amount=10&category=9"
```
Omitting `category` entirely returns a mixed set across all topics — that's what the "Mixed / Random" option on the home page does. `amount` controls how many questions come back per round.

The API enforces a rate limit of roughly one request per 5 seconds per IP address.

## Error Handling

- Every API response includes a `response_code`; a non-zero code (empty results, invalid parameters, rate limit, etc.) is treated as a failure and surfaces the shared `ErrorMessage` component with a retry button, rather than silently rendering nothing.
- Network failures (the request itself failing) are caught the same way.
- There's no free-text user input in this app — the only input is selecting a category or an answer button — so there's no form validation to handle beyond what's already constrained by the UI itself.

## Testing

```bash
npm test         # run the suite once
npx vitest       # watch mode while developing
```

Tests live in `src/tests/` and cover the components and hooks most worth testing automatically: `AnswerOption`, `QuestionCard`, `useCategories`, and `useQuestions` (with the API mocked, so tests run offline and don't touch Open Trivia DB's rate limit).

Every push and pull request into `development` or `main` also runs through a GitHub Actions workflow (`.github/workflows/ci.yml`) that installs dependencies, lints, tests, and builds the project — visible under the **Checks** tab on any PR or the repo's **Actions** tab.

## Challenges Along the Way

- The Open Trivia DB API has no actual "mixed" category — it just means no category filter at all. The mixed/random option originally passed the literal string `"mixed"` through to the API, which returned nothing useful until this was caught and fixed to omit the category parameter instead.
- With five people working in the same codebase, `App.jsx` and the shared stylesheet both saw merge conflicts more than once, usually from two people touching the same area before syncing — resolved by comparing both versions and keeping whichever was more complete.
- The test suite briefly had a flaky issue where Vitest reported two otherwise-passing test files as failed ("No test found in suite"), traced to both files mocking the same API module. All individual tests were passing the whole time; this was investigated and resolved before submission.

## Current Limitations

- Scores and round history are stored in the browser's local storage rather than a backend, so they're tied to one device and don't follow a user anywhere. A real backend and user accounts are introduced in Phase 2 and 3 of the capstone.
- Narrower categories can occasionally return fewer questions than requested; the app plays the round with whatever comes back rather than padding it out.
- No end-to-end tests are included. The automated suite covers key components and hooks, with full user flows verified manually.

## Contributors

| Role | Responsibility | Contributor |
|---|---|---|
| Team Lead | Repo, Git workflow, vitest CI/CD, README, deployment | [Eddie Njeru](https://github.com/Eddie-Njeru1) |
| API & Data | Open Trivia DB integration, data hooks | [Emmanuel Cheruiyot](https://github.com/emmanuelcheruiyot4-oss) |
| Quiz Logic & State | Quiz flow, scoring, streaks | [Austin Atogo](https://github.com/austinatogo1) |
| Routing & Views | Pages and navigation | [Gloria Chebet](https://github.com/Gloria-Chebet1) |
| UI/UX & QA | Styling | [Sandra Keeru](https://github.com/keerusandra) |
