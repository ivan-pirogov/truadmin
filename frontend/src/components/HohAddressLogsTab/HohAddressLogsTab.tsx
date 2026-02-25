import React, { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { HohAddressDatabase } from '../../services/api';
import './HohAddressLogsTab.css';

interface HohAddressLogsTabProps {
  hohAddressDatabase: HohAddressDatabase;
}

const HohAddressLogsTab: React.FC<HohAddressLogsTabProps> = ({ hohAddressDatabase }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement logs loading when backend API is ready
      // const data = await apiService.getHohAddressLogs(hohAddressDatabase.id);
    } catch (err: any) {
      console.error('Error loading logs:', err);
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [hohAddressDatabase.id]);

  return (
    <div className="hohaddress-logs-tab">
      <div className="logs-header">
        <h2>HohAddress Logs</h2>
        <button className="btn btn-secondary btn-icon" onClick={loadLogs} disabled={loading}>
          <FiRefreshCw size={18} className={loading ? 'rotating' : ''} />
        </button>
      </div>
      <div className="logs-content">
        {error && <div className="error-banner">{error}</div>}
        {loading ? (
          <div className="loading-container">Loading logs...</div>
        ) : (
          <div className="empty-state">
            <p>No logs available yet.</p>
            <p className="empty-description">Logs functionality will be implemented soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HohAddressLogsTab;

