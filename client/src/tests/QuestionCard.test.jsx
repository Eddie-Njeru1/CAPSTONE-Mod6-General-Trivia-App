// This tests the QuestionCard component to ensure it correctly displays question info, answer options, selection feedback and disables states.

import { describe, it, expect, vi } from "vitest"; // for vitest functions to organise and run tests
import { render, screen, fireEvent } from "@testing-library/react"; // for tools for testing React hooks and waiting for async updates
import QuestionCard from "../components/QuestionCard";

const sampleQuestion = { // provides sample question data used across the test
    question: "What is the capital of France?",
    correctAnswer: "Paris",
    category: "Geography",
    difficulty: "easy",
};

const sampleOptions = ["Paris", "London", "Rome", "Berlin"]; // provides answer options displayed by the question card

describe("QuestionCard", () => { //Group the tests that verify the QuestionCard component
    it("renders the question text, category, and difficulty", () => {// checks that the question text, category and difficult are displayed
        render(
            <QuestionCard
                question={sampleQuestion}
                options={sampleOptions}
                selectedAnswer={null}
                onSelect={() => {}}
                questionNumber={1}
                totalQuestions={10}
            />
        );
        expect(
            screen.getByText("What is the capital of France?")
        ).toBeInTheDocument(); // confirms the question is displayed
        expect(screen.getByText("Geography · easy")).toBeInTheDocument(); // confirm category and difficulty are displayed 
    });

    it("shows the current question number and total", () => { // checks thee current question number and total are displayed 
        render(
            <QuestionCard
                question={sampleQuestion}
                options={sampleOptions}
                selectedAnswer={null}
                onSelect={() => {}}
                questionNumber={3}
                totalQuestions={10}
            />
        );
        expect(screen.getByText("Question 3 of 10")).toBeInTheDocument(); // confirm question progress is displayed 
    });

    it("renders one answer button per option", () => { // checks each answer option is rendered as a button
        render(
            <QuestionCard
                question={sampleQuestion}
                options={sampleOptions}
                selectedAnswer={null}
                onSelect={() => {}}
                questionNumber={1}
                totalQuestions={10}
            />
        );
        sampleOptions.forEach((option) => {
            expect(screen.getByText(option)).toBeInTheDocument(); // confirm each option is displayed 
        });    
    });

    it("calls onSelect with the clicked option before an answer is chosen", () => { // checks that selecting answer calls onSelect with the chosen option
        const handleSelect = vi.fn(); // creates a mock function to track the selection
        render(
            <QuestionCard
                question={sampleQuestion}
                options={sampleOptions}
                selectedAnswer={null}
                onSelect={handleSelect}
                questionNumber={1}
                totalQuestions={10}
            />
        );
        fireEvent.click(screen.getByText("Paris")); // simulates clicking the Paris option
        expect(handleSelect).toHaveBeenCalledWith("Paris"); // confirms selected answer was passed to onSelect 
    });

    it("marks the correct answer and the user's wrong pick once answered", () => { // checks that the correct answer and wrong selection receive the correct states
        render(
            <QuestionCard
                question={sampleQuestion}
                options={sampleOptions}
                selectedAnswer="London"
                onSelect={() => {}}
                questionNumber={1}
                totalQuestions={10}
            />
        );
        const parisButton = screen.getByText("Paris").closest("button"); // finds correct answer button
        const londonButton = screen.getByText("London").closest("button"); // finds selected wrong answer 
        const romeButton = screen.getByText("Rome").closest("button"); // finds unanswered option

        expect(parisButton.className).toContain("answer-option--correct"); // confirms correct answer is marked 
        expect(londonButton.className).toContain("answer-option--wrong"); // confirms wrong selection is marked 
        expect(romeButton.className).toContain("answer-option--neutral"); // confirms other options remain neutral
    });

    it("disables every answer button once a selection has been made", () => { // checks all answer buttons are disabled after an answer is selected
        render(
            <QuestionCard
                question={sampleQuestion}
                options={sampleOptions}
                selectedAnswer="London"
                onSelect={() => {}}
                questionNumber={1}
                totalQuestions={10}
            />
        );
        sampleOptions.forEach((option) => {
            expect(screen.getByText(option).closest("button")).toBeDisabled(); // confirms each option is disabled
        });     
    });
});