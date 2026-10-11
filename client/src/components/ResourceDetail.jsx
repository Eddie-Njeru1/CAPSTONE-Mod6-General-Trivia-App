function ResourceDetail({ resource, onEdit, onDelete, onBack }) {
  if (!resource) {
    return (
      <section className="resource-detail">
        <p>No resource selected.</p>

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
        <h2>{resource.name || resource.title}</h2>
      </header>

      <div className="resource-detail__content">
        <p>
          <strong>Description:</strong>
        </p>

        <p>
          {resource.description || 'No description available.'}
        </p>

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
            onClick={() => onEdit(resource)}
          >
            Edit Resource
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(resource)}
          >
            Delete Resource
          </button>
        )}

        {onBack && (
          <button type="button" onClick={onBack}>
            Back to Resources
          </button>
        )}
      </div>
    </section>
  );
}

export default ResourceDetail;