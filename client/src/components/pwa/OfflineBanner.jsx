// Displays a small status banner whenever the browser loses its connection.
// The component uses the shared useOnlineStatus hook so online/offline
// detection stays in one place instead of being duplicated here.

import useOnlineStatus from '../../hooks/useOnlineStatus'

export default function OfflineBanner() {
  // useOnlineStatus returns true when the browser is online
  // and false when the browser is offline.
  const isOnline = useOnlineStatus()

  // There is nothing to show while the app has an internet connection.
  if (isOnline) {
    return null
  }

  return (
    <div
      className="offline-banner"
      role="status"
      aria-live="polite"
    >
      You are offline. Some features may be unavailable.
    </div>
  )
}