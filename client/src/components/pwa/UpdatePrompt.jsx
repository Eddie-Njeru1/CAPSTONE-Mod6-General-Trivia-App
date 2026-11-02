// Shows a prompt when a new version of the app is available.
// The vite-plugin-pwa React hook handles service-worker update detection
// and provides the function that applies the new version.

import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  // needRefresh becomes true when the service worker detects a newer
  // version of the application that is ready to take over.
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // No update is waiting, so there is nothing to display.
  if (!needRefresh) {
    return null
  }

  function handleUpdate() {
    // Tell the service worker to activate the new application version.
    updateServiceWorker(true)
  }

  function handleDismiss() {
    // Hide the prompt without applying the update.
    setNeedRefresh(false)
  }

  return (
    <div
      className="update-prompt"
      role="status"
      aria-live="polite"
    >
      <p>A new version of the Trivia app is available.</p>

      <div className="update-prompt__actions">
        <button
          type="button"
          className="update-prompt__update"
          onClick={handleUpdate}
        >
          Update now
        </button>

        <button
          type="button"
          className="update-prompt__dismiss"
          onClick={handleDismiss}
        >
          Later
        </button>
      </div>
    </div>
  )
}