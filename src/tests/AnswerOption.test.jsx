// This tests the AnswerOption component to make sure it displays correctly and responds to user interactions

import { describe, it, expect, vi } from "vitest"; // for vitest functions to organise and run tests
import { render, screen, fireEvent } from "@testing-library/react";
import AnswerOption from "../components/AnswerOption";

// Group all tests for the AnswerOption component behaviour
describe("AnswerOption", () => { 
    it("renders the answer text", () => { // checks that the answer text displays correctly
        render(<AnswerOption text="Paris" onSelect={() => {}} />);
        expect(screen.getByText("Paris")).toBeInTheDocument();
    });

    it("calls onSelect with its text when clicked", () => { // checks that clicking the answer calls onSelect with text
        const handleSelect = vi.fn();
        render(<AnswerOption text="Paris" onSelect={handleSelect} />);
        fireEvent.click(screen.getByText("Paris"));
        expect(handleSelect).toHaveBeenCalledWith("Paris");
    });

    it("is disabled and does not call onSelect when disabled is true", () => { //checks that a disabled answer can't be selected
        const handleSelect = vi.fn();
        render(
            <AnswerOption text="Paris" onSelect={handleSelect} disabled={true} />
        );
        const button = screen.getByText("Paris").closest("button"); // finds answer button
        expect(button).toBeDisabled(); // verify button is disabled

        fireEvent.click(button); //attempts to click the disabled button
        expect(handleSelect).not.toHaveBeenCalled(); // ensures onSelect wasn't triggered
    });

    it("shows a checkmark when status is correct", () => { // checks that a correct answer displays a checkmark
        render(<AnswerOption text="Paris" status="correct" onSelect={() => {}} />);
        expect(screen.getByText("✓")).toBeInTheDocument(); //verifies the checkmark is displayed
    });

    it("shows an X when status is wrong", () => { // checks that a wrong answer displays an X
        render(<AnswerOption text="Paris" status="wrong" onSelect={() => {}} />);
        expect(screen.getByText("✗")).toBeInTheDocument(); // verifies X is displayed
    });

    it("shows no icon when status is idle or neutral", () => { // check that feedback icon isn't displayed for idle answers
        render(<AnswerOption text="Paris" status="idle" onSelect={() => {}} />);
        expect(screen.queryByText("✓")).not.toBeInTheDocument(); // confirm no checkmark is shown
        expect(screen.queryByText("✗")).not.toBeInTheDocument(); //confirm no X is shown
    });
  
});