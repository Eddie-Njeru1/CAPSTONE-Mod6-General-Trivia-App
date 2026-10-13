function ResourceList({
  resources = [],
  loading = false,
  error = '',
  onEdit,
  onDelete,
}) {
  if (loading) {
    return <p>Loading resources...</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  if (resources.length === 0) {
    return <p>No resources found.</p>
  }

  return (
    <section className="resource-list">
      <h2>Resources</h2>

      <div className="resource-list__items">
        {resources.map((resource) => (
          <article
            key={resource.id}
            className="resource-list__item"
          >
            <h3>{resource.name || resource.title}</h3>

            {resource.description && (
              <p>{resource.description}</p>
            )}

            <div className="resource-list__actions">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(resource)}
                >
                  Edit
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(resource)}
                >
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ResourceList