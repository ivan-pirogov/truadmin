import React from 'react';
import { FiClock, FiUser } from 'react-icons/fi';
import { ActiveQuery } from '../../services/api';

interface ActiveQueriesTableProps {
  activeQueries: ActiveQuery[];
  selectedQueryIds: Set<string>;
  showOnlyActive: boolean;
  loading: boolean;
  onQuerySelect: (queryId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onTerminateQueries: () => void;
  onShowOnlyActiveChange: (checked: boolean) => void;
  formatDuration: (ms: number) => string;
  formatTimestamp: (timestamp: string) => string;
}

const ActiveQueriesTable: React.FC<ActiveQueriesTableProps> = ({
  activeQueries,
  selectedQueryIds,
  showOnlyActive,
  loading,
  onQuerySelect,
  onSelectAll,
  onTerminateQueries,
  onShowOnlyActiveChange,
  formatDuration,
  formatTimestamp,
}) => {
  return (
    <section className="monitoring-section">
      <div className="section-header">
        <h3>
          <FiClock size={18} />
          Active Queries
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-white)' }}>
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => onShowOnlyActiveChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Only Active
          </label>
          <button
            className="btn btn-danger"
            onClick={onTerminateQueries}
            disabled={selectedQueryIds.size === 0 || loading}
            style={{ fontSize: '14px', padding: '4px 12px' }}
          >
            Terminate ({selectedQueryIds.size})
          </button>
          <span className="badge">{activeQueries.length}</span>
        </div>
      </div>

      {activeQueries.length === 0 ? (
        <div className="empty-state">
          <p>No active queries</p>
        </div>
      ) : (
        <div className="queries-table-container">
          <table className="queries-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedQueryIds.size === activeQueries.length && activeQueries.length > 0}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>PID</th>
                <th>User</th>
                <th>Hostname</th>
                <th>Start</th>
                <th>Type</th>
                <th>State</th>
                <th>Wait Event</th>
                <th>Blocker</th>
                <th>Query</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {activeQueries.map((query) => (
                <tr key={query.id} className={selectedQueryIds.has(query.id) ? 'selected-row' : ''}>
                  <td style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedQueryIds.has(query.id)}
                      onChange={(e) => onQuerySelect(query.id, e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td className="query-pid">{query.id}</td>
                  <td className="query-user">
                    <FiUser size={14} />
                    <span>{query.user}</span>
                  </td>
                  <td className="query-hostname">{query.hostname}</td>
                  <td className="query-start-time">
                    {formatTimestamp(query.backendStart)}
                  </td>
                  <td className="query-backend-type">{query.backendType}</td>
                  <td>
                    <span className={`query-state state-${query.state.toLowerCase()}`}>
                      {query.state}
                    </span>
                  </td>
                  <td className="query-wait-event">{query.waitEvent || '-'}</td>
                  <td className="query-pid" style={{ color: query.blockedBy ? 'var(--color-danger)' : 'inherit' }}>
                    {query.blockedBy || '-'}
                  </td>
                  <td className="query-text">
                    <pre>{query.query}</pre>
                  </td>
                  <td className="query-duration">
                    <FiClock size={14} />
                    {formatDuration(query.duration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ActiveQueriesTable;
