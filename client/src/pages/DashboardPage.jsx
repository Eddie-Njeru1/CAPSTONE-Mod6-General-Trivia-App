import ResourceList from '../components/ResourceList';

function DashboardPage() {
  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <h1>Resource Dashboard</h1>
        <p>Manage and view your resources.</p>
      </header>

      <ResourceList />
    </main>
  );
}

export default DashboardPage;