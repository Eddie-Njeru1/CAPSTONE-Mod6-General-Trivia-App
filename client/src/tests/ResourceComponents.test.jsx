import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import ResourceList from '../components/ResourceList';
import ResourceForm from '../components/ResourceForm';
import ResourceDetail from '../components/ResourceDetail';

describe('ResourceList', () => {
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

  it('displays the list of resources', () => {
    render(<ResourceList resources={resources} />);

    expect(screen.getByText('React Guide')).toBeInTheDocument();
    expect(screen.getByText('JavaScript Guide')).toBeInTheDocument();
  });

  it('displays a loading message', () => {
    render(<ResourceList loading />);

    expect(screen.getByText('Loading resources...')).toBeInTheDocument();
  });

  it('displays an error message', () => {
    render(<ResourceList error="Failed to load resources." />);

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('Failed to load resources.');
  });

  it('displays a message when there are no resources', () => {
    render(<ResourceList resources={[]} />);

    expect(screen.getByText('No resources found.')).toBeInTheDocument();
  });

  it('calls onEdit when the Edit button is clicked', () => {
    const onEdit = vi.fn();

    render(
      <ResourceList
        resources={resources}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(onEdit).toHaveBeenCalledWith(resources[0]);
  });

  it('calls onDelete when the Delete button is clicked', () => {
    const onDelete = vi.fn();

    render(
      <ResourceList
        resources={resources}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Delete' })[0],
    );

    expect(onDelete).toHaveBeenCalledWith(resources[0]);
  });
});

describe('ResourceForm', () => {
  it('displays the form for adding a resource', () => {
    render(<ResourceForm onSubmit={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Add Resource' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Resource Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('submits the entered resource details', () => {
    const onSubmit = vi.fn();

    render(<ResourceForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Resource Name'), {
      target: { value: 'React Guide' },
    });

    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Learn React fundamentals.' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Add Resource' }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'React Guide',
      description: 'Learn React fundamentals.',
    });
  });

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

    expect(screen.getByLabelText('Resource Name')).toHaveValue(
      'React Guide',
    );

    expect(screen.getByLabelText('Description')).toHaveValue(
      'Learn React fundamentals.',
    );
  });

  it('calls onCancel when the Cancel button is clicked', () => {
    const onCancel = vi.fn();

    render(
      <ResourceForm
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ResourceDetail', () => {
  const resource = {
    id: 1,
    name: 'React Guide',
    description: 'Learn React fundamentals.',
  };

  it('displays the resource details', () => {
    render(<ResourceDetail resource={resource} />);

    expect(
      screen.getByRole('heading', { name: 'React Guide' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Learn React fundamentals.'),
    ).toBeInTheDocument();

    expect(screen.getByText('1', { exact: true })).toBeInTheDocument();
  });

  it('displays a message when no resource is selected', () => {
    render(<ResourceDetail resource={null} />);

    expect(screen.getByText('No resource selected.')).toBeInTheDocument();
  });

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

    expect(onEdit).toHaveBeenCalledWith(resource);
  });

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

    expect(onDelete).toHaveBeenCalledWith(resource);
  });

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

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});