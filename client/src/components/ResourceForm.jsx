// Import useState to manage form input values.
import { useState } from 'react';

// Display the form for adding or editing a resource.
function ResourceForm({ resource = null, onSubmit, onCancel }) {
  // Create a key that resets the form when the resource changes.
  const resourceKey = resource
    ? `${resource.id ?? resource.name ?? resource.title}:${resource.name ?? resource.title ?? ''}:${resource.description ?? ''}`
    : 'new';

  // Pass the resource and callback functions to the form fields.
  return (
    <ResourceFormFields
      key={resourceKey}
      resource={resource}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

// Manage the resource name, description, and form submission.
function ResourceFormFields({ resource, onSubmit, onCancel }) {
  // Set the initial name using the existing resource, if available.
  const [name, setName] = useState(
    resource?.name || resource?.title || '',
  );

  // Set the initial description.
  const [description, setDescription] = useState(
    resource?.description || '',
  );

  // Handle form submission.
  function handleSubmit(event) {
    // Prevent the page from reloading.
    event.preventDefault();

    // Remove extra spaces from the input values.
    const resourceData = {
      name: name.trim(),
      description: description.trim(),
    };

    // Stop if the resource name is empty.
    if (!resourceData.name) {
      return;
    }

    // Send the form data to the parent component.
    if (onSubmit) {
      onSubmit(resourceData);
    }
  }

  return (
    // Submit the form using handleSubmit.
    <form className="resource-form" onSubmit={handleSubmit}>
      {/* Show the heading based on the current action. */}
      <h2>{resource ? 'Edit Resource' : 'Add Resource'}</h2>

      <div className="resource-form__field">
        {/* Label the resource name input. */}
        <label htmlFor="resource-name">Resource Name</label>

        <input
          id="resource-name"
          type="text"
          value={name}
          // Update the name as the user types.
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter resource name"
          required
        />
      </div>

      <div className="resource-form__field">
        {/* Label the description field. */}
        <label htmlFor="resource-description">Description</label>

        <textarea
          id="resource-description"
          value={description}
          // Update the description as the user types.
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Enter resource description"
          rows="4"
        />
      </div>

      <div className="resource-form__actions">
        {/* Change the button text based on the current action. */}
        <button type="submit">
          {resource ? 'Save Changes' : 'Add Resource'}
        </button>

        {/* Show the Cancel button only when a callback is provided. */}
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Make the form available to other components.
export default ResourceForm;