
import { useCallback, useEffect, useState } from 'react'

// Detect whether the app is already running as an installed PWA.
function checkIfInstalled() {
  if (typeof window === 'undefined') {
    return false
  }

  // Covers browsers that report standalone display mode.
  const standalone = window.matchMedia('(display-mode: standalone)').matches

  // Safari on some Apple devices exposes its own standalone property.
  const safariStandalone = window.navigator.standalone === true

  return standalone || safariStandalone
}

export default function usePwaInstall() {
  // Store the browser's install event until the user clicks Install.
  const [installPrompt, setInstallPrompt] = useState(null)

  // Initialize from the browser's current display mode.
  const [isInstalled, setIsInstalled] = useState(checkIfInstalled)

  useEffect(() => {
    // The browser fires this event when the app is installable.
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    // Clear the prompt when the app has been installed.
    function handleAppInstalled() {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Remove listeners when the component using this hook unmounts.
    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Call this function from the user's Install button click handler.
  const installApp = useCallback(async () => {
    if (!installPrompt) {
      return 'unavailable'
    }

    try {
      // Ask the browser to display its installation prompt.
      const result = await installPrompt.prompt()

      // Each captured install event can only be used once.
      setInstallPrompt(null)

      if (result?.outcome === 'accepted') {
        setIsInstalled(true)
      }

      return result?.outcome ?? 'dismissed'
    } catch {
      // Let the UI handle an unsuccessful installation attempt.
      setInstallPrompt(null)
      return 'failed'
    }
  }, [installPrompt])

  return {
    canInstall: Boolean(installPrompt) && !isInstalled,
    isInstalled,
    installApp,
  }
}
