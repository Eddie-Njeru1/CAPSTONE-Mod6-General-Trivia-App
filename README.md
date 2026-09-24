# General Trivia App

A fast, distraction-free trivia app built with React. Pick a category (or a mixed set), answer multiple-choice or true/false questions, get instant feedback, and earn points. Questions come from the [Open Trivia Database API](https://opentdb.com/api_config.php).

## Contributors

| Role | Responsibility | Contributor | Suggested branch |
|---|---|---|---|
| 1. Team Lead | Repo, Git workflow, README, deployment, final integration | [Eddie](https://github.com/username) | `docs/readme` |
| 2. API & Data Engineer | Open Trivia DB fetch layer, data hooks, loading/error states | [Emmanuel](https://github.com/username) | `feature/api-hooks` |
| 3. Quiz Logic & State Engineer | Quiz flow, scoring, answer feedback, ScoreContext | [Austin](https://github.com/username) | `feature/quiz-logic` |
| 4. Routing & Views Engineer | Routes, page components, navigation | [Gloria](https://github.com/username) | `feature/routing-pages` |
| 5. UI/UX, QA & Presentation Lead | Styling, responsive layout, testing, slides and video | [Sandra](https://github.com/username) | `feature/styling` |

## Getting started

### 1. Join the repository
The Team Lead adds you as a collaborator. Accept the invitation from the email GitHub sends you, or at https://github.com/notifications. Because you are a collaborator, you clone the repo directly (no fork needed).

### 2. Prerequisites
- [Node.js](https://nodejs.org/) (LTS version) and npm
- [Git](https://git-scm.com/)

### 3. Set your Git identity
Use the same email as your GitHub account so your commits are credited to you.

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

### 4. Clone, install and run

```bash
# clone the repo
git clone https://github.com/<your-username>/CAPSTONE-Mod6-General-Trivia-App.git
cd CAPSTONE-Mod6-General-Trivia-App

# switch to the development branch (this is where we work)
git switch development

# install dependencies
npm install

# start the app
npm run dev
```

Open the local URL shown in the terminal (usually http://localhost:5173).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run lint` | Check the code with ESLint |

## How we work

- `main`: production. Only stable, working code is merged here.
- `development`: integration. All app work happens here.
- Nobody pushes directly to `main` or `development`. Every change goes through your own branch and a Pull Request.

### Making a contribution

```bash
# 1. start from the latest development
git switch development
git pull origin development

# 2. create your own branch (see the Contributors table for suggested names)
git switch -c feature/<short-name>

# 3. commit small changes often
git add .
git commit -m "feat: short description"

# 4. push your branch
git push -u origin feature/<short-name>
```

5. On GitHub, open a Pull Request from your branch into `development`.
6. Request a review from a teammate. Merge once it is approved.
7. Sync your local copy and delete your finished branch:

```bash
git switch development
git pull origin development
git branch -d feature/<short-name>
```

### Keeping your branch up to date
Do this before opening a PR, and whenever `development` has moved on:

```bash
git switch development
git pull origin development
git switch feature/<short-name>
git merge development   # resolve any conflicts, then commit
```

### Commit prefixes
`feat:` new feature, `fix:` bug fix, `docs:` documentation, `style:` styling, `test:` tests, `chore:` setup and tooling.

### Avoiding conflicts
Stay within your own role's files where you can. Tell the team before editing a file another role owns, especially `App.jsx` and shared styles.

## Project structure

```
src/
├── api/          # Open Trivia DB fetch functions
├── hooks/        # data hooks (useCategories, useQuestions)
├── context/      # ScoreContext (app-wide points)
├── components/   # reusable UI components
├── pages/        # HomePage, QuizPage, ResultsPage, ScoreboardPage
├── styles/       # global styles
└── tests/        # tests
```

## Tech stack

React, Vite, React Router, Open Trivia Database API