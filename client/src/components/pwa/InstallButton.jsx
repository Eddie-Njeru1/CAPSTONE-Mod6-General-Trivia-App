// Provides a button for installing the trivia app as a Progressive Web App.
// The component uses the shared usePwaInstall hook so the browser-specific
// installation logic stays outside the UI component.

import usePwaInstall from '../../hooks/usePwaInstall'

export default function InstallButton() {
  // canInstall is true only when the browser has provided an install
  // prompt and the app has not already been installed.
  const { canInstall, installApp } = usePwaInstall()

  // If installation is not currently available, there is no button to show.
  if (!canInstall) {
    return null
  }

  async function handleInstall() {
    // The hook handles opening the browser's native PWA installation prompt.
    await installApp()
  }

  return (
    <button
      type="button"
      className="install-button"
      onClick={handleInstall}
      aria-label="Install Trivia app"
    >
      Install App
    </button>
  )
}