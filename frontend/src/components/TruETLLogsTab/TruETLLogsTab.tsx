import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import { TruETLDatabase } from '../../services/api';
import { apiService } from '../../services/api';
import './TruETLLogsTab.css';

interface TruETLSaveLog {
  id: number;
  truetl_database_id: string;
  user_id: string;
  status: 'success' | 'error' | 'partial';
  changes_summary: {
    services: { deleted: number; updated: number };
    databases: { deleted: number; updated: number };
    tables: { deleted: number; updated: number };
    fields: { deleted: number; updated: number; added: number };
  };
  sql_script?: string;
  error_message?: string;
  execution_time_ms: number;
  created_at: string;
}

interface TruETLLogsTabProps {
  truetlDatabase: TruETLDatabase;
}

const TruETLLogsTab: React.FC<TruETLLogsTabProps> = ({ truetlDatabase }) => {
  const [logs, setLogs] = useState<TruETLSaveLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getTruETLSaveLogs(truetlDatabase.id);
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error loading logs:', err);
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [truetlDatabase.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <FiCheckCircle className="status-icon status-success" />;
      case 'error':
        return <FiXCircle className="status-icon status-error" />;
      case 'partial':
        return <FiAlertCircle className="status-icon status-partial" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTotalChanges = (summary: TruETLSaveLog['changes_summary']) => {
    return (
      summary.services.deleted +
      summary.services.updated +
      summary.databases.deleted +
      summary.databases.updated +
      summary.tables.deleted +
      summary.tables.updated +
      summary.fields.deleted +
      summary.fields.updated +
      summary.fields.added
    );
  };

  return (
    <div className="truetl-logs-tab">
      <div className="truetl-logs-header">
        <h2>Save Logs: {truetlDatabase.connection_name}.{truetlDatabase.database_name}</h2>
        <button className="btn btn-sm btn-primary" onClick={loadLogs} disabled={loading}>
          <FiRefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && logs.length === 0 ? (
        <div className="loading-container">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <p>No logs found</p>
        </div>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Changes</th>
                <th>Execution Time</th>
                <th>User ID</th>
                <th>Error</th>
                <th>SQL Script</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className={`log-row log-row-${log.status}`}>
                    <td>{formatDate(log.created_at)}</td>
                    <td>
                      <div className="status-cell">
                        {getStatusIcon(log.status)}
                        <span className="status-text">{log.status}</span>
                      </div>
                    </td>
                    <td>
                      <div className="changes-summary">
                        <div className="changes-total">Total: {getTotalChanges(log.changes_summary)}</div>
                        <div className="changes-details">
                          <span>S: -{log.changes_summary.services.deleted} +{log.changes_summary.services.updated}</span>
                          <span>D: -{log.changes_summary.databases.deleted} +{log.changes_summary.databases.updated}</span>
                          <span>T: -{log.changes_summary.tables.deleted} +{log.changes_summary.tables.updated}</span>
                          <span>F: -{log.changes_summary.fields.deleted} +{log.changes_summary.fields.updated} +{log.changes_summary.fields.added}</span>
                        </div>
                      </div>
                    </td>
                    <td>{log.execution_time_ms} ms</td>
                    <td>{log.user_id || '-'}</td>
                    <td className="error-cell">
                      {log.error_message ? (
                        <span className="error-message" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {log.sql_script ? (
                        <button
                          className="btn btn-sm btn-link"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          {expandedLogId === log.id ? 'Hide' : 'Show'}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                  {expandedLogId === log.id && log.sql_script && (
                    <tr>
                      <td colSpan={7} className="sql-script-cell">
                        <pre className="sql-script-content">{log.sql_script}</pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TruETLLogsTab;

