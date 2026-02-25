import React, { useState, useEffect, useCallback } from 'react';
import { FiDatabase, FiPlus, FiServer, FiTrash2, FiRefreshCw, FiArrowRight, FiFileText, FiZap, FiEdit3 } from 'react-icons/fi';
import TabLayout from '../TabLayout/TabLayout';
import AddDatabaseModal from './AddDatabaseModal';
import EditDatabaseModal from './EditDatabaseModal';
import ConfirmModal from '../CustomModals/ConfirmModal';
import TruETLDetailsTab from '../TruETLDetailsTab/TruETLDetailsTab';
import TruETLLogsTab from '../TruETLLogsTab/TruETLLogsTab';
import { apiService, TruETLDatabase } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTab } from '../../contexts/TabContext';
import './TruETLTab.css';

const TruETLTab: React.FC = () => {
  const { user } = useAuth();
  const { addTab } = useTab();
  const isAdmin = user?.role === 'admin';
  const [databases, setDatabases] = useState<TruETLDatabase[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [databaseToEdit, setDatabaseToEdit] = useState<TruETLDatabase | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<{ id: string; name: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDatabases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getTruETLDatabases();
      setDatabases(data || []);
    } catch (err) {
      console.error('Error loading TruETL databases:', err);
      setError('Failed to load databases');
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const handleAddDatabase = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleDatabaseAdded = () => {
    loadDatabases();
    // Notify sidebar to refresh TruETL databases list
    window.dispatchEvent(new CustomEvent('truetl-databases-updated'));
  };

  const handleDeleteClick = (id: string, displayName: string) => {
    setDatabaseToDelete({ id, name: displayName });
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!databaseToDelete) return;

    try {
      await apiService.deleteTruETLDatabase(databaseToDelete.id);
      loadDatabases();
      // Notify sidebar to refresh TruETL databases list
      window.dispatchEvent(new CustomEvent('truetl-databases-updated'));
    } catch (err) {
      console.error('Error deleting database:', err);
      alert('Failed to delete database');
    }
  };

  const handleEnterDatabase = async (db: TruETLDatabase) => {
    const tabId = `truetl-db-${db.id}-details`;
    // Load full database info
    const fullDb = await apiService.getTruETLDatabase(db.id);
    addTab({
      id: tabId,
      title: `${db.connection_name}.${db.database_name}`,
      icon: <FiDatabase size={14} />,
      content: <TruETLDetailsTab truetlDatabase={fullDb} />,
      closable: true,
      metadata: {
        type: 'truetl-database',
        truetlDatabaseId: db.id,
      },
    });
  };

  const handleOpenLogs = async (db: TruETLDatabase) => {
    const tabId = `truetl-db-${db.id}-logs`;
    // Load full database info
    const fullDb = await apiService.getTruETLDatabase(db.id);
    addTab({
      id: tabId,
      title: `${db.connection_name}.${db.database_name} - Logs`,
      icon: <FiFileText size={14} />,
      content: <TruETLLogsTab truetlDatabase={fullDb} />,
      closable: true,
      metadata: {
        type: 'truetl-logs',
        truetlDatabaseId: db.id,
      },
    });
  };

  const handleEdit = async (db: TruETLDatabase) => {
    // Load full database info
    const fullDb = await apiService.getTruETLDatabase(db.id);
    setDatabaseToEdit(fullDb);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setDatabaseToEdit(null);
  };

  const handleDatabaseUpdated = () => {
    loadDatabases();
    // Notify sidebar to refresh TruETL databases list
    window.dispatchEvent(new CustomEvent('truetl-databases-updated'));
  };

  const headerContent = (
    <div className="truetl-header">
      <div className="connections-title-wrapper">
        <FiZap size={28} className="connections-title-icon" />
        <h1 className="connections-title">TruETL</h1>
      </div>
      <div className="truetl-header-actions">
        <button className="btn btn-secondary btn-icon" onClick={loadDatabases} disabled={loading}>
          <FiRefreshCw size={18} className={loading ? 'rotating' : ''} />
        </button>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleAddDatabase}>
            <FiPlus size={18} />
            Add Database
          </button>
        )}
      </div>
    </div>
  );

  const footerContent = databases && databases.length > 0 && (
    <div className="connections-footer">
      <span className="connections-count">
        {databases.length} {databases.length === 1 ? 'database' : 'databases'}
      </span>
    </div>
  );

  return (
    <>
      <TabLayout header={headerContent} footer={footerContent}>
        {error && <div className="error-banner">{error}</div>}

        {loading && (!databases || databases.length === 0) ? (
          <div className="loading-container">Loading databases...</div>
        ) : !databases || databases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FiDatabase size={64} />
            </div>
            <p className="empty-title">No Databases</p>
            <p className="empty-description">Click "Add Database" to start working with TruETL</p>
          </div>
        ) : (
          <div className="truetl-content">
            <div className="database-cards">
              {databases.map((db) => (
                <div key={db.id} className="database-card">
                  <div className="database-card-header">
                    <div className="database-card-title-wrapper">
                      <FiDatabase size={20} className="database-card-icon" />
                      <h3 className="database-card-title">
                        {db.connection_name}.{db.database_name}
                      </h3>
                    </div>
                    <span className="database-card-type">PostgreSQL</span>
                  </div>
                  <div className="database-card-info">
                    <div className="database-info-row">
                      <span className="database-info-label">Server:</span>
                      <span className="database-info-value">{db.connection_name}</span>
                    </div>
                    <div className="database-info-row">
                      <span className="database-info-label">Database:</span>
                      <span className="database-info-value">{db.database_name}</span>
                    </div>
                  </div>
                  <div className="database-card-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleEnterDatabase(db)}
                      title="Open details"
                    >
                      <span>Details</span>
                      <FiArrowRight size={16} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenLogs(db)}
                      title="View logs"
                    >
                      <FiFileText size={16} />
                      <span>Logs</span>
                    </button>
                    <button
                      className="btn btn-icon btn-icon-sm btn-secondary"
                      onClick={() => handleEdit(db)}
                      title="Edit database"
                    >
                      <FiEdit3 size={20} />
                    </button>
                    {isAdmin && (
                      <button
                        className="btn btn-icon btn-icon-sm btn-outline-danger"
                        onClick={() =>
                          handleDeleteClick(db.id, `${db.connection_name}.${db.database_name}`)
                        }
                        title="Remove database"
                      >
                        <FiTrash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabLayout>

      <AddDatabaseModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAdd={handleDatabaseAdded}
      />

      <EditDatabaseModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onUpdate={handleDatabaseUpdated}
        database={databaseToEdit}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title="Remove Database"
        message={`Are you sure you want to remove "${databaseToDelete?.name}" from TruETL?`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmButtonVariant="danger"
      />
    </>
  );
};

export default TruETLTab;
