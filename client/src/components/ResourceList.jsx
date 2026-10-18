import { useState } from 'react';

function ResourceList({
  resources = [],
  loading = false,
  error = '',
  onView,
  onEdit,
  onDelete,
}) {
  // Track which page of resources the user is viewing.
  const [currentPage, setCurrentPage] = useState(1);

  // Display five resources on each page.
  const resourcesPerPage = 5;

  // Calculate the total number of pages needed for the list.
  const totalPages = Math.ceil(resources.length / resourcesPerPage);

  // Find the resources that belong on the current page.
  const startIndex = (currentPage - 1) * resourcesPerPage;
  const visibleResources = resources.slice(
    startIndex,
    startIndex + resourcesPerPage,
  );

  // Show a loading message while resources are being retrieved.
  if (loading) {
    return <p>Loading resources...</p>;
  }

  // Display an accessible error message if loading fails.
  if (error) {
    return <p role="alert">{error}</p>;
  }

  // Display a message when the list contains no resources.
  if (resources.length === 0) {
  return (
    <section className="resource-list">
      <h2>Resources</h2>
      <p className="resource-list__empty-state">
        No resources found.
      </p>
      <p className="resource-list__empty-hint">
        Select Add Resource to create your first one.
      </p>
    </section>
  );
}

  return (
    <section className="resource-list">
      <h2>Resources</h2>

      {/* Display only the resources belonging to the current page. */}
      <div className="resource-list__items">
        {visibleResources.map((resource) => (
          <article
            key={resource.id}
            className="resource-list__item"
          >
            <h3>{resource.name || resource.title}</h3>

            {resource.description && (
              <p>{resource.description}</p>
            )}

            <div className="resource-list__actions">
              {/* Allow users to open the resource detail view. */}
              {onView && (
                <button
                  type="button"
                  onClick={() => onView(resource)}
                >
                  View Details
                </button>
              )}

              {/* Allow users to edit a resource when a callback is provided. */}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(resource)}
                >
                  Edit
                </button>
              )}

              {/* Allow users to delete a resource when a callback is provided. */}
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

      {/* Display pagination controls when more than one page exists. */}
      {totalPages > 1 && (
        <nav
          className="resource-list__pagination"
          aria-label="Resource list pagination"
        >
          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) => Math.max(1, page - 1))
            }
            disabled={currentPage === 1}
          >
            Previous
          </button>

          <span aria-live="polite">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1),
              )
            }
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

export default ResourceList;