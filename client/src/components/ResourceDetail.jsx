// Display details for a selected resource.
function ResourceDetail({ resource, onEdit, onDelete, onBack }) {
  // Show a message if no resource is selected.
  if (!resource) {
    return (
      <section className="resource-detail">
        <p>No resource selected.</p>

        {/* Show the Back button if a callback is provided. */}
        {onBack && (
          <button type="button" onClick={onBack}>
            Back to Resources
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="resource-detail">
      <header className="resource-detail__header">
        {/* Display the resource name or title. */}
        <h2>{resource.name || resource.title}</h2>
      </header>

      <div className="resource-detail__content">
        <p>
          <strong>Description:</strong>
        </p>

        {/* Display the description or a default message. */}
        <p>
          {resource.description || 'No description available.'}
        </p>

        {/* Display the ID if it exists. */}
        {resource.id !== undefined && (
          <p>
            <strong>Resource ID:</strong> {resource.id}
          </p>
        )}
      </div>

      <div className="resource-detail__actions">
        {/* Show Edit if an edit callback is provided. */}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(resource)}
          >
            Edit Resource
          </button>
        )}

        {/* Show Delete if a delete callback is provided. */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(resource)}
          >
            Delete Resource
          </button>
        )}

        {/* Return to the resource list when clicked. */}
        {onBack && (
          <button type="button" onClick={onBack}>
            Back to Resources
          </button>
        )}
      </div>
    </section>
  );
}

// Export the component for use in other files.
export default ResourceDetail;