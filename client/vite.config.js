// Vite and Vitest configuration happens here

import react from '@vitejs/plugin-react' // Allows the React files to work with vite
import { defineConfig } from 'vite' // Vite defineConfig helper define the project's configuration
import { VitePWA } from 'vite-plugin-pwa' // Phase 3: makes the app installable and work offline

// Define the Vite configuration for the project
export default defineConfig({ // enable React support in vite
  plugins: [
    react(),

    // Phase 3 PWA: builds a web app manifest (name, icons, colours) and a
    // service worker that saves the app's files so it opens without internet.
    VitePWA({
      // "prompt": a new version waits until the user agrees to reload
      // (UpdatePrompt.jsx shows the message), so nobody loses a quiz mid-round.
      registerType: 'prompt',
      // Extra files from public/ to save for offline use.
      includeAssets: ['icons/favicon.ico', 'icons/apple-touch-icon-180x180.png', 'icons/icon.svg'],
      manifest: {
        name: 'General Trivia App',
        short_name: 'Trivia',
        description: 'Play trivia quizzes by category, track your scores and keep playing offline.',
        theme_color: '#6c63ff', // colour of the phone's status bar
        background_color: '#ffffff', // splash screen while the app opens
        display: 'standalone', // opens in its own window, without the browser bar
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Save the built app files (JS, CSS, HTML, icons, and the offline
        // question pack, which is bundled into the JS).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        // Opening any page (e.g. /quiz) while offline loads the saved app.
        navigateFallback: '/index.html',
        // ...but never for /api: API calls must reach the server (or fail
        // and use the offline pack), never get the app's HTML by mistake.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true, // delete old saved files after an update
      },
      devOptions: {
        enabled: false, // no service worker during `npm run dev` (avoids stale pages while coding)
      },
    }),
  ],

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
