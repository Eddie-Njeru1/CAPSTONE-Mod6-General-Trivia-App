// AdminPage.jsx
// The admin portal at /admin, with three tabs: Overview, Users and Questions.
// useAdminData() is called ONCE here and its data is passed down to the tabs, because
// the hook fires four requests on mount and calling it per tab would repeat them.
//
// Used by: the /admin route in App.jsx (guarded by AdminRoute).
// Depends on: useAdminData (Emmanuel), the three tabs in components/admin/, admin.css.

import { useState } from 'react' // which tab is open
import useAdminData from '../hooks/useAdminData' // loads stats, users, categories, questions
import AdminOverview from '../components/admin/AdminOverview'
import AdminUsers from '../components/admin/AdminUsers'
import AdminQuestions from '../components/admin/AdminQuestions'
import '../styles/admin.css' // admin styles are loaded here so main.jsx does not need to change

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'questions', label: 'Questions' },
]

function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const admin = useAdminData()

  // refresh() re-throws when a request fails. The hook already stores the message in
  // `error`, so we swallow the rejection here to avoid an unhandled promise error.
  const refresh = () => admin.refresh().catch(() => {})

  return (
    <section className="admin-page">
      <h1>Admin</h1>

      {/* Tab buttons. role="tab" and aria-selected tell screen readers which one is open. */}
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id ? 'admin-tabs__tab admin-tabs__tab--active' : 'admin-tabs__tab'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error from the data hook, with a retry button */}
      {admin.error && (
        <div className="admin-page__error" role="alert">
          <span>{admin.error}</span>
          <button type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      <div className="admin-page__panel" role="tabpanel">
        {activeTab === 'overview' && (
          <AdminOverview stats={admin.stats} loading={admin.loading.stats} />
        )}

        {activeTab === 'users' && (
          <AdminUsers
            users={admin.users}
            pagination={admin.pagination.users}
            loading={admin.loading.users}
            onLoad={(params) => admin.loadUsers(params).catch(() => {})}
            onChanged={refresh}
          />
        )}

        {activeTab === 'questions' && (
          <AdminQuestions
            questions={admin.questions}
             categories={admin.categories}
            pagination={admin.pagination.questions}
            loading={admin.loading.questions}
            onLoad={(params) => admin.loadQuestions(params).catch(() => {})}
            onChanged={refresh}
          />
        )}
      </div>
    </section>
  )
}

export default AdminPage