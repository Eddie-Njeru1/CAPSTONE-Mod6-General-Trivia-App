function Loader({ message = 'Loading...' }) {
  // Reusable loading component.
  // The message can be changed depending on what the app is loading.
  return (
    <div className="loader" role="status" aria-live="polite">
      {/* Visual spinner shown while data is being fetched. */}
      <div className="loading-spinner" aria-hidden="true"></div>

      {/* Text makes it clear to the user that something is loading. */}
      <p className="loader__message">{message}</p>
    </div>
  )
}

export default Loader