import { createContext, useContext } from "react";

// The shared container for score data. ScoreProvider fills it.
export const ScoreContext = createContext(null);

// Lets any component read the score in one line:
export function useScore() {
  const context = useContext(ScoreContext);
  if (!context) {
    throw new Error("useScore must be used inside a ScoreProvider");
  }
  return context;
}
