import { useState } from 'react';
import ResourceList from '../components/ResourceList';
import ResourceForm from '../components/ResourceForm';
import ResourceDetail from '../components/ResourceDetail';

function DashboardPage() {
  // Store the resources and manage which part of the dashboard is displayed.
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);

  // Add a new resource to the list using the information from the form.
  function handleAddResource(resourceData) {
    const newResource = {
      id: Date.now(),
      ...resourceData,
    };

    // Keep existing resources and append the new resource.
    setResources((currentResources) => [
      ...currentResources,
      newResource,
    ]);

    // Close the form after adding the resource.
    setShowForm(false);
  }

  // Select a resource to edit and open the form with its existing details.
  function handleEditResource(resource) {
    setEditingResource(resource);
    setShowForm(true);
    setSelectedResource(null);
  }

  // Save changes to an existing resource without changing its ID.
  function handleUpdateResource(resourceData) {
    setResources((currentResources) =>
      currentResources.map((resource) =>
        resource.id === editingResource.id
          ? { ...resource, ...resourceData }
          : resource,
      ),
    );

    // Clear the editing state and close the form.
    setEditingResource(null);
    setShowForm(false);
  }

  // Remove the selected resource from the list.
  function handleDeleteResource(resource) {
    setResources((currentResources) =>
      currentResources.filter(
        (item) => item.id !== resource.id,
      ),
    );

    // Clear the selected resource after deletion.
    setSelectedResource(null);
  }

  // Decide whether the form should create a new resource or update one.
  function handleFormSubmit(resourceData) {
    if (editingResource) {
      handleUpdateResource(resourceData);
    } else {
      handleAddResource(resourceData);
    }
  }

  // Close the form without saving and clear the editing state.
  function handleCancelForm() {
    setShowForm(false);
    setEditingResource(null);
  }

  return (
    <main className="dashboard">
      {/* Display the dashboard heading and the Add Resource button. */}
      <header className="dashboard__header">
        <h1>Resource Dashboard</h1>
        <p>Manage and view your resources.</p>

        {/* Only show this button when the form and detail view are closed. */}
        {!showForm && !selectedResource && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
          >
            Add Resource
          </button>
        )}
      </header>

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
        <ResourceDetail
          resource={selectedResource}
          onEdit={handleEditResource}
          onDelete={handleDeleteResource}
          onBack={() => setSelectedResource(null)}
        />
      ) : (
        !showForm && (
          <ResourceList
            resources={resources}
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