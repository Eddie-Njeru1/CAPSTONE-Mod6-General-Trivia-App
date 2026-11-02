
import { useSyncExternalStore } from 'react'

// Subscribe to browser events when the connection status changes.
function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)

  // Clean up listeners when no component needs this subscription.
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

// Read the browser's current connection status.
function getSnapshot() {
  return navigator.onLine
}

// Provide a consistent initial value if server rendering is used.
function getServerSnapshot() {
  return true
}

// Returns true when the browser reports online, false otherwise.
export default function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
}
