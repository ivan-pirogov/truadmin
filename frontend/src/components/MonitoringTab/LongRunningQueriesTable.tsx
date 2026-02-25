import React from 'react';
import { FiClock, FiUser } from 'react-icons/fi';
import { ActiveQuery } from '../../services/api';

interface LongRunningQueriesTableProps {
  activeQueries: ActiveQuery[];
  longQueryThreshold: number;
  onThresholdChange: (threshold: number) => void;
  formatDuration: (ms: number) => string;
  formatTimestamp: (timestamp: string) => string;
}

const LongRunningQueriesTable: React.FC<LongRunningQueriesTableProps> = ({
  activeQueries,
  longQueryThreshold,
  onThresholdChange,
  formatDuration,
  formatTimestamp,
}) => {
  const longQueries = activeQueries
    .filter(q => q.duration >= longQueryThreshold)
    .sort((a, b) => b.duration - a.duration);

  return (
    <section className="monitoring-section" style={{ background: '#ffffff' }}>
      <div className="section-header">
        <h3>
          <FiClock size={18} />
          Long Running Queries
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-white)' }}>Queries longer than:</span>
          <select
            className="refresh-interval-select"
            value={longQueryThreshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'var(--color-white)', borderColor: 'rgba(255, 255, 255, 0.3)' }}
          >
            <option value={1000}>1 sec</option>
            <option value={3000}>3 sec</option>
            <option value={5000}>5 sec</option>
            <option value={10000}>10 sec</option>
            <option value={25000}>25 sec</option>
            <option value={30000}>30 sec</option>
            <option value={60000}>1 min</option>
            <option value={300000}>5 min</option>
            <option value={600000}>10 min</option>
          </select>
          <span className="badge">{longQueries.length}</span>
        </div>
      </div>

      {longQueries.length === 0 ? (
        <div className="empty-state">
          <p>No long running queries</p>
        </div>
      ) : (
        <div className="queries-table-container">
          <table className="queries-table">
            <thead>
              <tr>
                <th>PID</th>
                <th>Duration</th>
                <th>User</th>
                <th>Hostname</th>
                <th>Start</th>
                <th>Wait Event</th>
                <th>Blocker</th>
                <th>Query</th>
              </tr>
            </thead>
            <tbody>
              {longQueries.map((query) => (
                <tr key={query.id} >
                  <td className="query-pid">{query.id}</td>
                  <td className="query-duration">
                    <FiClock size={14} />
                    {formatDuration(query.duration)}
                  </td>
                  <td className="query-user">
                    <FiUser size={14} />
                    <span>{query.user}</span>
                  </td>
                  <td className="query-hostname">{query.hostname}</td>
                  <td className="query-start-time">
                    {formatTimestamp(query.backendStart)}
                  </td>
                  <td className="query-wait-event">{query.waitEvent || '-'}</td>
                  <td className="query-pid" style={{ color: query.blockedBy ? 'var(--color-danger)' : 'inherit' }}>
                    {query.blockedBy || '-'}
                  </td>
                  <td className="query-text">
                    <pre>{query.query}</pre>
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

export default LongRunningQueriesTable;
