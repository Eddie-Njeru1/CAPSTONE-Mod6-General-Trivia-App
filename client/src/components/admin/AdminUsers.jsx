// AdminUsers.jsx
// The Users tab: a searchable, filterable, paginated table of all users, with actions
// to change a role, activate or deactivate an account, and delete a user.
//
// The server enforces the safety rules (an admin cannot change their own role,
// deactivate or delete themselves, or demote the last admin) and answers 400 with a
// message. We also disable the buttons on the admin's own row, and show any server
// message above the table.
//
// Search and filters are sent when the form is submitted (not on every keystroke),
// because every load in useAdminData refreshes all four lists.
//
// Used by: AdminPage.jsx.
// Props: users, pagination, loading, onLoad(params), onChanged().

import { useState } from 'react' // form fields, applied filters, row being updated
import { updateAdminUser, deleteAdminUser } from '../../services/adminApi' // PATCH and DELETE calls
import { useAuth } from '../../context/AuthContext' // who is logged in (to protect their own row)

const PER_PAGE = 10

// Builds the query string values, leaving out empty filters.
function buildParams({ search, role, isActive, page }) {
  const params = { page, per_page: PER_PAGE }
  if (search.trim()) params.search = search.trim()
  if (role) params.role = role
  if (isActive) params.is_active = isActive // "true" or "false"
  return params
}

// Turns a failed request into a message. The backend sends { "error": "..." }.
function getMessage(err) {
  return err.response?.data?.error || err.message || 'Something went wrong.'
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'Never'
}

function AdminUsers({ users, pagination, loading, onLoad, onChanged }) {
  const { user: currentUser } = useAuth()

  // What the admin is typing, and the filters that were last sent to the server.
  const emptyFilters = { search: '', role: '', isActive: '' }
  const [form, setForm] = useState(emptyFilters)
  const [applied, setApplied] = useState(emptyFilters)
  const [busyId, setBusyId] = useState(null) // id of the user whose action is running
  const [actionError, setActionError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setApplied(form)
    onLoad(buildParams({ ...form, page: 1 }))
  }

  function handleReset() {
    setForm(emptyFilters)
    setApplied(emptyFilters)
    onLoad(buildParams({ ...emptyFilters, page: 1 }))
  }

  function goToPage(page) {
    onLoad(buildParams({ ...applied, page }))
  }

  // Runs one action for one user, then reloads the lists (filters are kept by the hook).
  async function runAction(userId, action) {
    setBusyId(userId)
    setActionError('')
    try {
      await action()
      await onChanged()
    } catch (err) {
      setActionError(getMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  function toggleRole(user) {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    runAction(user.id, () => updateAdminUser(user.id, { role: nextRole }))
  }

  function toggleActive(user) {
    runAction(user.id, () => updateAdminUser(user.id, { is_active: !user.is_active }))
  }

  function removeUser(user) {
    // Deleting also deletes the user's categories and questions, so ask first.
    const ok = window.confirm(
      `Delete ${user.username}? Their categories and questions will be deleted too.`
    )
    if (ok) runAction(user.id, () => deleteAdminUser(user.id))
  }

  return (
    <div className="admin-users">
      <form className="admin-filters" onSubmit={handleSubmit}>
        <label htmlFor="admin-user-search" className="admin-filters__label">
          Search
        </label>
        <input
          id="admin-user-search"
          type="search"
          placeholder="Username or email"
          value={form.search}
          onChange={(e) => setForm({ ...form, search: e.target.value })}
        />

        <label htmlFor="admin-user-role" className="admin-filters__label">
          Role
        </label>
        <select
          id="admin-user-role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <label htmlFor="admin-user-status" className="admin-filters__label">
          Status
        </label>
        <select
          id="admin-user-status"
          value={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.value })}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
        </select>

        <button type="submit">Apply</button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </form>

      {actionError && (
        <p className="admin-page__error" role="alert">
          {actionError}
        </p>
      )}

      {loading && <p className="admin-status">Loading users...</p>}

      {!loading && users.length === 0 ? (
        <p className="admin-status">No users match these filters.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Logins</th>
                <th>Last login</th>
                <th>Categories</th>
                <th>Questions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = currentUser?.id === user.id // the server blocks self-changes too
                const busy = busyId === user.id
                return (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.is_active ? 'Active' : 'Deactivated'}</td>
                    <td>{user.login_count}</td>
                    <td>{formatDate(user.last_login_at)}</td>
                    <td>{user.category_count}</td>
                    <td>{user.question_count}</td>
                    <td className="admin-table__actions">
                      <button type="button" disabled={isSelf || busy} onClick={() => toggleRole(user)}>
                        {user.role === 'admin' ? 'Make user' : 'Make admin'}
                      </button>
                      <button type="button" disabled={isSelf || busy} onClick={() => toggleActive(user)}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="admin-table__danger"
                        disabled={isSelf || busy}
                        onClick={() => removeUser(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination: the numbers come from the server's pagination object */}
      {pagination && pagination.pages > 1 && (
        <div className="admin-pagination">
          <button type="button" disabled={!pagination.has_prev} onClick={() => goToPage(pagination.page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total} users)
          </span>
          <button type="button" disabled={!pagination.has_next} onClick={() => goToPage(pagination.page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default AdminUsers