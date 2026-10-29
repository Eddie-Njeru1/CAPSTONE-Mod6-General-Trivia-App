// AdminOverview.jsx
// The Overview tab: a grid of cards showing the counts from GET /api/admin/stats.
// A card is only drawn when the backend actually returns that field, so extra stats
// added later (e.g. quiz attempts) can be listed in STAT_CARDS without other changes.
//
// Used by: AdminPage.jsx. Props: stats (object or null), loading (boolean).

// [field name from the API, label shown to the admin]
const STAT_CARDS = [
  ['total_users', 'Total users'],
  ['active_users', 'Active users'],
  ['inactive_users', 'Deactivated users'],
  ['admin_users', 'Admins'],
  ['total_categories', 'Categories'],
  ['total_questions', 'Questions'],
]

function AdminOverview({ stats, loading }) {
  if (loading && !stats) {
    return <p className="admin-status">Loading statistics...</p>
  }
  if (!stats) {
    return <p className="admin-status">No statistics available.</p>
  }

  return (
    <div className="admin-stats">
      {STAT_CARDS.filter(([key]) => stats[key] !== undefined).map(([key, label]) => (
        <div className="admin-stats__card" key={key}>
          <p className="admin-stats__value">{stats[key]}</p>
          <p className="admin-stats__label">{label}</p>
        </div>
      ))}
    </div>
  )
}

export default AdminOverview