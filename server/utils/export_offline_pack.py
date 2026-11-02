# Exports the database seed questions to client/src/data/offlineQuestions.json so the frontend can use them when offline.
# Run from the server/ folder:
#  pipenv run python -m utils.export_offline_pack
#  pipenv run python -m utils.export_offline_pack --check

import json # Converts the question pack to JSON and checks the generated output
import re # Converts category names into URL-friendly slugs
import sys # Handles command-line arguments and exit codes
from pathlib import Path   # Builds the output file path
from utils.seed_data import SEED_CATEGORIES  # Source categories and questions for the offline pack

# Minimum content required
MIN_CATEGORIES = 8
MIN_QUESTIONS = 10

# Output path relative to this file, from server/utils/ to the repo root.
OUTPUT_PATH = (
    Path(__file__).resolve().parents[2]
    / "client"
    / "src"
    / "data"
    / "offlineQuestions.json"
)

def slugify(name):
    # Convert a category name into a stable key for offline use.
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def build_pack():
    # Build the offline question pack and validate its contents.
    if len(SEED_CATEGORIES) < MIN_CATEGORIES:
        raise ValueError(
            f"The pack needs at least {MIN_CATEGORIES} categories, "
            f"found {len(SEED_CATEGORIES)}."
        )

    categories = []

    for data in SEED_CATEGORIES:
        if len(data["questions"]) < MIN_QUESTIONS:
            raise ValueError(
                f"'{data['name']}' needs at least {MIN_QUESTIONS} "
                f"questions, found {len(data['questions'])}."
            )

        categories.append({
            "slug": slugify(data["name"]),
            "name": data["name"],
            "description": data["description"],
            "icon": data["icon"],
            "color": data["color"],
            "questions": [
                {
                    # Keep question fields consistent with the backend API.
                    "text": q["text"],
                    "question_type": q["question_type"],
                    "difficulty": q["difficulty"],
                    "correct_answer": q["correct_answer"],
                    "incorrect_answers": list(q["incorrect_answers"]),
                }
                for q in data["questions"]
            ],
        })

    # Prevent categories with identical slugs from overwriting each other.
    slugs = [category["slug"] for category in categories]

    if len(slugs) != len(set(slugs)):
        raise ValueError("Two categories produce the same slug.")

    return {"categories": categories}

def render_pack(pack):
    # Convert the pack to consistent JSON for clean Git diffs.
    return json.dumps(pack, indent=2, ensure_ascii=False) + "\n"

def main(args):
    # Write the offline pack or check whether it needs updating.
    text = render_pack(build_pack())

    if "--check" in args:
        current = (
            OUTPUT_PATH.read_text(encoding="utf-8")
            if OUTPUT_PATH.exists()
            else ""
        )

        if current != text:
            print(
                "offlineQuestions.json is out of date. "
                "Run: pipenv run python -m utils.export_offline_pack"
            )
            return 1

        print("offlineQuestions.json is up to date.")
        return 0

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(text, encoding="utf-8", newline="\n")

    pack = json.loads(text)
    total = sum(len(category["questions"]) for category in pack["categories"])

    print(
        f"Wrote {len(pack['categories'])} categories and "
        f"{total} questions to {OUTPUT_PATH}"
    )
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
