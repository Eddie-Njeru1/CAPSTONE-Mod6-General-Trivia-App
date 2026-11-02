import QuestionManager from '../components/QuestionManager';
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api'; // Axios client: adds the login token to every request
import ResourceList from '../components/ResourceList';
import ResourceForm from '../components/ResourceForm';
import ResourceDetail from '../components/ResourceDetail';

// On this page a "resource" is one of the logged-in user's categories:
// it has a name and an optional description, and the API saves it to the database.
function DashboardPage() {
  // Store the resources and manage which part of the dashboard is displayed.
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  // loading: true while the list is being fetched.
  // loadError: why the list could not be fetched (shown instead of the list).
  // actionError: why an add, edit or delete failed (shown above the list).
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  // The backend sends errors as { "error": "..." }; use that message when there is one.
  function getErrorMessage(err, fallback) {
    return err.response?.data?.error || fallback;
  }

  // Fetch the logged-in user's categories from the API.
  // mine=true limits the list to their own, and per_page=100 gets them all in one request.
  // This function returns the categories without updating React state.
  const fetchResources = useCallback(async () => {
    const response = await api.get('/categories', {
      params: { mine: true, per_page: 100 },
    });

    return response.data.items;
  }, []);

  // Load or refresh the category list and handle loading errors.
  // Used after creating, editing or deleting a category.
  const loadResources = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const items = await fetchResources();
      setResources(items);
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load your categories.'));
    } finally {
      // Runs in both cases, so the loading message always goes away.
      setLoading(false);
    }
  }, [fetchResources]);

  // Load the list when the page first opens.
  // State updates happen after the API request completes, avoiding the lint error.
  useEffect(() => {
    let cancelled = false;

    fetchResources()
      .then((items) => {
        if (!cancelled) {
          setResources(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.error || 'Could not load your categories.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    // Prevent state updates if the component unmounts before the request finishes.
    return () => {
      cancelled = true;
    };
  }, [fetchResources]);

  // Create a new category from the form data (POST /api/categories).
  async function handleAddResource(resourceData) {
    setActionError('');
    try {
      await api.post('/categories', resourceData);
      setShowForm(false); // close the form only when the save worked
      await loadResources(); // reload so the list matches the database
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not create the category.'));
    }
  }

  // Select a resource to edit and open the form with its existing details.
  function handleEditResource(resource) {
    setEditingResource(resource);
    setShowForm(true);
    setSelectedResource(null);
  }

  // Save changes to an existing category (PATCH /api/categories/<id>).
  async function handleUpdateResource(resourceData) {
    setActionError('');
    try {
      await api.patch(`/categories/${editingResource.id}`, resourceData);
      setEditingResource(null);
      setShowForm(false);
      await loadResources();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not save your changes.'));
    }
  }

  // Delete a category and its questions (DELETE /api/categories/<id>).
  async function handleDeleteResource(resource) {
    setActionError('');
    try {
      await api.delete(`/categories/${resource.id}`);
      setSelectedResource(null); // clear the detail view once it no longer exists
      await loadResources();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete the category.'));
    }
  }

  // Decide whether the form should create a new resource or update one.
  function handleFormSubmit(resourceData) {
    if (editingResource) {
      return handleUpdateResource(resourceData);
    }
    return handleAddResource(resourceData);
  }

  // Close the form without saving and clear the editing state.
  function handleCancelForm() {
    setShowForm(false);
    setEditingResource(null);
    setActionError('');
  }

  return (
    <main className="dashboard">
      {/* Display the dashboard heading and the Add Resource button. */}
      <header className="dashboard__header">
        <h1>Resource Dashboard</h1>
        <p>Manage and view your categories.</p>

        {/* Only show this button when the form and detail view are closed. */}
        {!showForm && !selectedResource && (
          <button
            type="button"
            className="dashboard__add-button"
            onClick={() => setShowForm(true)}
          >
            <span aria-hidden="true">+</span>
            Add Resource
          </button>
        )}
      </header>

      {/* Show why the last add, edit or delete failed. role="alert" makes screen readers announce it. */}
      {actionError && <p role="alert">{actionError}</p>}

      {/* Display the form when adding or editing a resource. */}
      {showForm && (
        <ResourceForm
          resource={editingResource}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelForm}
        />
      )}

      {/* Show the selected resource's details, or display the resource list. */}
      {selectedResource ? (
  <>
    <ResourceDetail
      resource={selectedResource}
      onEdit={handleEditResource}
      onDelete={handleDeleteResource}
      onBack={() => setSelectedResource(null)}
    />

    <QuestionManager
      categoryId={selectedResource.id}
    />
  </>
) : (
        !showForm && (
          <ResourceList
            resources={resources}
            loading={loading}
            error={loadError}
            onEdit={handleEditResource}
            onView={setSelectedResource}
            onDelete={handleDeleteResource}
          />
        )
      )}
    </main>
  );
}

export default DashboardPage;
