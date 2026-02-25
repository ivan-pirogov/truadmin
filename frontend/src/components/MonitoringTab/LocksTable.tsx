import React from 'react';
import { FiLock } from 'react-icons/fi';
import { Lock } from '../../services/api';

interface LocksTableProps {
  locks: Lock[];
  showSystemLocks: boolean;
  onShowSystemLocksChange: (checked: boolean) => void;
}

const LocksTable: React.FC<LocksTableProps> = ({
  locks,
  showSystemLocks,
  onShowSystemLocksChange,
}) => {
  return (
    <section className="monitoring-section">
      <div className="section-header">
        <h3>
          <FiLock size={18} />
          Locked Objects
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', color: 'var(--color-white)' }}>
            <input
              type="checkbox"
              checked={showSystemLocks}
              onChange={(e) => onShowSystemLocksChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Show System
          </label>
          <span className="badge">{locks.length}</span>
        </div>
      </div>

      {locks.length === 0 ? (
        <div className="empty-state">
          <p>No locks detected</p>
        </div>
      ) : (
        <div className="queries-table-container">
          <table className="queries-table">
            <thead>
              <tr>
                <th>PID</th>
                <th>User</th>
                <th>Lock Type</th>
                <th>Object</th>
                <th>Mode</th>
                <th>Granted</th>
                <th>Status</th>
                <th>Waiting For</th>
                <th>Query</th>
              </tr>
            </thead>
            <tbody>
              {locks.map((lock, index) => (
                <tr key={`${lock.pid}-${index}`} className={!lock.granted ? 'lock-waiting' : ''}>
                  <td className="query-pid">{lock.pid}</td>
                  <td className="query-user">{lock.user}</td>
                  <td>{lock.lockType}</td>
                  <td>{lock.relation || lock.lockType}</td>
                  <td>{lock.mode}</td>
                  <td style={{ textAlign: 'center' }}>
                    {lock.granted ? '✓' : '✗'}
                  </td>
                  <td>
                    <span className={`query-state ${lock.granted ? 'state-active' : 'state-waiting'}`}>
                      {lock.granted ? 'Granted' : 'Waiting'}
                    </span>
                  </td>
                  <td className="lock-waiting-for">{lock.waitingFor || '-'}</td>
                  <td className="query-text">
                    <pre>{lock.query}</pre>
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

export default LocksTable;
