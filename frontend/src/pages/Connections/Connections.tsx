import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiDatabase, FiServer, FiRefreshCw, FiCheck, FiXCircle, FiLoader, FiShield, FiLayers } from 'react-icons/fi';
import TabLayout from '../../components/TabLayout/TabLayout';
import ConnectionModal from '../../components/ConnectionModal/ConnectionModal';
import RolesOverviewTab from '../../components/RolesOverviewTab/RolesOverviewTab';
import { apiService, Connection } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTab } from '../../contexts/TabContext';
import './Connections.css';

type ConnectionStatus = 'unknown' | 'checking' | 'online' | 'offline';

const Connections: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { addTab } = useTab();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, ConnectionStatus>>({});

  const handleCheckConnection = useCallback(async (id: string) => {
    setConnectionStatuses(prev => ({ ...prev, [id]: 'checking' }));

    try {
      await apiService.testConnection(id);
      setConnectionStatuses(prev => ({ ...prev, [id]: 'online' }));
    } catch (error) {
      console.error('Failed to check connection:', error);
      setConnectionStatuses(prev => ({ ...prev, [id]: 'offline' }));
    }
  }, []);

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getConnections();
      setConnections(data || []);
      setError(null);

      // Automatically check status for all connections
      if (data && data.length > 0) {
        data.forEach((conn) => {
          handleCheckConnection(conn.id);
        });
      }
    } catch (err) {
      setError('Failed to load connections');
      console.error('Error loading connections:', err);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [handleCheckConnection]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleCreateConnection = () => {
    setEditingConnectionId(null);
    setIsModalOpen(true);
  };

  const handleEditConnection = (id: string) => {
    setEditingConnectionId(id);
    setIsModalOpen(true);
  };

  const handleDeleteConnection = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await apiService.deleteConnection(id);
        await loadConnections();
      } catch (error) {
        console.error('Failed to delete connection:', error);
        alert('Failed to delete connection. Please try again.');
      }
    }
  };

  const handleOpenQuery = (id: string) => {
    // TODO: Implement navigation to query editor via tab
    console.log('Open query for connection:', id);
  };

  const handleOpenRoles = (connectionId: string, connectionName: string) => {
    const tabId = `roles-${connectionId}`;
    addTab({
      id: tabId,
      title: `${connectionName} - Roles`,
      icon: <FiShield size={14} />,
      content: <RolesOverviewTab connectionId={connectionId} connectionName={connectionName} />,
      closable: true,
      metadata: {
        type: 'roles',
        connectionId: connectionId,
        connectionName: connectionName,
      },
    });
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'online':
        return <FiCheck className="connection-status-icon connection-status-online" title="Online" size={20} />;
      case 'offline':
        return <FiXCircle className="connection-status-icon connection-status-offline" title="Offline" size={20} />;
      case 'checking':
        return <FiLoader className="connection-status-icon connection-status-checking rotating" title="Checking..." size={20} />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'postgres':
        return 'PostgreSQL';
      case 'mysql':
        return 'MySQL';
      case 'mariadb':
        return 'MariaDB';
      case 'sqlite':
        return 'SQLite';
      case 'mssql':
        return 'MS SQL Server';
      case 'snowflake':
        return 'Snowflake';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <TabLayout>
        <div className="loading">Loading connections...</div>
      </TabLayout>
    );
  }

  if (error) {
    return (
      <TabLayout>
        <div className="error-message">{error}</div>
      </TabLayout>
    );
  }

  // Header content
  const headerContent = (
    <div className="connections-header">
      <div className="connections-title-wrapper">
        <FiLayers size={28} className="connections-title-icon" />
        <h1 className="connections-title">Servers</h1>
      </div>
      {isAdmin && (
        <button className="btn btn-primary" onClick={handleCreateConnection}>
          <FiPlus size={18} />
          New Connection
        </button>
      )}
    </div>
  );

  // Footer content
  const footerContent = connections.length > 0 && (
    <div className="connections-footer">
      <span className="connections-count">
        {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
      </span>
    </div>
  );

  return (
    <TabLayout header={headerContent} footer={footerContent}>
      {connections.length === 0 ? (
        <div className="connections-empty">
          <div className="empty-icon">
            <FiDatabase size={64} />
          </div>
          <p className="empty-title">No connections yet</p>
          <p className="empty-description">
            Create your first database connection to get started
          </p>
        </div>
      ) : (
        <div className="connections-grid">
          {connections.map((conn) => (
            <div className="connection-card" key={conn.id}>
              <div className="card-header">
                <div className="card-title-wrapper">
                  {getStatusIcon(connectionStatuses[conn.id] || 'unknown')}
                  <h3 className="card-title">{conn.name}</h3>
                </div>
                <span className={`card-type card-type-${conn.type}`}>
                  {getTypeLabel(conn.type)}
                </span>
              </div>
              <div className="card-info">
                <div className="info-row">
                  <span className="info-label">Host:</span>
                  <span className="info-value">{conn.host}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Database:</span>
                  <span className="info-value">{conn.database}</span>
                </div>
              </div>
              <div className="card-actions">
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenQuery(conn.id)}>
                  Open Query
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenRoles(conn.id, conn.name)}>
                  <FiShield size={16} />
                  Roles
                </button>
                <button
                  className="btn btn-icon btn-icon-sm btn-secondary"
                  onClick={() => handleCheckConnection(conn.id)}
                  disabled={connectionStatuses[conn.id] === 'checking'}
                  title="Check Connection"
                >
                  <FiRefreshCw size={20} className={connectionStatuses[conn.id] === 'checking' ? 'rotating' : ''} />
                </button>
                {isAdmin && (
                  <>
                    <button className="btn btn-icon btn-icon-sm btn-secondary" onClick={() => handleEditConnection(conn.id)} title="Edit">
                      <FiEdit2 size={20} />
                    </button>
                    <button className="btn btn-icon btn-icon-sm btn-secondary" onClick={() => handleDeleteConnection(conn.id)} title="Delete">
                      <FiTrash2 size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingConnectionId(null);
        }}
        onSuccess={loadConnections}
        connectionId={editingConnectionId}
      />
    </TabLayout>
  );
};

export default Connections;
