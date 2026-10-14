# Starter content for the database: categories and their questions.
# seed.py loads this into PostgreSQL. Keeping the data separate from the
# loading code means the content can be reviewed (and tested) on its own.


def mc(difficulty, text, correct, wrong):
    """A multiple-choice question: one correct answer, three wrong ones."""
    return {
        "text": text,
        "question_type": "multiple",
        "difficulty": difficulty,
        "correct_answer": correct,
        "incorrect_answers": wrong,
    }


def tf(difficulty, text, answer):
    """A true/false question. The wrong answer is always the opposite."""
    correct = "True" if answer else "False"
    return {
        "text": text,
        "question_type": "boolean",
        "difficulty": difficulty,
        "correct_answer": correct,
        "incorrect_answers": ["False" if answer else "True"],
    }


SEED_CATEGORIES = [
    {
        "name": "Kenyan History & Culture",
        "description": "Independence, leaders and milestones that shaped Kenya.",
        "questions": [
            mc("easy", "In which year did Kenya gain independence?",
               "1963", ["1960", "1964", "1957"]),
            tf("easy", "Kiswahili is one of Kenya's official languages.", True),
            mc("medium", "Who was Kenya's first President?",
               "Jomo Kenyatta", ["Daniel arap Moi", "Mwai Kibaki", "Tom Mboya"]),
            mc("medium", "Which Kenyan won the Nobel Peace Prize in 2004?",
               "Wangari Maathai", ["Grace Ogot", "Margaret Ogola", "Ngũgĩ wa Thiong'o"]),
            mc("hard", "In which year was Kenya's current constitution promulgated?",
               "2010", ["2002", "2007", "2013"]),
        ],
    },
    {
        "name": "African Geography",
        "description": "Capitals, lakes, mountains and countries across Africa.",
        "questions": [
            mc("easy", "What is the capital city of Kenya?",
               "Nairobi", ["Mombasa", "Kisumu", "Nakuru"]),
            tf("easy", "Mount Kilimanjaro is located in Kenya.", False),
            mc("medium", "Which is the largest lake in Africa by area?",
               "Lake Victoria", ["Lake Tanganyika", "Lake Malawi", "Lake Turkana"]),
            mc("medium", "What is the highest mountain in Kenya?",
               "Mount Kenya", ["Mount Elgon", "Mount Longonot", "Mount Kilimanjaro"]),
            mc("hard", "Which country has the largest land area in Africa?",
               "Algeria", ["Democratic Republic of the Congo", "Sudan", "Libya"]),
        ],
    },
    {
        "name": "Science & Nature",
        "description": "Everyday science, the human body and the natural world.",
        "questions": [
            mc("easy", "Which gas do plants absorb from the air for photosynthesis?",
               "Carbon dioxide", ["Oxygen", "Nitrogen", "Hydrogen"]),
            tf("easy", "At sea level, water boils at 100 °C.", True),
            mc("medium", "What is the chemical symbol for gold?",
               "Au", ["Ag", "Gd", "Go"]),
            mc("medium", "Which planet is known as the Red Planet?",
               "Mars", ["Jupiter", "Venus", "Mercury"]),
            mc("hard", "What is the most abundant gas in Earth's atmosphere?",
               "Nitrogen", ["Oxygen", "Argon", "Carbon dioxide"]),
        ],
    },
    {
        "name": "Sports",
        "description": "Football, rugby and Kenya's world-famous runners.",
        "questions": [
            mc("easy", "How many players does a football team have on the pitch at once?",
               "11", ["9", "10", "12"]),
            tf("easy", "Eliud Kipchoge is a Kenyan marathon runner.", True),
            mc("medium", "In which year did Eliud Kipchoge run the first marathon distance in under two hours?",
               "2019", ["2017", "2018", "2021"]),
            mc("medium", "How many players does a rugby union team have on the field at once?",
               "15", ["13", "11", "7"]),
            mc("hard", "Which Kenyan won the men's 800 m gold at the 2012 London Olympics, setting a world record?",
               "David Rudisha", ["Wilson Kipketer", "Paul Tergat", "Ezekiel Kemboi"]),
        ],
    },
    {
        "name": "Technology & Computing",
        "description": "Computers, the web and Kenyan tech innovation.",
        "questions": [
            mc("easy", "What does CPU stand for?",
               "Central Processing Unit",
               ["Central Program Utility", "Computer Personal Unit", "Core Processing Utility"]),
            tf("easy", "M-Pesa was launched in Kenya in 2007.", True),
            mc("medium", "Which company launched M-Pesa?",
               "Safaricom", ["Airtel", "Telkom Kenya", "Equity Bank"]),
            mc("medium", "What does HTTP stand for?",
               "HyperText Transfer Protocol",
               ["HighText Transfer Protocol", "HyperText Transmission Process",
                "Hyperlink Transfer Protocol"]),
            mc("hard", "What is the decimal number 10 written in binary?",
               "1010", ["1001", "1100", "1110"]),
        ],
    },
    {
        "name": "General Knowledge",
        "description": "A little bit of everything.",
        "questions": [
            mc("easy", "How many days are there in a leap year?",
               "366", ["365", "364", "367"]),
            tf("easy", "The Kenyan shilling is Kenya's official currency.", True),
            mc("medium", "Which ocean borders Kenya's coast?",
               "Indian Ocean", ["Atlantic Ocean", "Pacific Ocean", "Arctic Ocean"]),
            tf("medium", "The Great Wall of China is visible from the Moon with the naked eye.", False),
            mc("hard", "How many bones are there in the adult human body?",
               "206", ["201", "212", "196"]),
        ],
    },
]