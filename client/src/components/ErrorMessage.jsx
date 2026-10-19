function ErrorMessage({
  message = 'Something went wrong. Please try again.',
  onRetry,
}) {
  // Reusable error component for displaying a clear message to the user.
  return (
    <div className="error-message" role="alert">
      {/* Clear heading lets the user immediately understand what happened. */}
      <h2 className="error-message__title">Something went wrong</h2>

      {/* Display the specific error returned by the application or API. */}
      <p className="error-message__text">{message}</p>

      {/* Only show the retry button when a retry function is provided. */}
      {onRetry && (
        <button
          type="button"
          className="error-message__retry"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorMessage