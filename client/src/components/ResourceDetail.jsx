// Display details for a selected resource.
function ResourceDetail({ resource, onEdit, onDelete, onBack }) {
  if (!resource) {
    return (
      <section className="resource-detail">
        <p>No resource selected.</p>

        {onBack && (
          <button
            type="button"
            className="resource-detail__button resource-detail__button--back"
            onClick={onBack}
          >
            Back to Resources
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="resource-detail">
      <header className="resource-detail__header">
        <h2>{resource.name || resource.title}</h2>
      </header>

      <div className="resource-detail__content">
        <p>
          <strong>Description:</strong>
        </p>

        <p>{resource.description || 'No description available.'}</p>

        {resource.id !== undefined && (
          <p>
            <strong>Resource ID:</strong> {resource.id}
          </p>
        )}
      </div>

      <div className="resource-detail__actions">
        {onEdit && (
          <button
            type="button"
            className="resource-detail__button resource-detail__button--edit"
            onClick={() => onEdit(resource)}
          >
            Edit Resource
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            className="resource-detail__button resource-detail__button--delete"
            onClick={() => onDelete(resource)}
          >
            Delete Resource
          </button>
        )}

        {onBack && (
          <button
            type="button"
            className="resource-detail__button resource-detail__button--back"
            onClick={onBack}
          >
            Back to Resources
          </button>
        )}
      </div>
    </section>
  )
}

export default ResourceDetail