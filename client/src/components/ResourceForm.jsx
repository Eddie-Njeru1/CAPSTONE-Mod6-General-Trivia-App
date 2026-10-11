import { useState } from 'react';

function ResourceForm({ resource = null, onSubmit, onCancel }) {
  const resourceKey = resource
    ? `${resource.id ?? resource.name ?? resource.title}:${resource.name ?? resource.title ?? ''}:${resource.description ?? ''}`
    : 'new';

  return (
    <ResourceFormFields
      key={resourceKey}
      resource={resource}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

function ResourceFormFields({ resource, onSubmit, onCancel }) {
  const [name, setName] = useState(
    resource?.name || resource?.title || '',
  );

  const [description, setDescription] = useState(
    resource?.description || '',
  );

  function handleSubmit(event) {
    event.preventDefault();

    const resourceData = {
      name: name.trim(),
      description: description.trim(),
    };

    if (!resourceData.name) {
      return;
    }

    if (onSubmit) {
      onSubmit(resourceData);
    }
  }

  return (
    <form className="resource-form" onSubmit={handleSubmit}>
      <h2>{resource ? 'Edit Resource' : 'Add Resource'}</h2>

      <div className="resource-form__field">
        <label htmlFor="resource-name">Resource Name</label>

        <input
          id="resource-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter resource name"
          required
        />
      </div>

      <div className="resource-form__field">
        <label htmlFor="resource-description">Description</label>

        <textarea
          id="resource-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Enter resource description"
          rows="4"
        />
      </div>

      <div className="resource-form__actions">
        <button type="submit">
          {resource ? 'Save Changes' : 'Add Resource'}
        </button>

        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default ResourceForm;