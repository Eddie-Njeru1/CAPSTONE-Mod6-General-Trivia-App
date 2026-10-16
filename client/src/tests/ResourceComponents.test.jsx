// Import tools for writing and checking tests.
import { describe, it, expect, vi } from 'vitest';

// Import helpers for rendering components and simulating user actions.
import { render, screen, fireEvent } from '@testing-library/react';

// Add extra DOM matchers for testing React components.
import '@testing-library/jest-dom/vitest';

// Import the components being tested.
import ResourceList from '../components/ResourceList';
import ResourceForm from '../components/ResourceForm';
import ResourceDetail from '../components/ResourceDetail';

// Test the ResourceList component.
describe('ResourceList', () => {
  // Create sample resources for testing.
  const resources = [
    {
      id: 1,
      name: 'React Guide',
      description: 'Learn React fundamentals.',
    },
    {
      id: 2,
      name: 'JavaScript Guide',
      description: 'Learn JavaScript.',
    },
  ];

  // Check that resource names appear in the list.
  it('displays the list of resources', () => {
    render(<ResourceList resources={resources} />);

    expect(screen.getByText('React Guide')).toBeInTheDocument();
    expect(screen.getByText('JavaScript Guide')).toBeInTheDocument();
  });

  // Check that the loading message appears.
  it('displays a loading message', () => {
    render(<ResourceList loading />);

    expect(screen.getByText('Loading resources...')).toBeInTheDocument();
  });

  // Check that errors are displayed.
  it('displays an error message', () => {
    render(<ResourceList error="Failed to load resources." />);

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('Failed to load resources.');
  });

  // Check the message shown when the list is empty.
  it('displays a message when there are no resources', () => {
    render(<ResourceList resources={[]} />);

    expect(screen.getByText('No resources found.')).toBeInTheDocument();
  });

  // Check that clicking Edit calls the correct function.
  it('calls onEdit when the Edit button is clicked', () => {
    const onEdit = vi.fn(); // Create a mock function.

    render(
      <ResourceList
        resources={resources}
        onEdit={onEdit}
      />,
    );

    // Click the first Edit button.
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    // Confirm the selected resource was passed to the function.
    expect(onEdit).toHaveBeenCalledWith(resources[0]);
  });

  // Check that clicking Delete calls the correct function.
  it('calls onDelete when the Delete button is clicked', () => {
    const onDelete = vi.fn(); // Create a mock function.

    render(
      <ResourceList
        resources={resources}
        onDelete={onDelete}
      />,
    );

    // Click the first Delete button.
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Delete' })[0],
    );

    // Confirm the selected resource was passed to the function.
    expect(onDelete).toHaveBeenCalledWith(resources[0]);
  });
});

// Test the ResourceForm component.
describe('ResourceForm', () => {
  // Check that the form displays the correct fields.
  it('displays the form for adding a resource', () => {
    render(<ResourceForm onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Add Resource' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Resource Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  // Check that entered details are submitted correctly.
  it('submits the entered resource details', () => {
    const onSubmit = vi.fn();

    render(<ResourceForm onSubmit={onSubmit} />);

    // Enter a resource name.
    fireEvent.change(screen.getByLabelText('Resource Name'), {
      target: { value: 'React Guide' },
    });

    // Enter a resource description.
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Learn React fundamentals.' },
    });

    // Submit the form.
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Resource' }),
    );

    // Check that the correct data was submitted.
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'React Guide',
      description: 'Learn React fundamentals.',
    });
  });

  // Check that existing details appear when editing.
  it('displays existing resource details when editing', () => {
    const resource = {
      id: 1,
      name: 'React Guide',
      description: 'Learn React fundamentals.',
    };

    render(
      <ResourceForm
        resource={resource}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Edit Resource' }),
    ).toBeInTheDocument();

    // Confirm the name field contains the existing name.
    expect(screen.getByLabelText('Resource Name')).toHaveValue(
      'React Guide',
    );

    // Confirm the description field contains the existing description.
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Learn React fundamentals.',
    );
  });

  // Check that clicking Cancel calls the cancellation function.
  it('calls onCancel when the Cancel button is clicked', () => {
    const onCancel = vi.fn();

    render(
      <ResourceForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Confirm cancellation was called once.
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// Test the ResourceDetail component.
describe('ResourceDetail', () => {
  // Create a sample resource for the detail tests.
  const resource = {
    id: 1,
    name: 'React Guide',
    description: 'Learn React fundamentals.',
  };

  // Check that the resource information is displayed.
  it('displays the resource details', () => {
    render(<ResourceDetail resource={resource} />);

    expect(
      screen.getByRole('heading', { name: 'React Guide' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Learn React fundamentals.'),
    ).toBeInTheDocument();

    // Confirm the resource ID appears.
    expect(screen.getByText('1', { exact: true })).toBeInTheDocument();
  });

  // Check the message shown when no resource is selected.
  it('displays a message when no resource is selected', () => {
    render(<ResourceDetail resource={null} />);

    expect(screen.getByText('No resource selected.')).toBeInTheDocument();
  });

  // Check that clicking Edit Resource calls onEdit.
  it('calls onEdit when Edit Resource is clicked', () => {
    const onEdit = vi.fn();

    render(
      <ResourceDetail
        resource={resource}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Resource' }),
    );

    // Confirm the correct resource was passed to onEdit.
    expect(onEdit).toHaveBeenCalledWith(resource);
  });

  // Check that clicking Delete Resource calls onDelete.
  it('calls onDelete when Delete Resource is clicked', () => {
    const onDelete = vi.fn();

    render(
      <ResourceDetail
        resource={resource}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Resource' }),
    );

    // Confirm the correct resource was passed to onDelete.
    expect(onDelete).toHaveBeenCalledWith(resource);
  });

  // Check that clicking Back to Resources calls onBack.
  it('calls onBack when Back to Resources is clicked', () => {
    const onBack = vi.fn();

    render(
      <ResourceDetail
        resource={resource}
        onBack={onBack}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Back to Resources' }),
    );

    // Confirm the back function was called once.
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});