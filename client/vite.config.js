// Vite and Vitest configuration happens here

import react from '@vitejs/plugin-react' // Allows the React files to work with vite
import { defineConfig } from 'vite' // Vite defineConfig helper define the project's configuration

// Define the Vite configuration for the project
export default defineConfig({ // enable React support in vite
  plugins: [react()],

  // Dev server settings
  server: {
    proxy: {
      "/api": "http://localhost:5555", // forwards /api requests to Flask
    },
  },

   /*Vitest settings to run React component tests*/
  test: { 
    environment: 'jsdom', // simulate a browser environment for DOM-based tests
    setupFiles: './src/tests/setup.js', // loads the test setup file before tests run
    globals: true, // Makes vitest functions like describe, it and expect available gobally without requiring imports
  },
});