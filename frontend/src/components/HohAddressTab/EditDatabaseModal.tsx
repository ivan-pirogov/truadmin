import React, { useState, useEffect } from 'react';
import { FiServer, FiDatabase, FiX } from 'react-icons/fi';
import { apiService, Connection, Database, HohAddressDatabase } from '../../services/api';
import '../TruETLTab/AddDatabaseModal.css';

interface EditDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  database: HohAddressDatabase | null;
}

const EditDatabaseModal: React.FC<EditDatabaseModalProps> = ({ isOpen, onClose, onUpdate, database }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  useEffect(() => {
    if (isOpen && database) {
      loadConnections();
      setSelectedConnection(database.connection_id);
      setSelectedDatabase(database.database_name);
      setDisplayName(database.display_name || database.database_name);
    }
  }, [isOpen, database]);

  useEffect(() => {
    if (selectedConnection) {
      loadEligibleDatabases(selectedConnection);
    } else {
      setDatabases([]);
      setSelectedDatabase('');
    }
  }, [selectedConnection]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getConnections();
      // Only show PostgreSQL connections
      const allConnections = data || [];
      const postgresConnections = allConnections.filter(conn => conn.type === 'postgres');
      setConnections(postgresConnections);
    } catch (err) {
      console.error('Error loading connections:', err);
      setError('Failed to load connections');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleDatabases = async (connectionId: string) => {
    try {
      setLoadingDatabases(true);
      setError(null);
      const data = await apiService.getHohAddressEligibleDatabases(connectionId);
      const databases = data || [];
      setDatabases(databases);
      if (databases.length === 0) {
        setError('No eligible databases found (databases must have tracking schema with tables starting with hohaddress)');
      }
    } catch (err) {
      console.error('Error loading databases:', err);
      setError('Failed to load databases');
      setDatabases([]);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const handleUpdate = async () => {
    if (!database || !selectedConnection || !selectedDatabase) {
      setError('Please select both connection and database');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiService.updateHohAddressDatabase(database.id, selectedConnection, selectedDatabase, displayName || undefined);
      onUpdate();
      handleClose();
    } catch (err: any) {
      console.error('Error updating database:', err);
      setError(err.message || 'Failed to update database');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedConnection('');
    setSelectedDatabase('');
    setDisplayName('');
    setDatabases([]);
    setError(null);
    onClose();
  };

  if (!isOpen || !database) return null;

  const selectedConn = connections.find(c => c.id === selectedConnection);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-database-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit HohAddress Database</h2>
          <button className="modal-close" onClick={handleClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label className="form-label">
              <FiServer size={16} />
              PostgreSQL Server
            </label>
            <select
              className="form-select"
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              disabled={loading || loadingDatabases}
            >
              <option value="">Select a server...</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.host}:{conn.port})
                </option>
              ))}
            </select>
            {connections.length === 0 && !loading && (
              <span className="form-hint">No PostgreSQL connections found</span>
            )}
          </div>

          {selectedConnection && (
            <div className="form-group">
              <label className="form-label">
                <FiDatabase size={16} />
                Database
              </label>
              {loadingDatabases ? (
                <div className="loading-text">Loading databases...</div>
              ) : (
                <>
                  <select
                    className="form-select"
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    disabled={loading || databases.length === 0}
                  >
                    <option value="">Select a database...</option>
                    {databases.map((db) => (
                      <option key={db.name} value={db.name}>
                        {db.name}
                      </option>
                    ))}
                  </select>
                  {databases.length > 0 && (
                    <span className="form-hint">
                      Only databases with tracking schema and tables starting with hohaddress are shown
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Display Name (optional)
            </label>
            <input
              type="text"
              className="form-select"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={selectedDatabase || 'Enter display name...'}
              disabled={loading}
            />
            <span className="form-hint">
              Custom name for this database (defaults to database name if empty)
            </span>
          </div>

          {selectedConn && selectedDatabase && (
            <div className="selection-summary">
              <div className="summary-item">
                <span className="summary-label">Server:</span>
                <span className="summary-value">{selectedConn.name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Database:</span>
                <span className="summary-value">{selectedDatabase}</span>
              </div>
              {displayName && (
                <div className="summary-item">
                  <span className="summary-label">Display Name:</span>
                  <span className="summary-value">{displayName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUpdate}
            disabled={loading || !selectedConnection || !selectedDatabase}
          >
            {loading ? 'Updating...' : 'Update Database'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDatabaseModal;

