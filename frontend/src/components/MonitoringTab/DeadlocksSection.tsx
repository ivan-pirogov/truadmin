import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Deadlock } from '../../services/api';

interface DeadlocksSectionProps {
  deadlocks: Deadlock[];
  formatTimestamp: (timestamp: string) => string;
}

const DeadlocksSection: React.FC<DeadlocksSectionProps> = ({
  deadlocks,
  formatTimestamp,
}) => {
  return (
    <section className="monitoring-section">
      <div className="section-header">
        <h3>
          <FiAlertTriangle size={18} />
          Deadlocks
        </h3>
        <span className="badge badge-danger">{deadlocks.length}</span>
      </div>

      {deadlocks.length === 0 ? (
        <div className="empty-state">
          <p>No deadlocks detected</p>
        </div>
      ) : (
        <div className="deadlocks-list">
          {deadlocks.map((deadlock) => (
            <div key={deadlock.id} className="deadlock-card">
              <div className="deadlock-header">
                <span className="deadlock-id">Deadlock ID: {deadlock.id}</span>
                <span className="deadlock-time">{formatTimestamp(deadlock.timestamp)}</span>
              </div>

              <div className="deadlock-details">
                <div className="deadlock-process">
                  <strong>Blocked Process:</strong>
                  <span>{deadlock.blockedProcess}</span>
                </div>

                <div className="deadlock-process">
                  <strong>Blocking Process:</strong>
                  <span>{deadlock.blockingProcess}</span>
                </div>

                <div className="deadlock-resource">
                  <strong>Resource:</strong>
                  <code>{deadlock.resource}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default DeadlocksSection;
